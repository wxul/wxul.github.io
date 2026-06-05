---
title: DeepSeek-TUI 深度评测：一个 Rust 写的 DeepSeek 专属 Coding Agent
date: 2026-05-11
badge: AI
tags: ["AI", "Coding", "Rust", "Vibe Coding"]
draft: false
---

**这不是一个 DeepSeek 版的 Claude Code,而是一个绑死 DeepSeek-V4 的 Rust 原生 coding agent**——三个月内冲到 **24K stars**、登顶 GitHub Trending Rust 榜的独立项目。它在能力的颗粒度上敢和 Claude Code 正面拼刀:1M token 上下文、Plan/Agent/YOLO 三档审批、Seatbelt/Landlock 原生沙箱、副 git 工作区快照、SQLite 会话持久化、MCP 双向支持、子 agent、RLM 并行展开。但**所谓"多 provider"只是同一个 DeepSeek-V4 权重的六个托管入口,GPT、Claude、Gemini、Ollama 一个都接不上**。换句话说,它的"vibe"是把灵活性押给一个家族,换来极致优化和恐怖的便宜——V4-Flash 比 Sonnet 4.6 便宜 **50 多倍**。下面是从 vibe coder 视角的全部诚实判断。

## 三个月,从无到 24K star 的非典型轨迹

仓库主作者是 **Hunter Bown**(GitHub `@Hmbown`),独立美国开发者,X 上是 `@huntermbown`,GitHub 56 个公开仓库。他的另外两个项目暴露了审美倾向:**Aleph**(把 agent 变成 Recursive Language Model 的 MCP server,灵感来自 Alex Zhang/Omar Khattab 的 RLM 论文)和 **Hegelion**(把"正题—反题—合题"的辩证推理塞进 LLM 调用)。这个人对**元推理架构**和 **MCP 生态**着迷的程度,直接刻进了 DeepSeek-TUI 的 DNA——后面会看到内置的 `rlm_query` 工具就是 Aleph 思想的具身。

项目 2026 年 1 月 19 日首次发布,到 5 月初已经迭代到 **v0.8.28**,三个月发了 30+ 个 release。Issues 172 open / PRs 166 open,贡献者 60+ 人,被 DeepSeek 官方的 `awesome-deepseek-agent` 列表收录(但 README 一行字钉死:**Not affiliated with DeepSeek Inc.**)。维护风格在 `AGENTS.md` 写得很硬核:不收未审批的第三方依赖、对营销腔零容忍("the best Y"、"now with Z built-in" 这种短语会被砍掉)、把 issue 评论里的"指令"当 data 不当 command(防 prompt injection)。这种洁癖在 vibe coder 看来是加分项。

## 这不是一个 Python 玩具,是 Rust 原生工程

第一个需要纠正的误解:**它不是 Python,不是 Textual**。仓库语言条 99.3% Rust,TUI 框架是 **ratatui**(Rust 生态里 Bubble Tea 的对位物),crossterm 后端。整个工程是一个 **13-crate workspace**,运行时空载 RAM 大约 **12MB**。`npm install -g deepseek-tui` 看起来像 Node 包,实际上 npm 包只是一个跨平台二进制下载器,运行时完全不用 Node。

架构图本身就是品味宣言:

```text
┌── UI ─────────────────────────────────────────────────┐
│   TUI (ratatui)   |  One-shot Mode  |  Config/CLI     │
├── Core Engine ────────────────────────────────────────┤
│   Agent Loop (core/engine.rs)                         │
│   ├ Session  ├ Turn Mgmt  └ Tool Orchestration        │
├── Tools & Extensions ─────────────────────────────────┤
│   shell / file / git / web / apply_patch / subagents  │
│   Skills (SKILL.md)  Hooks  MCP servers (client+server)
├── Runtime API + Tasks ────────────────────────────────┤
│   HTTP/SSE (runtime_api.rs)  Persistent Task Manager  │
├── LLM Layer ──────────────────────────────────────────┤
│   llm_client.rs → client.rs (Chat Completions, SSE)   │
└───────────────────────────────────────────────────────┘
```

