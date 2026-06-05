---
title: 用 Markdown 写 Actions 工作流：gh-aw 进阶指南
date: 2026-05-07
badge: AI
tags: ["AI", "Agent", "Developer", "MCP"]
draft: false
---

`github/gh-aw`（GitHub Agentic Workflows）是 GitHub 官方在 2026 年 2 月推入 Technical Preview 的一个新形态工作流框架——**用带 frontmatter 的 Markdown 文件描述意图，由 gh-aw 编译成标准的 GitHub Actions `.lock.yml` 由 Actions runner 执行**。它不是替代 YAML workflow 的新语法糖，而是给 Actions 加上"判断力"的增量层：build/test/release 这类要求严格可重复的流水线继续用 YAML，issue triage、CI 失败诊断、文档同步、PR 评审、自动报告这类"判断密集、规则难穷举"的任务交给 gh-aw。

本文针对已熟悉 Actions、同时关注 prompt 编排和 MCP 集成的开发者，重点放在**实战模板和工程落地**上。


## 工作机制：一句话说清楚

你写一个 `.github/workflows/my-agent.md`，跑 `gh aw compile`，得到一个 SHA-pin、严格沙箱化、自动接好 MCP server 与"安全输出"通道的 `.lock.yml`，两份文件一起入库。运行时 Actions 跑的是 lock.yml，**Markdown body 在运行时才被作为 prompt 加载**——改文案不需要重新编译，只有改 frontmatter（权限、工具、触发器）才必须重新编译。

运行时是清晰的三段流水线：

```text
GitHub 事件
  ──▶ Activation Job (角色门禁/标签过滤)
        │
        ▼
      Agent Job (容器内, 只读 token, 网络防火墙)
        │  调用 LLM (Copilot/Claude/Codex/Gemini)
        │  通过 MCP Gateway 访问 GitHub / Playwright / 自定义工具
        │  把意图写成 agent_output.json (artifact)
        ▼
      Threat Detection Job (扫 prompt injection / secret 泄漏)
        │ ✓ safe
        ▼
      Safe-Output Writer Jobs (各持作用域 token,
                               create_issue / add_comment / create_pr ...)
        ▼
      GitHub REST/GraphQL API
```

核心思想一句话：**agent 进程从头到尾不持有 write token**。这些凭证只在 agent 完成、且 detection 放行后，进入下游隔离 job 才被注入。

## 安全模型：直观图解

gh-aw 安全设计可以归为三层防御纵深，下面按"威胁 → 防御点"对应理解：

| 风险  | gh-aw 的处理 |
| --- | --- |
| Agent 被 prompt 注入后乱写仓库 | Agent 容器只持 read-only token；任何写操作必须声明在 `safe-outputs:` 里，由独立 job 执行 |
| 用户 issue 里嵌恶意指令（XPIA） | 用户文本必须经 `${{ needs.activation.outputs.text }}` 引用，编译器自动做 @mention 中和、HTML 标签转换、URI 过滤、长度截断 |
| Agent 偷 LLM API key 或 GitHub PAT | Secrets 只在 trusted 容器（API Proxy / MCP Gateway）持有，agent 只能调用代理，永远拿不到 key |
| Agent 联网下载恶意载荷 | 网络强制走 Squid 代理 + 域名 allowlist；strict 模式禁通配 |
| 编译期产物被随意改 | strict 模式拒绝 `contents: write`、强制 actions SHA-pin、可拉起 actionlint/zizmor/poutine 扫描 |
| Agent 输出被直接 commit | 输出 buffer 为 artifact，由独立 detection job 审核后再分派到作用域 token job 落地 |

实操层面只需要记住两件事：**默认 `permissions: read-all`，所有写都走 `safe-outputs:`**。

## safe-outputs：把意图变成结构化产物

这是整个体系的灵魂。常用类型分四族：

- **Issue/Discussion 类**：`create-issue`、`update-issue`、`add-comment`、`add-labels`、`close-issue`
- **PR 类**：`create-pull-request`、`update-pull-request`、`push-to-pull-request-branch`、`submit-pull-request-review`、`add-reviewer`
- **元操作类**：`assign-to-agent`（把任务转交给 Copilot Coding Agent）、`assign-milestone`、`set-issue-type`
- **辅助类**：`create-code-scanning-alert`、`upload-artifact`
    

每种都支持 `max:` 上限、`allowed:` 白名单、`target-repo:` 跨仓配置、`staged: true` 的 dry-run 模式（真实 API 调用替换为 step summary，便于本地试跑）。

---

## 五个可直接抄走的实战模板

下面模板的 frontmatter 字段名都来自仓库真实文件或官方文档。建议先 `gh aw add githubnext/agentics/<name>` 拉个最近的样本到本地核对再改。

### 模板 1：每日仓库状态报告（DailyOps）

