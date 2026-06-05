---
title: 详解 andrej-karpathy-skills:一份 65 行 Markdown 如何重塑 AI 编程行为
date: 2026-04-28
badge: AI
tags: ["AI", "Claude Code", "Agent", "Developer"]
draft: false
---

`forrestchang/andrej-karpathy-skills` **不是一个模仿 Karpathy 教学/编码作品的多技能集合,而是一份仅约 65 行的 `CLAUDE.md` 行为准则**——它把 Karpathy 在 2026 年 1 月 26 日 X 推文里对 LLM 编程缺陷的吐槽,提炼为四条可即插即用的"戒律"。这份单文件项目在三个月内冲到约 **85–91k stars / 8.7k forks**,成为 2026 年初被广泛传播的"AI 编程行为规范"。它的价值不在于"开创"什么——Skills 标准本身在 2025 年 10 月就已落地——而在于用最小化的形式回答了一个具体问题:**当 Skills 成为基础设施后,普通开发者如何把专家的方法论沉淀成自己工作流的一部分**。本报告分三部分展开:项目本身的真实样貌、Skills 背后的技术原理、以及由此引申的工作流启发。

---

## 一、项目概述:一个被严重误解的"爆款戒律书"

### 真实样貌与作者动机

进入仓库后会发现,它**几乎没有代码**——主要语言是 Markdown,核心只有一份 `CLAUDE.md`。完整的顶级结构如下:

```text
andrej-karpathy-skills/
├── .claude-plugin/                       # Claude Code Plugin 清单
├── .cursor/rules/karpathy-guidelines.mdc # Cursor 规则文件
├── skills/karpathy-guidelines/SKILL.md   # Skill 形式的同源准则
├── CLAUDE.md                             # 核心:65 行 / 2.3 KB
├── CURSOR.md / EXAMPLES.md
├── README.md / README.zh.md
```

作者 **Forrest Chang(本名 Jiayuan Zhang / 张佳源)** 是华人开发者,Multica.ai 的创始人兼 CEO,自称"AI-native Builder",GitHub 上有 1.1k followers、103 个仓库,代表项目还包括 `devv-ai`(AI 开发者搜索引擎)、`gptlang`、`programmer-soft-skills`。**项目动机一半是技术分享、一半是为他自家创业项目 Multica(管理 coding agents 的开源平台)引流**——README 顶部第一行就是 Multica 的推广。

### 与 Karpathy 的真实关系

仓库的"andrej-karpathy"指向**不是** Karpathy 的 nanoGPT、micrograd、makemore、Zero-to-Hero 等教学体系,而是 Karpathy 2026-01-26 在 X 上的一段公开总结。Karpathy 在那条推文中描述自己已从"80% 手写 + autocomplete"转向"80% agent-driven coding",并列出三类反复出现的失败模式。**Karpathy 本人未公开背书该项目**,他的角色仅是"灵感提供者"。

Forrest 的工作是把这些观察压缩成四条可执行的行为准则,映射关系十分清晰:

| Karpathy 的吐槽 | 项目中的戒律 |
| --- | --- |
| 模型默默替你做错误假设、不澄清、不反驳 | **1. Think Before Coding**<br><br>——显式声明假设,该反驳就反驳 |
| 100 行能解决的事写成 1000 行,堆砌抽象 | **2. Simplicity First**<br><br>——"资深工程师会说这过度复杂吗?" |
| 顺手乱改/删它没真正理解的注释和正交代码 | **3. Surgical Changes**<br><br>——"每一行修改都必须直接追溯到用户请求" |
| LLM 极擅长围绕成功标准循环 | **4. Goal-Driven Execution**<br><br>——给标准、不给步骤,让模型自己 loop |

### CLAUDE.md 核心内容(摘录)

```markdown
## 2. Simplicity First
Minimum code that solves the problem. Nothing speculative.
- No features beyond what was asked.
- No abstractions for single-use code.
- If you write 200 lines and it could be 50, rewrite it.
Ask: "Would a senior engineer say this is overcomplicated?"

## 3. Surgical Changes
Touch only what you must. Clean up only your own mess.
- Don't "improve" adjacent code, comments, or formatting.
- Match existing style, even if you'd do it differently.
The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug"   → "Write a test that reproduces it, then make it pass"
Strong success criteria let you loop independently.
```

`skills/karpathy-guidelines/SKILL.md` 内容与 CLAUDE.md 实质相同,只多一段 frontmatter 触发器:"Use when writing, reviewing, or refactoring code to avoid overcomplication, make surgical changes, surface assumptions, and define verifiable success criteria."

### 项目使用方式