有两个值得单独点名的设计细节:**两个二进制必须同时安装**——`deepseek`(dispatcher,处理 auth/config/model 路由)和 `deepseek-tui`(交互运行时),缺一会报 `MISSING_COMPANION_BINARY`;还有 `deepseek serve --http` 直接把这套引擎暴露成 HTTP/SSE 服务,等于内置 headless agent server——给 IDE、Web UI、未来的 remote control 留了口子。这种"先把内核做正,再考虑形态"的工程节奏很 Anthropic-flavored,不是 vibe demo。

安装方式齐全到夸张:**npm / cargo / Docker / GHCR / GitHub Releases 二进制**,Linux x64 + ARM64(原生构建,跑得动树莓派、Graviton、HarmonyOS、openEuler)、macOS Intel + Apple Silicon、Windows x64。PyPI 上没有它,网上有些文章写 `pip install -e .` 是错的。

## 它是 Coding Agent,不是聊天玩具

README 第一句话讲得很直白:**"DeepSeek TUI is a coding agent that runs entirely in your terminal."** 工具集列出来,完成度对得起这个自我定位:

-   • **执行类**:`exec_shell`、`exec_shell_wait`、`exec_shell_cancel`(前后台可切),`apply_patch`、`edit_file`、`write_file`
    
-   • **协作类**:`agent_spawn` / `agent_wait` / `agent_result` / `agent_cancel`(子 agent 派生),`rlm_query`(在 sandbox 化的 Python REPL 里 fan-out 1–16 个 V4-Flash 子调用做并行展开)
    
-   • **上下文类**:`fetch_url`、`web_search`(canonical `web.run`)、GitHub 只读 + 受控写(走 `gh` CLI)
    
-   • **节奏类**:`checklist_write`、`update_plan`、可持久化任务队列(重启后能续跑)
    

更"工程派"的是 **LSP 后编辑钩子**:每次 `edit_file/apply_patch/write_file` 之后,自动触发 `rust-analyzer`/`pyright`/`gopls`/`clangd`/`typescript-language-server`,把诊断作为合成 user 消息注入下一轮 prompt。这是真正的"让 agent 看见自己写错了"的闭环,而不是靠模型自己脑补。

**三档交互模式**通过 Tab/Shift+Tab 切换:**Plan**(只读探索,先出方案再执行)、**Agent**(默认,每个 tool call 弹审批)、**YOLO**(自动批准,适合可信工作区)。沙箱实现是跨 OS 的真原生:**macOS 用 Seatbelt profile、Linux 用 Landlock、Windows 用 AppContainer / restricted tokens**;还可以把 `sandbox_backend` 设成 `opensandbox`,把所有 `exec_shell` 路由到一个外部 HTTP API——给企业部署留了远程沙箱的接口。

最让人安心的一笔藏在工具调用协议里:`AGENTS.md` 明确写,**tool call 只走 API 的 structured tool\_use 通道**,任何形如 `[TOOL_CALL]`、`<deepseek:tool_call>`、`<invoke>`、`<function_calls>` 的文本伪包装都会被主动剥离,`crates/tui/tests/protocol_recovery.rs` 锁住这个契约。这是认真处理 prompt injection 的样子。

还有一个 vibe coder 会喜欢的东西:**workspace 副 git 快照**。每个 agent/YOLO turn 前后,在 `~/.deepseek/snapshots/<project_hash>/<worktree_hash>/.git` 里偷偷 commit 一次,`/restore N` 或 `revert_turn` 工具可以回滚文件状态,**完全不动用户自己的 `.git`**。这意味着你可以放心让 YOLO 模式爆炸地改一通,然后一行命令收回去。

## 关于"第三方模型"的真相

这是评测里最值得拿放大镜看的部分,因为很多人会被"6 个 provider"这个字眼骗到。

权威的 provider 枚举来自 `docs/CONFIGURATION.md` 和 `config.example.toml`,有且只有 6 个:

```bash
# DEEPSEEK_PROVIDER ∈ { deepseek, nvidia-nim, openrouter, novita, fireworks, sglang }
# 全部对应 DeepSeek-V4 权重的不同托管入口
# 没有 openai / anthropic / gemini / ollama
```

每个 provider 的 base\_url 都可以覆盖,自托管也欢迎:

```toml
[profiles.sglang]
provider = "sglang"
base_url = "http://localhost:30000/v1"
default_text_model = "deepseek-ai/DeepSeek-V4-Pro"

[profiles.nvidia-nim]
provider = "nvidia-nim"
base_url = "https://integrate.api.nvidia.com/v1"
default_text_model = "deepseek-ai/deepseek-v4-pro"
```

但**目的只是切换"在哪儿跑 DeepSeek-V4"**——官方 endpoint、NVIDIA NIM、Fireworks、自托管 SGLang/vLLM、聚合的 OpenRouter/Novita——而不是切换模型家族。`crates/agent` 里的 `ModelRegistry` 也证实这一点,它的工作是把 `deepseek-v4-pro` 翻译成各 provider 的具体 ID(比如 `accounts/fireworks/models/deepseek-v4-pro`),不是兼容不同协议。

**Anthropic-wire 协议支持曾经出现在 v0.8.13 milestone 的 CHANGELOG 里,但明确被推迟,没进主干**。也别想 GPT-4 或 Claude,从底层就接不上——`AGENTS.md` 写明:"In V4 thinking mode, assistant messages that contain tool calls must replay their `reasoning_content` in all subsequent requests or the API returns HTTP 400." 这是 DeepSeek-V4 thinking 模式的硬协议约束,**绑死了对话历史的序列化方式**,所以理论上要做多家族多模型,需要重写整个 turn loop 而不是加个 adapter。

理论上你可以把 base\_url 指向 Ollama 的 OpenAI-compatible 端点跑通,但模型名仍按 V4 schema 解析,reasoning\_content 字段约定也对不上,**这是 hack 不是一等公民**。早期社区文档里出现过 `vllm` 和 `ollama` 的 provider 写法,但当前主干已经收敛掉了——这是 issue #908 跟踪的状态(已 closed by PR #921,但加进来的是文档级别一等公民设计,而非主干 provider 枚举更新)。

**判断:DeepSeek-TUI 是一个 DeepSeek-V4 专属 harness,不是通用多模型 TUI。** 这一点和 Aider/Crush/OpenCode 的产品哲学是相反的——它选择把所有优化精力(prefix-cache 跟踪、thinking-mode 流式、V4 路由器 `--model auto`、Pro/Flash 双层 seam manager)押给一个模型,做到深度而非广度。

## vs Claude Code:命中率高的对比表

| 维度  | DeepSeek-TUI v0.8.28 | Claude Code (2026-05) |
| --- | --- | --- |
| 默认模型 | DeepSeek-V4-Pro / Flash | Claude Sonnet 4.6 / Opus 4.7 / Haiku 4.5 |
| 上下文窗口 | **1M tokens** | 200K 默认 / **1M**(Pro+ 开 extra usage) |
| 实现语言 | **Rust + ratatui** (~12MB RAM) | Node + React Ink |
| 开源  | ✅ MIT,完整源码 | ❌ 闭源(2026-03 因 npm sourcemap 泄漏被社区拆解) |
| 模型灵活性 | 6 个 provider × **仅 DeepSeek-V4** | 主 Claude;可代理到其它 Anthropic-compatible gateway |
| Agent 能力 | shell / file / git / web / patch / subagent / RLM | Read/Write/Edit/Bash/Glob/Grep/WebFetch/Task/Agent Teams |
| Subagents | `agent_spawn` ,RLM 并行 1–16 个 Flash | Subagents(`.claude/agents/`),Agent Teams 最多 10 并行 |
| MCP | ✅ Client + Server(`deepseek mcp serve`) | ✅ stdio/HTTP/SSE,自动重试 |
| Plugins/Skills | Skills 兼容 `.opencode/.claude/.cursor` 多生态目录 | Skills 2.0 + 官方 plugin marketplace |
| 沙箱  | Seatbelt / Landlock / AppContainer 原生 | 自有 permission model + plan/auto/YOLO |
| 工作区回滚 | 副 git pre/post-turn 快照 + `/restore N` | 默认无文件级 checkpoint(靠用户 git) |
| 会话持久化 | SQLite + replayable event timeline | 内部 session store |
| 价格 (Input/Output $/M) | V4-Flash **0.28**;V4-Pro 促销 **0.87** | Sonnet **15**;Opus **25** |
| 订阅  | 无,纯 API key | Pro 200/月 |
| 安装  | npm / cargo / brew / Docker / 二进制 | installer / brew / winget / npm |