适合开源项目维护者或团队 Lead。每天一条总结 issue，自动关掉昨天的版本，避免 issue 列表灌水。

```markdown
---
on:
  schedule: daily          # 由编译器随机分配 cron 时间，避免整点拥挤
  workflow_dispatch:
permissions:
  contents: read
  issues: read
  pull-requests: read
network: defaults
tools:
  github:
    lockdown: false
safe-outputs:
  create-issue:
    title-prefix: "[repo-status] "
    labels: [report, daily-status]
    close-older-issues: true     # 关键:自动关闭昨天的报告
---

# Daily Repo Status

为这个仓库生成今天的状态周报作为 GitHub issue。

## 包含内容
- 最近 24 小时的活动:issues、PRs、discussions、releases
- 进度跟踪、目标提醒、亮点
- 项目状态与建议
- 维护者下一步行动建议

简洁、链接到相关 issue/PR、风格友好。
```

**真实使用场景**：用在 OSS 项目里，每天自动推送一个让贡献者一眼看清"今天该看哪些 PR、哪些 issue 在卡进度"的简报；用在内部 monorepo 里，做团队级"昨天发生了什么"的同步入口。

### 模板 2：Issue 自动 Triage（IssueOps）

最常见的入门场景。新 issue 一开就分类、贴标签、留欢迎评论，但**不允许改 issue 内容也不允许关闭**——这是 safe-outputs 设计的精髓。

```markdown
---
on:
  issues:
    types: [opened]
  roles: [admin, maintainer, write]   # fork PR 默认 block
permissions:
  contents: read
  issues: read
safe-outputs:
  add-comment:
  add-labels:
    labels: [bug, feature, question, documentation, good-first-issue,
             priority-high, priority-medium, priority-low]
---
# Issue Triage Agent

你是这个仓库的 issue triage 专家。

请分析 issue #${{ github.event.issue.number }} 并:

1. 仔细阅读标题、正文、代码片段
2. 分类:bug / feature / enhancement / documentation / question
3. 评估优先级:priority-high / medium / low
4. 从允许列表选择合适标签
5. 留一条友好的 triage 评论:致谢、解释分类原因、必要时提澄清问题

不要关闭 issue,不要改 issue 内容。
```

**真实使用场景**：开源项目处理新人提问；内部产品仓库把 bug/feature 自动分流给不同 squad；安全相关 issue 自动加 `priority-high` + `security` 标签提醒紧急响应。

### 模板 3：PR 自动修复 CI 失败（ChatOps + 写代码）

通过 `/pr-fix` 评论触发，agent 看 CI 日志、找出原因、推改动到 PR 分支。`reaction: eyes` 让用户立刻知道 agent 接到任务了。

```markdown
---
on:
  command:
    name: pr-fix
  reaction: eyes               # 立刻给评论一个 👀 反馈
permissions: read-all
network: defaults
safe-outputs:
  push-to-pull-request-branch:
  add-comment:
  create-issue:                # 修不了时落到 issue 兜底
    title-prefix: "[pr-fix-failed] "
    labels: [automation, needs-human]
tools:
  github:
  bash: true                   # 允许跑 git/npm/pytest 命令
  web-fetch:
timeout-minutes: 20
---
# Fix Pull Request CI Failures

分析 PR #${{ github.event.issue.number }},找出 CI 失败原因,推最小修复到分支。

## 工作流程
1. 阅读 PR 描述与评论,看作者是否有特殊要求
2. checkout PR 分支,本地复现失败
3. 找出最小改动:
   - lint 失败→自动 format
   - 测试失败→分析是测试错还是代码错
   - 依赖问题→更新 lockfile
4. 跑测试与 formatter 验证
5. push 到 PR 分支,在 PR 留评论说明改了什么、为什么

如果三次尝试仍未修复,创建一个 issue 求助维护者,不要硬推。
```

**真实使用场景**：团队 PR 经常因为 prettier/eslint 卡住——配上这个模板后维护者一句 `/pr-fix` 就解决；Dependabot PR 偶发的 lockfile 冲突；新贡献者忘了跑 `make fmt`。

### 模板 4：文档随代码漂移自动修复

这是 agentic workflow 真正区别于传统 YAML 的杀手场景——**没有规则可以穷举"哪个文档过期了"**，只能让 agent 读 diff 看上下文判断。