安装可走三条路:Claude Code Plugin 一键 `/plugin install andrej-karpathy-skills`、单文件 `curl` 拉到项目根目录作为 `CLAUDE.md`、或在 Cursor 里直接复用其 `.cursor/rules`。**这是一份"open ideas"型开源**——开源的不是代码而是一份高度精炼的行为提示。它的杀手锏是零安装成本和跨工具兼容,任何遵循 `AGENTS.md` / `CLAUDE.md` 约定的工具都能直接读。

---

## 二、技术原理:Anthropic Agent Skills 与渐进式披露

要理解为什么这样一份 Markdown 文件能够"生效",必须把它放回 2025 年 10 月 Anthropic 推出的 **Agent Skills** 框架里。这套框架定义了 Claude(及现在的 OpenAI、Microsoft、Cursor 等)如何加载、识别、执行结构化的"专家知识包"。

### 关键时间线与官方定义

**2025 年 10 月 16 日**,Anthropic 在工程博客《Equipping agents for the real world with Agent Skills》中正式发布 Skills,同步开源 `github.com/anthropics/skills`(2026 年 4 月已逼近 **125k stars**)。**2025 年 12 月 18 日**,Anthropic 把 Skills 升格为开放标准,推出规范站点 **agentskills.io** 与参考 SDK,并联合 Atlassian、Canva、Figma、Notion、Stripe、Zapier 等发布合作伙伴 Skills 目录。仅一天后(12 月 19 日),Greg Brockman 宣布 OpenAI Codex 也支持同一规范——**Skills 在两个月内完成了 MCP 当年用一年才完成的跨厂商标准化**。

Anthropic 的官方定义直接回答了"是什么":

> **"Agent Skills: organized folders of instructions, scripts, and resources that agents can discover and load dynamically to perform better at specific tasks."**

类比是给新员工的 **onboarding guide**——封装可复用的"程序性知识"。一个文件夹 + 一个 SKILL.md 即是最小可用单位。

### SKILL.md 的最小结构与字段

```text
my-skill/
├── SKILL.md          # 必需:YAML frontmatter + 主指令
├── scripts/          # 可选:可执行脚本(stdout 才进上下文)
├── references/       # 可选:按需读入的参考文档
└── assets/           # 可选:模板、字体、图标等
```

SKILL.md 的 frontmatter 只有两个**必需字段**:`name`(≤64 字符,小写连字符)与 `description`(≤1024 字符,**必须同时回答"做什么 + 何时使用"**)。Claude Code 还支持可选的 `allowed-tools`、`disable-model-invocation`、`model`、`license` 等字段,用于精细化权限与调用模式控制。

`description` 字段的撰写质量决定生死。Anthropic 的 `skill-creator` 元 skill 内置一句惊人坦率的忠告:**"Claude has a tendency to undertrigger skills—please make the descriptions a little bit pushy."** 例如官方 docx skill 的 description 中显式罗列触发关键词:`"'Word doc', 'word document', '.docx', report, memo, letter, template…"`。

### 渐进式披露:为什么不烧爆上下文

Skills 真正的设计精髓是 **progressive disclosure(渐进式披露)**——先看目录、再读章节、最后查附录的三级懒加载:

| 层级  | 何时加载 | Token 成本 | 内容  |
| --- | --- | --- | --- |
| **L1 元数据** | 启动时全部 skill | ~50–100 tokens / skill | YAML 中的 `name` + `description` |
| **L2 主体** | Claude 判断相关时通过 bash 读入 | < 5,000 tokens | SKILL.md 全文 |
| **L3 资源** | 主体显式引用时按需加载 | 无上限 | scripts、references、assets |

**关键洞察**:scripts 通过 bash 执行而**不读入上下文**——只有 stdout 进入 token 预算。这意味着一个 skill 包可以打包数百 MB 数据,但运行时上下文只增长几十 tokens,直到 Claude 真的需要为止。Anthropic 产品经理 Mahesh Murag 的描述是:"Each skill takes only a few dozen tokens when summarized; full details load only when the task requires them."

### Claude 如何识别并触发 skill

Mikhail Shilkov 在 2025 年 10 月对 Claude Code 做了反向工程,发现启动时实际注入的工具定义形如:

```xml
<available_skills>
  <skill>
    <name>pdf</name>
    <description>Extract and analyze text from PDF documents.
      Use when users ask to process or read PDFs.</description>
    <location>user</location>
  </skill>
  ...
</available_skills>
```

启动时 Claude Code 扫描所有 skill 目录,**仅取 frontmatter** 的 `name + description`,塞入一个名为 `Skill` 的 meta-tool 描述里。Claude 基于此做**LLM 内部的相关性匹配(不是向量检索)**,命中后用 bash 工具 `cat skills/<name>/SKILL.md` 把主体读入,再按需打开 references 或执行 scripts。这就是为什么 description 写得是否精确直接决定 skill 是否被激活——它本质是一次 in-context routing。

### 与 Prompt、RAG、MCP 的边界

