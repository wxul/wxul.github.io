---
title: Everything Claude Code：AI 代理工具链的性能优化系统全解析
date: 2026-03-27
badge: AI
tags: ["AI", "Claude Code", "Agent", "Harness"]
draft: false
---

**Everything Claude Code（ECC）是目前 GitHub 上最大的 AI 编程代理配置与优化开源项目**，拥有超过 **103,000 颗星标**和 **13,400+ 次 Fork**，由 Anthropic 黑客马拉松获奖者 Affaan Mustafa 主导开发。它不是一个简单的配置包，而是一套完整的 **代理工具链性能优化系统**——涵盖 119 个技能定义、28 个专业子代理、60 个斜杠命令、34 条规则和完善的钩子机制，支持 Claude Code、Cursor IDE、Codex、OpenCode 等主流 AI 编码工具。项目从 2026 年 1 月首次发布到 3 月突破 10 万星，增长速度在开源世界极为罕见。

---

## 项目的核心用途与设计哲学

ECC 的核心定位是 **"代理工具链性能优化系统"（Agent Harness Performance System）**，而非传统的配置文件集合。它解决的根本问题是：AI 编程代理在实际生产环境中缺乏结构化的工作流、质量保障和持续学习能力。

该项目建立在几个关键理念之上。**技能（Skills）** 是领域特定的工作流定义，像人类专家的操作手册一样指导 AI 代理完成特定任务。**本能（Instincts）** 是从会话中自动提取的原子级学习行为，带有置信度评分，能够随着使用积累不断进化。**钩子（Hooks）** 提供确定性的事件触发机制，确保关键检查和自动化流程 **100% 可靠执行**——这与技能的概率性触发（50-80%）形成关键对比。**规则（Rules）** 则是系统级的永久注入指令，AI 代理无法选择忽略它们。

整个系统的组件层次为：规则（始终执行）→ 钩子（事件触发，100% 确定性）→ 技能（工作流指导，概率性）→ 命令（用户主动调用）→ 代理（专业化子任务委派）。

---

## 仓库完整目录结构与组件统计

仓库根目录包含约 **30 个顶层文件**和 **23 个目录**（含隐藏目录），总计 **769+ 次提交**，当前版本为 **v1.9.0**。

### 根级关键文件

| 文件名 | 功能  |
| --- | --- |
| `CLAUDE.md` | Claude Code 的项目级指令文件，定义项目结构、测试命令、编码规范 |
| `AGENTS.md` | 代理委派规则、编码标准、安全要求和工作流定义 |
| `package.json` | npm 包配置（包名 `ecc-universal`），定义 CLI 入口和安装脚本 |
| `install.sh` / `install.ps1` | 跨平台安装脚本（macOS/Linux 和 Windows） |
| `the-shortform-guide.md` | 简明指南：安装、基础概念、设计哲学 |
| `the-longform-guide.md` | 深度指南：Token 优化、记忆持久化、评估、并行化 |
| `the-security-guide.md` | 安全指南：攻击向量、沙箱、清理、CVE、AgentShield |
| `CHANGELOG.md` | 版本更新日志（11 个正式版本） |
| `CONTRIBUTING.md` | 贡献指南：代理格式、命名规范、提交流程 |
| `llms.txt` | OpenCode 的完整文档索引 |

### 核心目录结构

```text
agents/              → 28 个专业子代理（Markdown + YAML frontmatter 格式）
skills/              → 119 个技能工作流定义（每个目录含 SKILL.md）
commands/            → 60 个斜杠命令（Markdown 格式）
rules/               → 34 条规则（common/ + 10 种语言特定目录）
hooks/               → hooks.json 事件钩子配置
scripts/             → 跨平台 Node.js 钩子实现脚本（20+ 个）
contexts/            → 动态上下文注入文件（dev.md, review.md, research.md）
examples/            → CLAUDE.md 示例模板（SaaS/Next.js, Go 微服务, Django, Laravel, Rust）
mcp-configs/         → 14 个 MCP 服务器配置（GitHub, Supabase, Vercel 等）
.agents/skills/      → Codex 兼容的技能副本
.cursor/             → Cursor IDE 适配（钩子、规则、命令的 DRY 转换）
.codex/              → Codex macOS App + CLI 配置
.opencode/           → OpenCode 完整支持（插件、指令、工具）
docs/                → 多语言文档（中文、日文、韩文、葡萄牙文、土耳其文）+ 架构文档
tests/               → 完整测试套件（997+ 内部测试通过）
```

---

## 119 个技能的完整分类与核心内容

ECC 的技能系统是其最核心的组成部分。每个技能存储在 `skills/{name}/SKILL.md` 中，使用标准化的 Markdown 格式，包含 YAML frontmatter（`name`、`description`、`origin`）和结构化的工作流指导内容。