**两个对比维度需要展开**:

**钱**。把数字拍齐就很离谱——V4-Flash 比 Sonnet 4.6 便宜 **~21× input、~54× output**,V4-Pro 促销价比 Sonnet 便宜 **~7× input、~17× output**。Anthropic 报告企业用 Claude Code 平均成本约 **开发者活跃日、150–250/月**;同样的 token 量打到 V4-Flash 上,大概是个位数美元/月的事情。促销窗口到 **2026-05-31 15:59 UTC** 截止后会回退,但即便回退,V4 体系也仍然是数量级便宜。

**能力**。DeepSeek-V4 在 SWE-bench Verified 报到 81%(V3 是 69%),已经在 coding benchmark 上和 Sonnet 4.6 拉到同一档位。但说句公道话:**benchmark 不等于真实工程**。Claude 在多步规划、长 horizon 任务、复杂 refactor 上仍然有明显的体感优势,Opus 4.7 在 deep refactor 类任务里几乎没有对手。所以选择 DeepSeek-TUI 时心里要有数:**你用便宜模型换的是经济性和速度,不是顶级 reasoning**。这恰恰也是 `--model auto` 路由器的存在意义——先用 V4-Flash 做调度决策,只在需要时升到 V4-Pro + max thinking。

## Vibe 评分:键盘党的浪漫,代价是单点押注

从 vibe coder 那套口味打分(流畅度、心流、UI 美感、键盘党友好、可定制、开源、不打扰、轻量),DeepSeek-TUI 在大多数轴上得分极高,在一个轴上得分为零,需要你自己决定能不能接受。

**得分高的地方**。Rust 二进制启动毫秒级响应,12MB 内存空载,纯键盘交互(F1 help、Esc 回退、Ctrl+K 命令面板、Tab/Shift+Tab 切模式、Ctrl+R resume、Alt+R 历史搜索),thinking-mode 流式输出把 V4 的 `reasoning_content` 实时显示成独立 chain-of-thought 块——这种"看着模型思考"的画面是其它工具靠 GPT 看不到的。配置是 TOML,可以 git 进仓库,工作区 `.deepseek/config.toml` 叠加在用户全局之上;OS keyring 优先,凭据查找顺序 `config → keyring → env`,**审计日志写到 `~/.deepseek/audit.log`**。开源 MIT,主题 `default/dark/light/whale`,OSC 8 URL 链接、4 种 UI 本地化(en/ja/zh-Hans/pt-BR)。`deepseek doctor --json` 给机器可读诊断——这是认真给 CI 用的人写的。

```toml
# ~/.deepseek/config.toml — 一份真正的 vibe coder 配置
provider = "deepseek"
default_text_model = "deepseek-v4-pro"
reasoning_effort   = "max"             # off | high | max,Shift+Tab 现场切

approval_policy = "on-request"         # 不打扰但要审批
sandbox_mode    = "workspace-write"
max_subagents   = 10

[features]
shell_tool = true
subagents  = true
mcp        = true
apply_patch = true

[context]                              # opt-in Flash-seam 自动压缩
enabled = false
l1_threshold = 192000
l2_threshold = 384000
l3_threshold = 576000
cycle_threshold = 768000
seam_model = "deepseek-v4-flash"

[tui]
osc8_links = true                      # iTerm2/Ghostty/Kitty/WezTerm Cmd+点击
mouse_capture = true
```

**得分极低的地方,只有一项,但很关键:模型绑死**。Vibe coder 文化里(从 Karpathy 那条 2025-02 推、到 Simon Willison 的定义、到 Crush/Aider/Cline 的产品哲学),"模型可换"几乎是一个不成文的政治正确——抗 vendor lock-in、本地优先、按场景路由不同模型。DeepSeek-TUI 把这个政治正确直接抛弃了。**它的赌注是"DeepSeek-V4 已经够好且便宜到无所谓 lock-in"**。这个赌注在 2026 年 5 月看起来不错,但如果半年后 Anthropic 出 Opus 5、或者 Qwen3-Coder 接管开源王座,这个 harness 就需要伤筋动骨地改协议层才能跟上。