| 维度  | Prompt | RAG | MCP | **Agent Skills** |
| --- | --- | --- | --- | --- |
| 本质  | 一段文本 | 检索文档片段 | 协议:把外部工具/数据源暴露给 LLM | "专家知识包"——instructions+scripts+resources 的文件夹 |
| 启动 token 开销 | 全部加载 | 中   | **高,常数万**<br><br>(GitHub MCP 单独 ~55K) | 极低(~50 tokens × N) |
| 执行环境要求 | 无   | 无   | MCP server | **必须有 filesystem + bash + code execution** |
| 可移植性 | 高   | 中   | 高   | **高(开放标准)** |
| 典型用途 | 通用风格 | 知识库问答 | 接 Jira/GitHub/DB | "**怎么做一类任务**" |

Anthropic 的官方立场是:**MCP 与 Skills 互补,不是竞争**。流行的类比是"**MCP 是管道(连接性),Skills 是说明书(方法论),Plugins 是套装(分发)**"。一个 skill 完全可以在指令中调度多个 MCP 工具,把"打开 Jira → 读 Sentry → 写 Notion"的固定流程编码下来。

ScaleKit 在 2026 年 3 月做的 75 次基准测试给出了硬数据:同一个 GitHub 任务,纯 CLI 用 1,365 tokens,**CLI + Skills 用 4,724 tokens,而 MCP 用 44,026 tokens**——**Skills 比 MCP 节省 9–32 倍 token**,可靠性 100% vs 72%。这解释了 Simon Willison 那句被广泛引用的论断:**"Claude Skills are awesome, maybe a bigger deal than MCP."**

### 把这一切套回 forrestchang 项目

`andrej-karpathy-skills` 的工作机制因此变得透明:它的 `skills/karpathy-guidelines/SKILL.md` 在 Claude Code 启动时仅注入约 100 tokens 的元数据;一旦用户开始写、改或重构代码,description 中的 "writing, reviewing, or refactoring code" 等关键词触发 Claude 加载完整的四条戒律(<5K tokens);而由于这份 skill 没有 scripts/references,L3 永远不会被激活。**它是一个"L1+L2 极简型 skill",用尽可能小的 token 预算改写 Claude 的编程行为**——这正是它能在零运行时成本下被几十万开发者纳入工作流的根本原因。

---

## 三、启发与思考:专家思维的"半结构化封装"时代

### Skill-as-folder 范式相比传统 prompt 工程的胜出

它的优势是**多维**的。**版本化**:一个 skill 是 git 目录,可 PR review、可 rollback、可 CODEOWNERS 划权——传统的复制粘贴 prompt 做不到。**按需加载**:大型 system prompt 全量塞入,而 skill 只在被判定相关时展开,**释放出的上下文 = 更长输入 + 更深推理**。**零训练成本**:相比 fine-tuning 改权重,改 skill 是改 Markdown,即改即生效。**职责分离**:RAG 提供"是什么",skill 提供"怎么做",两者正交而非替代。**组织资产化**:Anthropic 在企业版推出 organization-wide skill 管理,SOP / 合规清单 / 品牌规范第一次拥有了"AI 可消费"的格式标准。

Simon Willison 给出了最实用的判断准则:"**如果你在多次对话中反复键入同一段 prompt,就该写成 skill。**"Flask 作者 Armin Ronacher 在 2025-12-13 的实践更激进:"我把所有 MCP 都迁移成了 skill——skill 不向上下文注入任何 tool 定义,工具掌握在我自己手里。"

### 模仿专家思维:可行边界与局限

`andrej-karpathy-skills` 的爆红证明了**"明星方法论的 commoditize"是真实需求**——并且这绝非孤例。`obra/superpowers`(进入 Anthropic 官方 marketplace)把作者 Jesse Vincent 的 7 阶段 TDD 哲学固化进 20 多个 skill;UX 设计师 Marie Claire Dean 的 `designer-skills` 把她 63 个设计技能打包;`uditgoenka/autoresearch` 直接模仿 Karpathy 的"5 专家辩论"swarm 思路。这些项目共同揭示了一个新型态:**专家不再只输出文章和视频,而是输出"可被 AI 直接执行的方法论包"**。

但局限同样清晰。Marie Claire Dean 自己写道:"the creative leaps, taste, intuition — that's still ours." Skill 能编码**显性的判断标准、checklist、流程模板**,但**隐性知识(taste、判断时机、跨领域类比)**仍然丢失。Karpathy 推文里那种"看一眼就知道这段抽象多余"的直觉,被 forrestchang 简化成了"资深工程师会说这过度复杂吗?"——这个问题确实改善行为,但不能复刻直觉本身。

它和 character/persona prompting 的差别也值得明确:persona 工作在**风格层**(让模型扮演 X),skill 工作在**结构层 + 行为层**——可被 grep、可被审计、可 chain、可加 verification gate。这是软件工程意义的进化,不是话术意义的扮演。