### 开发工作流与质量保障类（约 20 个）

**`tdd-workflow`** 是最核心的开发技能之一。它强制执行测试驱动开发：先写用户故事（As a [role], I want to [action], so that [benefit]），然后按 RED→GREEN→REFACTOR 循环开发。**覆盖率最低要求 80%**，包括单元测试、集成测试和 E2E 测试三层。技能文件中包含了 Jest/Vitest 单元测试模式、NextRequest API 集成测试模式和 Playwright E2E 测试模式的完整代码范例，以及 Supabase、Redis、OpenAI 的 mock 模式。

**`verification-loop`** 提供持续验证和检查点门控。它自动运行构建检查（`npx tsc --noEmit`）、类型检查、Lint 检查、测试覆盖率验证和安全扫描（检测硬编码密钥、console.log 残留），最后生成格式化的验证报告：`Build: [PASS/FAIL], Types: [PASS/FAIL], Tests: [X/Y passed, Z% coverage]`。

**`eval-harness`** 实现了 **评估驱动开发（EDD）** 框架。它将评估视为"AI 开发的单元测试"，定义两种评估类型：能力评估（测试新功能）和回归评估（确保不破坏现有功能）。支持三种评分器：代码评分器（确定性检查）、模型评分器（Claude 评估开放式输出，1-5 分）和人工评分器。关键指标是 **pass@k**——"k 次尝试中至少一次成功"，目标是 pass@3 > 90%。

**`security-review`** 覆盖 OWASP Top 10：注入攻击、身份验证破坏、敏感数据暴露、XXE 等。具体检查项包括密钥检测、输入验证、CSRF 防护（Token 验证）、Cookie 安全性（`HttpOnly; Secure; SameSite=Strict`）和依赖安全审计。

其他工作流技能包括：`e2e-testing`（Playwright 页面对象模型）、`plankton-code-quality`（编写时代码质量强制）、`search-first`（编码前先研究现有工具和库）、`skill-stocktake`（技能和命令的质量审计）。

### 持续学习与记忆管理类（4 个）

**`continuous-learning-v2`** 是 ECC 最具创新性的技能。它实现了一套 **基于本能的学习系统**：通过 PreToolUse/PostToolUse 钩子 100% 可靠地捕获会话活动，由后台 Haiku 模型进行模式检测（用户纠正、错误解决、重复工作流），生成带有 **置信度评分** 的原子级"本能"。置信度范围从 0.3（试探性，建议但不强制）到 0.9（近乎确定，核心行为）。本能随观察积累自动提升置信度，若用户纠正则降低。通过 `/evolve` 命令可将相关本能聚类升级为完整的技能、命令或代理。v2.1 还增加了 **项目作用域**，防止跨项目污染——每个项目通过 git remote URL 哈希独立存储本能。

**`strategic-compact`** 解决了 Claude Code 的上下文管理问题。它不依赖默认的 95% 上下文自动压缩，而是在逻辑断点（每 50 次工具调用后，此后每 25 次）通过 stderr 提示用户手动执行 `/compact`，确保上下文在任务阶段转换时被有策略地压缩。

**`iterative-retrieval`** 为子代理提供渐进式上下文检索模式——不是一次性加载所有信息，而是逐步细化检索范围，解决子代理的上下文溢出问题。

### 语言与框架模式类（约 35 个）

这是技能数量最多的类别，覆盖 **12 种语言生态系统**：

-    **TypeScript/JavaScript**：`coding-standards`（通用编码标准）、`backend-patterns`（RESTful API 设计、数据库优化、N+1 查询防护、Supabase 事务模式）、`frontend-patterns`（React/Next.js 组件组合、Context API、Hooks 模式）、`bun-runtime`、`nextjs-turbopack`
    
-    **Python**：`python-patterns`（PEP 8、类型提示、惯用法）、`python-testing`（pytest）、`django-patterns/security/tdd/verification`、`pytorch-patterns`（深度学习训练管线、数据加载、模型架构）
    
-    **Go**：`golang-patterns`（惯用 Go 模式）、`golang-testing`（TDD、基准测试）
    
-    **Java**：`java-coding-standards`、`springboot-patterns/security/tdd/verification`、`jpa-patterns`
    
-    **C++**：`cpp-coding-standards`（基于 C++ Core Guidelines）、`cpp-testing`（GoogleTest, CMake/CTest）
    
-    **Swift**：`swift-concurrency-6-2`（Swift 6.2 并发模型）、`swift-actor-persistence`、`swift-protocol-di-testing`
    
-    **Perl**：`perl-patterns`（Perl 5.36+ 现代实践）、`perl-security`、`perl-testing`
    