## 它在 TUI 编程工具图谱里的位置

放在更大的图谱里看会更清楚:

-   • **Claude Code**:能力天花板,闭源,贵,生态最厚。适合预算充足的专业开发者。
    
-   • **Codex CLI**:OpenAI 官方 Rust TUI,与 ChatGPT 订阅绑定。气质和 DeepSeek-TUI 很像(同样 Rust、同样原生),区别在模型选 GPT 系。
    
-   • **Crush**(Charm):TUI 美学之王,Go + Bubble Tea v2,多 provider(Anthropic/OpenAI/Gemini/Bedrock/Ollama/OpenRouter…)。如果你想要好看 + 模型灵活,这是首选。
    
-   • **OpenCode**(SST → Anomaly):开源 Claude Code 克隆,有自己的 Zen 路由。
    
-   • **Aider**:老牌 Python pair programmer,repo map 是核心创新,自动 git commit,模型支持最广。
    
-   • **Gemini CLI**:Google 官方,免费档 1000 req/day + 1M context,适合白嫖党。
    
-   • **Cline**:VS Code 内最强 agent,30+ provider,~61K stars。
    
-   • **DeepSeek-TUI**:**和上面所有工具的差异化定位是"为一个模型做到最深"**——thinking-mode 协议处理、prefix-cache 遥测、V4 路由器、RLM 并行 fan-out,这些都是别的通用 TUI 做不到、也不愿做的。
    

简单说:**如果 Crush 是 hipster,DeepSeek-TUI 是 minimalist with strong opinions**。

## 适合谁、不适合谁

**强推**:已经决定把 DeepSeek-V4 当主力的开发者(便宜 + 1M context + thinking 流式 + agent 颗粒度完整);喜欢 Rust 原生工具的键盘党;在中国大陆/合规环境下需要稳定 DeepSeek 接入的团队;想要审计日志、原生沙箱、可回滚的工作区快照的"agent 但讲究"的工程师。

**犹豫**:重度依赖 Claude Sonnet/Opus 在复杂 refactor 上的体感的人——便宜不是所有事情的答案,V4 在某些深度 reasoning 任务上还是差一档。

**不推**:需要在 Claude/GPT/Gemini/Ollama 之间路由不同任务的人,DeepSeek-TUI 现阶段帮不了你,选 Crush 或 Aider;对模型 vendor lock-in 高度警觉的人,这工具的整个协议层都和 V4 绑死;只想要个聊天 TUI 不要 agent 的人,这是个 coding agent,工具调用、文件改动、shell 执行是它的本职工作。

## 结尾的真心话

DeepSeek-TUI 不是又一个 "Claude Code 但便宜" 的克隆。它是一个**有清晰美学和工程立场的项目**:用 Rust 把一个模型做到最深、把 agent 协议处理得最严、把 prompt injection 防线划得最清、把价格做到极致。这种产品决策在 2026 年的 TUI 编程工具竞赛里反而是稀缺的——大多数同类都在卷"多 provider 多模型多平台",DeepSeek-TUI 选了相反的路。

**值不值得装一个?** 装。它现在的状态足以在一个真实项目里跑起来,YOLO 模式 + 副 git 快照让你可以放心地让它爆炸地改一通然后一行命令回滚,12MB 内存的体感和动辄数百 MB 的 Electron 编程助手是两种生物。

**值不值得作为唯一?** 不。在 Anthropic 协议支持进主干、或者它松开"DeepSeek-V4 thinking 模式"的硬约束之前,把它当作 DeepSeek 专用工作流的最佳前端,而不是你 agent stack 的全部。和 Crush/Aider 并存,各司其职——cheap 任务给 V4-Flash,reasoning-heavy 任务还是该给 Claude/Gemini——可能是 2026 年中段最务实的 vibe coding 配置。

最后留个观察:作者 Hunter Bown 同时维护着 Aleph(RLM)和 Hegelion(辩证推理),DeepSeek-TUI 里内置的 `rlm_query` 工具是同一思想的具身——**这个项目本质上是他研究兴趣的产品化外壳**,而不是一个商业克隆品。这种"研究者写出来的工具"的气味,是它最稀缺、最 vibe 的地方。