```markdown
---
on:
  pull_request:
    types: [opened, synchronize]
    paths:
      - "src/**/*.ts"
      - "src/**/*.py"
permissions:
  contents: read
  pull-requests: read
network: defaults
safe-outputs:
  create-pull-request:           # 注意:开新 PR,不直接改原 PR
    title-prefix: "[docs] "
    labels: [documentation, automated]
    draft: true
tools:
  github:
  edit:
  bash: ["git", "grep", "rg"]
---

# Doc Drift Detector

分析 PR #${{ github.event.pull_request.number }} 的代码变更,判断文档是否需要同步更新。

## 检查清单
- 公开 API 签名变化→检查 README、API 参考、示例代码
- 配置选项增减→检查 configuration.md
- 命令行参数变化→检查 CLI 文档与 --help 输出
- 重大行为变化→检查 CHANGELOG 与 migration guide

## 行动
如果发现文档需要更新,**开一个独立的 draft PR** 修文档,
在 PR 描述里 link 到原 PR,说明每处改动的依据。

如果不需要改动,什么都不做(不要刷无意义的评论)。
```

**真实使用场景**：SDK / 框架仓库的 API 重构；CLI 工具改子命令；配置 schema 增加新字段；任何文档与代码必须保持同步的项目。

### 模板 5：每周覆盖率改善 Agent（自驱动迭代）

让 agent 每周扫一次覆盖率最低的模块，自动写测试开 PR——这是 `daily-test-improver` 系列的简化版。

````markdown
---
on:
  schedule: weekly
  workflow_dispatch:
permissions:
  contents: read
  actions: read
network:
  allowed: [defaults, "codecov.io", "registry.npmjs.org"]
safe-outputs:
  create-pull-request:
    title-prefix: "[test-coverage] "
    labels: [tests, automated]
    draft: true
    max: 1                         # 每周最多 1 个 PR,避免轰炸
tools:
  github:
  edit:
  bash: ["npm:*", "git:*", "node"]
timeout-minutes: 30
---

# Weekly Coverage Improver

为本仓库挑一个测试覆盖率最低、又值得补的模块,补单元测试。

## 选择标准
1. 跑 `npm run coverage` 看报告
2. 找覆盖率 <60% 且最近 90 天有改动的文件
3. 排除明显是配置/类型定义的文件
4. 选 1 个文件,补测试覆盖核心分支与边界

## 输出
- 开一个 draft PR,只动这一个文件的测试
- PR 描述写清楚:为什么选它、覆盖率从 X% 到 Y%
- 不要改实现代码;如果测试无法通过,记录在 PR 描述里说明原因

不允许超过 1 个 PR。绝对不动 src/ 下的实现代码。
````

**真实使用场景**：长期被忽视的遗留模块；新接手的项目想逐步建立测试文化；需要持续提升覆盖率的合规项目。

### 还有什么场景值得参考

`githubnext/agentics` 仓库收录了 30+ 真实样本，挑几个有代表性的：

- **`ci-doctor`**：CI 频繁失败时自动诊断历史日志找规律
- **`pr-nitpick-reviewer`**：低噪声 PR 评审，只挑有价值的小问题
- **`agentic-wiki-writer`**：把代码里的 TODO 注释整理成 wiki 主题页
- **`duplicate-code-detector`**：定期扫重复代码并提 refactor 建议
- **`weekly-issue-summary`**：把一周内的 issue 讨论凝练成给 PM 看的摘要
- **`dependabot-pr-bundler`**：把多个 Dependabot PR 智能合并成一个
- **`/archie`**：在 issue 评论 `/archie` 让 agent 画 Mermaid 架构图
- **`/plan`**：在 issue 让 agent 输出实现方案，由人 review 后再下手
    

---

## 复用机制：imports

写多个 workflow 时不要复制粘贴 prompt，用 `imports:` 把共享片段抽出来：

```yaml
imports:
  - shared/mcp/tavily.md                            # 本仓相对路径
  - githubnext/agentics/shared/research.md@v1.0.0   # 远程 + 版本
  - github/gh-aw/.github/workflows/shared/example.md@abc123  # commit SHA 锁版
  - uses: shared/templates/triage.md                # 带参数
    with:
      labels: [bug, urgent]
      max-issues: 5
```

被导入文件的 `tools`、`mcp-servers`、`network`、`safe-outputs` 会与主文件合并。远程 import 按 commit SHA 缓存到 `.github/aw/imports/`，支持离线编译。

## MCP 集成：四种传输方式

gh-aw 的 MCP Gateway 是统一可信工具边界，**不能只靠 engine 自身的 `--allowed-tools` 做安全**——Claude 的 `bypassPermissions` 模式会绕过它，gateway 是兜底。

四种传输支持基本覆盖所有现实需求：

```yaml
mcp-servers:
  # 1. stdio:本地命令
  filesystem:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
    allowed: ["read_file", "list_directory"]

  # 2. Docker 容器(推荐用于第三方 MCP,隔离最强)
  notion:
    container: "mcp/notion"
    env:
      NOTION_TOKEN: "${{ secrets.NOTION_TOKEN }}"
    allowed: ["search_pages", "get_page"]
    network:
      allowed: [defaults, "api.notion.com"]

  # 3. HTTP 服务
  microsoftdocs:
    url: "https://learn.microsoft.com/api/mcp"
    allowed: ["*"]

  # 4. registry-based(从 MCP registry 加载元数据)
  github-projects:
    registry: "github"
    name: "projects-v2"
    allowed: ["get_project", "update_item"]
```