-    **PHP**：`laravel-patterns/security/tdd/verification`
    
-    **Kotlin/Android**：通过规则和代理支持
    
-    **Rust**：通过 `rust-reviewer` 和 `rust-build-resolver` 代理支持
    

### 基础设施与部署类（约 10 个）

`docker-patterns`（Compose、网络、卷、安全）、`deployment-patterns`（CI/CD、健康检查、回滚）、`database-migrations`（Prisma、Drizzle、Django、Go 迁移模式）、`postgres-patterns`（PostgreSQL 优化）、`clickhouse-io`（ClickHouse 分析工程）、`api-design`（REST API 设计、分页、错误响应）、`mcp-server-patterns`（MCP 服务器开发模式）。

### 商业与内容创作类（6 个）

`article-writing`（避免 AI 腔调的长文写作）、`content-engine`（多平台社交内容工作流）、`market-research`（带来源归属的研究）、`investor-materials`（投资演示文档、财务模型）、`investor-outreach`（个性化融资外联）、`frontend-slides`（零依赖 HTML 演示文稿构建器——这是内容最完整的技能之一，支持从 PowerPoint 转换、设计风格探索、自适应视口和键盘/触摸导航）。

### 高级代理编排类（约 8 个）

**`autonomous-loops`**（608 行，覆盖管线循环、PR 循环、DAG 编排——包含顺序代理链模式 Research→Plan→Implement→Test→Review→Fix→Verify，Git worktree 隔离，以及多代理协调模式）、`configure-ecc`（交互式安装向导）、`security-scan`（AgentShield 集成，1282 个测试，102 条规则）、`cost-aware-llm-pipeline`（LLM 成本优化和模型路由）、`regex-vs-llm-structured-text`（正则 vs LLM 解析的决策框架）、`rules-distill`（从技能中提取跨领域原则并蒸馏为规则）、`deep-research`、`documentation-lookup`。

---

## 28 个专业子代理的职责与配置

每个代理以 Markdown + YAML frontmatter 格式定义，包含 `name`、`description`、`tools`（如 Read, Grep, Glob, Bash）和 `model`（sonnet 或 opus）字段。

| 代理名称 | 模型  | 核心职责 |
| --- | --- | --- |
| `planner` | sonnet | 复杂功能实现规划，生成分阶段的实施计划（含文件路径、依赖、风险评估） |
| `architect` | opus | 系统架构设计，生成架构决策记录（ADR），如向量存储选型 |
| `tdd-guide` | sonnet | TDD 执行专家，RED→GREEN→REFACTOR 循环 |
| `code-reviewer` | opus | 代码审查，严重性分级（CRITICAL/HIGH/MEDIUM/LOW），含安全问题和代码质量检查 |
| `security-reviewer` | opus | OWASP Top 10 安全分析，自动运行 npm audit 和 eslint-plugin-security |
| `build-error-resolver` | sonnet | 构建错误自动修复 |
| `loop-operator` | —   | 自主循环执行，监控停滞和干预 |
| `harness-optimizer` | —   | 工具链配置调优（可靠性、成本、吞吐量） |
| `chief-of-staff` | —   | 多渠道通信分类和草拟（邮件、Slack、日历） |

语言特定代理覆盖 **TypeScript、Python、Go、Java、Kotlin、Rust、C++**，均有独立的 reviewer 和 build-resolver。`pytorch-build-resolver` 专门处理 CUDA/训练运行时错误。

代理委派遵循明确规则：复杂功能请求→`planner`，刚写完代码→`code-reviewer`，Bug 修复→`tdd-guide`，安全敏感→`security-reviewer`。**支持并行执行**——独立操作可同时启动多个代理。

---

## 安装部署与使用方式

### 推荐安装路径（插件模式）

```bash
# 添加市场源
/plugin marketplace add affaan-m/everything-claude-code

# 安装插件
/plugin install everything-claude-code@everything-claude-code

# 手动安装规则（插件限制，无法自动分发规则）
git clone https://github.com/affaan-m/everything-claude-code.git
cd everything-claude-code
npm install
./install.sh typescript    # 或 python / golang / swift / php
```

Windows 用户使用 `.\install.ps1 typescript` 或 `npx ecc-install typescript`。

### 选择性安装（v1.9.0 新增）

```bash
ecc install --profile developer --with lang:typescript --with agent:security-reviewer --without skill:continuous-learning
```

基于清单驱动的安装管线（`install-plan.js` + `install-apply.js`），SQLite 状态存储跟踪已安装组件，支持增量更新。

### Token 优化配置