### 给个人和团队的具体启示

对**个人开发者**,起步路径已经清晰:fork 一个 awesome-claude-skills,挑 1–2 个跑一周,然后用 Anthropic 的 `skill-creator` 元 skill 生成自己的第一个;Armin Ronacher 的建议更彻底——"让 agent 自己维护 skill,坏了让 agent 修"。

对**团队**,skill 是组织知识资产化的新载体。把 SOP、runbook、on-call 流程、release checklist、品牌规范、新人 onboarding 文档做成 skill 仓库,用 CI 校验 SKILL.md 与代码不漂移(Imbad0202/academic-research-skills 已有此实践)。Anthropic 在企业用例中给出的数据是"new members get expert-level results from day one";claudeskillshq 的财务团队案例显示"close 时间减少 60%,reconciliation 每月省 15 小时"。

对**行业**,这是一次 SaaS 价值链的重新洗牌。Anthropic 在 Cowork 推出法律 plugin 当天,LexisNexis 母公司 RELX、Thomson Reuters、LegalZoom 股价齐跌——**通用 agent + 垂直 skill 的组合开始侵蚀传统 vertical SaaS**。已经落地的有 Anthropic 法律 plugin、Microsoft Foundry × Claude 的医疗 prior authorization、claudeskillshq 的金融 close 流程、754 个映射 MITRE ATT&CK 的安全 skill。

### Agentic AI 时代的趋势与风险

**趋势上**:Skill marketplace 已经实质形成——官方有 Claude Code Plugin marketplace,社区有 claudemarketplaces.com、skillsmp.com(自称 90 万+ skills)、VoltAgent/awesome-agent-skills 成为事实上的 NPM index。**跨厂商标准化已经不可逆**:agentskills.io 在 2 个月内被 Claude Code、Codex、ChatGPT、Cursor、GitHub Copilot、Gemini CLI、Goose、Cursor、Mistral 等 26+ 平台采用,Anthropic 复制了 MCP "通过开源避免被 OpenAI 围墙"的成功剧本。

**风险也已浮现**。Snyk 在 2026-02 发布的 ToxicSkills 研究扫描了 ClawHub 与 skills.sh 共 **3,984 个 skill,发现 13% 含严重安全缺陷,36.82% 存在 prompt injection 漏洞,91% 的恶意 skill 把 prompt injection 与传统 malware 结合**——绕过 AI 安全机制 + 传统安全工具。**OWASP Top 10 for Agentic Applications 2026** 已把 **Agent Goal Hijacking 列为 #1 风险**。Snyk 的警告很直白:"The skills you install today have access to your credentials tomorrow." 这意味着 skill 是新的"软件供应链",静态扫描、签名验证、运行时 prompt-injection 检测会成为 Lasso、Snyk 这类厂商的下一个市场。

最后,X 用户 Ian Nuttall 的吐槽也值得记下:"Claude might be in danger of overcomplicating a lot of stuff—Skills, Agents, Marketplaces, Plugins, Projects... I just wanna chat." 一切抽象都有反作用力。

---

## 结语:一份 65 行的 Markdown,折射出工程哲学的迁移

`forrestchang/andrej-karpathy-skills` 表面上是一份"行为戒律书",但它能在三个月内累积 85k+ stars,真正的原因是它**精准踩中了 prompt → MCP → Skill 这条工程哲学的迁移点**。从"靠口耳相传的 prompt 模板"到"重协议层的 MCP",再到"轻文件层、按需懒加载的 Skill"——本质是把可执行知识从 protocol 卸载到 filesystem,把决策权交还给模型自身的能力。

这条路线的工程胜利,在于用**最简单的格式(Markdown + 几行 YAML)**同时满足了三个矛盾的需求:**非工程师能写、工程师能 git 化、模型能高效消费**。Karpathy 推文里关于"LLM 编码失败模式"的随手吐槽,之所以能被压缩成 65 行 Markdown 并影响数十万开发者,不是因为这些观察多么深刻,而是因为整个**Skill 标准让"专家方法论的 commoditize"第一次有了零摩擦的分发通道**。

未来十二个月最值得观察的三件事:**(1)** 跨厂商标准化是否会带来真正的 skill 包管理器(类似 npm),并衍生付费 marketplace 与"skill 工程师"职业;**(2)** 安全维度上,静态扫描和运行时防护会从论文走向标配,skill 治理会被纳入企业的软件供应链管理;**(3)** 行业垂直 SaaS 的护城河——尤其是那些核心价值就是"封装专家流程"的产品(法律、咨询、财税)——会面临"通用 agent + 开源 skill"组合的根本性挑战。

而对个人,最朴素的行动建议依然是 Simon Willison 那句话:**当你发现自己在反复输入同一段 prompt 时,停下来,写一个 skill。**