## 与传统 Actions 的对比

| 维度  | 传统 Actions YAML | gh-aw |
| --- | --- | --- |
| 编写形式 | YAML 步骤序列 | Markdown body + YAML frontmatter |
| 心智模型 | 声明"步骤" | 声明"意图" |
| 决定性 | Deterministic | Non-deterministic |
| 默认写权限 | 想写就写 | 编译期拒绝 write，必须走 safe-outputs |
| 网络  | 默认开放 | 默认走代理 + 域名 allowlist |
| 计费  | Actions minutes | Actions minutes + LLM tokens |
| 调试  | logs / artifacts | 同上 + `gh aw audit` 看 token、reasoning trace |
| 适合场景 | Build/test/release | Triage、CI 诊断、文档维护、报告类 |

心智上最大的转变是：**你不再写"先做 A 再做 B"，而是写"目标是 X、可用工具是这些、安全边界是这些"，让 agent 在沙箱里自由编排，最后通过 safe-outputs 提交结构化产物**。这种风格非常像在 LLM 工程里写 system prompt + tool spec，但所有运行成本、审计、合规、secret 管理都直接复用 Actions 已有基础设施。

## 上线前必读：踩坑清单

把官方 docs、weekly update、社区 discussion 里高频出现的坑总结成一个清单：

- **平台限制**：仅支持 Linux runner（依赖 iptables 与 Linux 容器）；GitHub-hosted macOS 因无嵌套虚拟化无法运行；Linux ARM64 OK
- **Token 不能塞进 prompt 或 workflow-level `env:`**：strict 模式直接编译失败，必须通过 `safe-outputs.github-token`、`tools.github.github-token`、`engine.env` 注入
- **`GITHUB_TOKEN` 在 GitHub MCP server 不被接受**：必须用 GitHub App installation token 或 PAT，推荐前者
- **PR 永远不自动合并**：官方公告原话 "humans must always review and approve"；建议自动 PR 配高风险 label 加通知
- **Engine 能力不对齐**：`max-turns` 仅 Claude/Codex 支持；`max-continuations` 仅 Copilot；`web-search` 在 Codex 默认禁用——写前查 reference/engines 矩阵
- **Cost runaway 风险真实存在**：v0.71 changelog 修过一个"loop quietly consuming millions of tokens"的 bug，单 workflow 烧过 2.38 亿 token；务必配 `max-turns` + `timeout-minutes` 双护栏，定期 `gh aw audit` 巡检
- **Long-running CI 任务超时**：C++、大 monorepo 的 5–10 分钟以上测试常碰 MCP timeout，调高 `tools.timeout` 与 `tools.startup-timeout`
    

## 落地策略

实践上有几条与 gh-aw 设计哲学高度对齐的纪律值得直接采纳：

**从低风险开始迭代**——先做 comment / draft / report 类 safe-outputs，再逐步开放 `create-pull-request`、`push-to-pull-request-branch`；先做测试覆盖率改善这种 refactor 任务，再做功能开发。

**把 `.md` 当代码 review**——明确 prompt 的"good 是什么"：格式、tone、链接、停止条件、字数上限都写死；同仓内复用 `imports:` 把 prompt 风格集中。

**配 daily audit**——用一个 agentic workflow 巡检其它 agentic workflow 的 health（这是官方推荐做法），结合 `gh aw health` 看趋势。

**缩小工具面**——每个 `mcp-servers:` 都明确写 `allowed:` 列表，不要图省事写 `["*"]`。

**限触发权限**——`on.roles: write`、`forks:` 严格；ChatOps 命令配合 `manual-approval:` 走 GitHub Environment 审批。

---

把 gh-aw 放在 GitHub Actions 体系里观察，它最有意思的地方不是"让你用 Markdown 写 workflow"这个表层创新，而是**把过去半年各家 agent framework 都在重做的安全模型——read-only 主进程、buffered output、threat detection 中介、作用域 token、egress firewall、工具白名单——固化成了 Actions 原生的 declarative 规范**。这意味着如果你今天已经在 Actions 里跑 LLM 任务，gh-aw 给的不是"更便捷的语法"，而是"更难做错的默认值"：当公开仓里有人在 issue 里塞 prompt injection 时，你的 agent 既没有 write token 可滥用，也走不出域名白名单，最终输出还要过一道独立的 detection job。

保守的上线节奏是：先用它做 triage、报告、文档维护、测试覆盖率这类**判断密集、产物可逆、收益清晰**的场景；CI/CD 主干仍用纯 YAML；等 GA 之后再考虑把 PR 自动评审与 auto-fix 推到 default branch。