| 设置项 | 默认值 | 推荐值 | 效果  |
| --- | --- | --- | --- |
| model | opus | sonnet | 成本降低约 60% |
| MAX_THINKING_TOKENS | 31,999 | 10,000 | 思考成本降低约 70% |
| CLAUDE_AUTOCOMPACT_PCT_OVERRIDE | 95  | 50  | 更早压缩，更好的上下文质量 |

### 钩子运行时控制

```bash
export ECC_HOOK_PROFILE=standard        # minimal | standard | strict
export ECC_DISABLED_HOOKS="pre:bash:tmux-reminder,post:edit:typecheck"
```

---

## 跨工具平台支持与功能对等性

ECC 的一个显著特点是 **同一仓库支持四大 AI 编码工具**，通过适配层实现功能对等：

| 特性  | Claude Code | Cursor IDE | Codex CLI | OpenCode |
| --- | --- | --- | --- | --- |
| 代理  | 28  | 共享 AGENTS.md | 共享 AGENTS.md | 12  |
| 命令  | 60  | 共享  | 指令模式 | 31  |
| 技能  | 119 | 共享  | 10 原生 | 37  |
| 钩子事件 | 8 种 | 15 种 | 暂无  | 11 种 |
| 规则  | 34  | 34 (YAML) | 指令模式 | 13  |

Cursor 使用 DRY 适配模式（`.cursor/hooks/adapter.js`）将 Cursor 的 stdin JSON 格式转换为 Claude Code 格式。Codex 通过 `.codex/config.toml` 和 `AGENTS.md` 配置，提供 explorer、reviewer、docs_researcher 三个代理角色。

---

## 生态工具与社区生态

**AgentShield** 是配套的安全审计工具，在 Anthropic 黑客马拉松（Cerebral Valley x Anthropic，2026 年 2 月）上开发。它使用 **3 个 Opus 4.6 代理**（红队/蓝队/审计员）进行安全扫描，覆盖 CLAUDE.md、settings.json、MCP 配置、钩子、代理定义和技能文件。`npx ecc-agentshield scan --opus --stream` 可直接运行。

**ECC Tools GitHub App**（github.com/marketplace/ecc-tools）提供 150+ 安装量，分为免费版（10 次/月公开仓库）、Pro 版（$19/座位/月）和企业版。

**NanoClaw v2** 是基于 `claude -p` 构建的零依赖 REPL，支持模型路由、技能热加载、会话分支/搜索/导出/压缩/指标。

npm 上发布了两个包：**`ecc-universal`**（主包）和 **`ecc-agentshield`**（安全审计）。

### 社区与贡献

项目当前有 **113 位贡献者**，30+ 位社区 PR 被合并。核心维护者 Affaan Mustafa 自 Claude Code 实验性发布以来持续使用，在 2025 年 9 月赢得 Anthropic x Forum Ventures 黑客马拉松，完全使用 Claude Code 构建了 zenith.chat。社区贡献包括韩语、中文翻译，安全钩子，biome 钩子优化，视频处理技能等。

---

## 与其他 Claude Code 工具的关系与独特定位

ECC 在 AI 编码工具生态中处于独特位置。它不是一个独立的 IDE 或 CLI 工具，而是一个 **跨工具的增强层**。与 Cursor Rules（仅限 Cursor）或 Codex 内置配置不同，ECC 通过统一的技能/代理/钩子系统同时支持 Claude Code、Cursor、Codex 和 OpenCode。

最值得关注的差异化能力是其 **持续学习系统**。大多数 AI 编码工具将每次会话视为独立事件，而 ECC 通过本能系统实现了跨会话的行为积累和进化——这是朝向"个性化 AI 编程助手"的实质性进步。**规则与技能的分层架构**（确定性规则 → 确定性钩子 → 概率性技能）也比大多数扁平化的提示词配置更为成熟。

项目正在规划 **ECC 2.0（Agentic IDE）**，从 2026 年 3 月 22 日起已在 GitHub Issues 中创建了多个 `ecc-2.0` 标签的增强提案，暗示将从配置系统进一步演进为完整的代理化开发环境。

---

## 结论

Everything Claude Code 代表了 AI 编程辅助工具从"提示词工程"到"系统工程"的范式转变。其最大价值不在于单个技能的内容（虽然每个技能都经过生产验证），而在于构建了一套 **可组合、可进化、跨平台的代理基础设施**。对于重度使用 AI 编程工具的开发者，ECC 的三个组件最值得优先采用：**TDD 工作流**（强制测试优先的开发纪律）、**持续学习 v2**（将个人编码模式系统化）和 **验证循环**（自动化质量门控）。119 个技能中约 35 个是语言/框架特定的模式参考，选择与自己技术栈匹配的即可。钩子系统和规则系统则应作为整体采用，因为它们提供了 AI 代理最缺乏的东西——确定性的行为保障。
