---
title: Hermes Agent：Nous Research 打造的自我进化 AI 智能体
date: 2026-04-13
badge: AI
tags: ["AI", "Agent", "LLM", "OpenClaw"]
draft: false
---

Hermes Agent 是由 Nous Research 开发的开源自主 AI 智能体平台，其核心卖点是**内置学习闭环**——它能从经验中创建技能、在使用中自我改进、主动持久化知识、搜索自身历史对话，并跨会话构建对用户的深度理解模型。项目于 2026 年 2 月启动，仅 6 周内从内部原型发展到 **27,000+ GitHub Star** 的完整平台，当前版本 v0.8.0（2026年4月8日发布）。它不是绑定在编辑器或终端里的临时工具，而是一个**常驻基础设施**上的持久化个人智能体——可运行在 $5 的 VPS、GPU 集群或无服务器环境上，通过 Telegram、Discord、Slack 等 15+ 平台与你沟通。

---

## 从"会话工具"到"常驻智能体"的范式跃迁

当前 AI 智能体生态正在分化为两个物种：一种存活在终端或 IDE 中，打开即用、关闭即逝（如 Claude Code、Cursor）；另一种**永久驻留在你的基础设施上**，在你睡觉时继续工作。Hermes Agent 属于后者。

它解决的核心问题是传统 AI 助手的三大局限：**无跨会话记忆**（每次对话从零开始）、**无技能积累**（重复解决相同问题）、**无主动性**（只能被动响应）。Hermes Agent 通过四层记忆系统、自动技能生成、定时任务调度和多平台消息网关，将 AI 助手从"工具"升级为"伙伴"。

适用场景包括：个人开发助手（跨项目持久记忆）、DevOps 自动化（定时报告与监控）、研究助手（跨论文搜索与总结）、团队协作代理（通过消息平台统一入口）、以及 **RL 训练基础设施**（为下一代工具调用模型生成训练轨迹）。

---

## 三层架构与核心代理循环

Hermes Agent 采用清晰的**三层架构**，将用户接口、核心智能体逻辑和执行后端分离。

### 第一层：入口层（Entry Points）

系统提供 6 种入口方式，所有入口共用同一个核心 `AIAgent` 类：

- **CLI**（`cli.py`，约 8,500 行）：基于 `prompt_toolkit` 的全功能 TUI，支持多行编辑、斜杠命令自动补全、对话历史、中断重定向和流式工具输出
- **消息网关**（`gateway/run.py`，约 7,500 行）：长运行进程，支持 **15+ 平台适配器**（Telegram、Discord、Slack、WhatsApp、Signal、Matrix、Email、Home Assistant 等）
- **ACP 适配器**（`acp_adapter/`）：通过 stdio/JSON-RPC 为 VS Code、Zed、JetBrains 提供编辑器原生智能体
- **API 服务器**：HTTP 程序化访问，支持 Open WebUI 集成
- **批量运行器**（`batch_runner.py`）：用于 RL 训练的轨迹批量生成
- **Python 库**：直接 `import AIAgent` 嵌入到自定义应用中
    

### 第二层：核心智能体（Core Agent）

中央编排引擎是 `run_agent.py` 中的 **`AIAgent` 类**（约 9,200 行），其核心对话循环如下：

```python
# 简化的核心循环逻辑
while api_call_count < self.max_iterations and self.iteration_budget.remaining > 0:
    response = client.chat.completions.create(
        model=model, messages=messages, tools=tool_schemas
    )
    if response.tool_calls:
        for tool_call in response.tool_calls:
            result = handle_function_call(tool_call.name, tool_call.args, task_id)
            messages.append(tool_result_message(result))
        api_call_count += 1
    else:
        return response.content  # 无工具调用时返回最终响应
```

系统支持**三种 API 模式**：`chat_completions`（OpenAI 兼容，默认）、`codex_responses`（OpenAI Codex Responses API）、`anthropic_messages`（原生 Anthropic Messages API）。消息格式遵循 OpenAI 标准 `{"role": "system/user/assistant/tool", ...}`，推理内容存储在 `assistant_msg["reasoning"]` 中。

CLI 和网关的关键架构差异在于：**CLI 维持一个持久 AIAgent 实例**；而**网关为每条传入消息创建新的 AIAgent 实例**，通过从 SQLite `state.db` 加载/保存对话历史实现持久化。

### 第三层：执行后端（Execution Backends）

- **终端后端**（6 种）：Local、Docker、SSH、Daytona（无服务器持久化）、Modal（原生 SDK）、Singularity（HPC）
- **浏览器后端**（5 种）：包括 Camoufox 反检测浏览器
- **MCP 动态工具服务器**：支持 stdio 和 HTTP 传输
    

---

## Python 生态为主的技术栈

Hermes Agent 的技术选型体现了现代 Python 工程的最佳实践：

| 组件  | 技术选型 |
| --- | --- |
| 主语言 | **Python 3.11+** |
| 包管理 | **uv**（Astral 出品，替代 pip/poetry） |
| 数据库 | **SQLite**（WAL 模式 + FTS5 全文搜索） |
| CLI 框架 | **Rich**（面板/横幅）+ **prompt_toolkit**（交互输入） |
| API 客户端 | **openai ≥2.21**、**anthropic ≥0.39**、**httpx** |
| 数据验证 | **Pydantic ≥2.12** |
| 配置解析 | **PyYAML** |
| 模板引擎 | **Jinja2** |
| 重试逻辑 | **tenacity** |
| Web 工具 | **exa-py**（搜索）、**firecrawl-py**（抓取）、**parallel-web** |
| 文档系统 | **Docusaurus**（`website/` 目录） |
| 测试框架 | **Pytest**（3,289+ 测试） |
| 可选依赖 | Node.js（浏览器工具/WhatsApp 适配器） |

依赖通过 `pyproject.toml` 管理，提供 `[all]`、`[messaging]`、`[tts-premium]`、`[voice]`、`[dev]` 等可选依赖组。入口点注册为 `hermes = hermes_cli.main:main`。

---

## 四层记忆系统与自我进化的技能机制

Hermes Agent 最具差异化的能力来自其**四层记忆架构**和**自动技能生成机制**。

### 记忆层级

**第一层：提示词记忆（Prompt Memory）**。`MEMORY.md`（约 2,200 字符）存储持久事实（环境、项目惯例、变通方案），`USER.md`（约 1,375 字符）存储用户画像（偏好、沟通风格）。两者在会话启动时作为冻结快照注入系统提示词。条目以 `§` 分隔，由 `MemoryStore` 类管理，内置安全检测（防后门注入、零宽 Unicode 字符）。

**第二层：会话档案（Session Archive）**。SQLite 数据库 `~/.hermes/state.db` 使用 WAL 模式支持并发访问，**FTS5 全文搜索**跨所有消息内容。支持会话谱系追踪（压缩前后的父子关系），自定义重试机制防止写入竞争。

**第三层：技能（Procedural Memory）**。这是 Hermes 的核心创新——**技能是从经验中自动创建的可复用 Markdown 文档**。当智能体完成复杂任务（5+ 工具调用、错误恢复、用户纠正）后，自动通过 `skill_manage` 工具创建技能文件。技能遵循**渐进式披露模式**：默认只在系统提示词中包含名称和摘要，完整内容按需加载以最小化 token 消耗。技能兼容 `agentskills.io` 开放标准，可跨 Hermes、Claude Code、Cursor、Codex 共享。

**第四层：外部记忆提供者（可选）**。8 个可插拔提供者——Honcho、OpenViking、Mem0、Hindsight、Holographic、RetainDB、ByteRover、Supermemory。激活后自动注入上下文到提示词、在每轮前预取相关记忆、在会话结束时提取记忆。

### 48+ 工具与工具集系统

工具系统采用**自注册模式**：每个工具文件在导入时通过 `tools/registry.py` 的 `register()` 函数注册，`model_tools.py` 的 `_discover_tools()` 触发发现。当前注册 **48+ 工具，组织为 20+ 工具集**（web、terminal、file、browser、vision、delegation、code_execution、mcp 等）。

关键工具包括：`delegate_task`（子代理委托，最多 3 个并发、深度限制 2）、`execute_code`（Python 沙箱，JSON-RPC 通信，300 秒超时）、`session_search`（FTS5 全文搜索历史会话）、11 个浏览器自动化工具、以及通过 MCP 动态注册的外部工具。

### MCP 集成（约 2,200 行）

MCP（Model Context Protocol）客户端是 Hermes 的重要扩展点，配置示例：

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "ghp_xxx"
    tools:
      include: [create_issue, list_issues, search_code]
```

支持 stdio 和 HTTP 两种传输协议，自动工具发现与注册，MCP OAuth 2.1 PKCE 认证，OSV 恶意软件扫描，以及 Hermes 反向暴露为 MCP 服务器（供其他智能体调用）。

---

## 模型无关但与 Hermes 生态深度协同

**Hermes Agent 明确不绑定任何特定模型**——这是其核心设计原则之一。通过 `hermes model` 命令可以零代码切换 **18+ 推理提供者**：OpenRouter（200+ 模型）、Nous Portal（400+ 模型）、OpenAI、Anthropic、Hugging Face、DeepSeek、xAI、Ollama 等。

但它与 Nous Research 的 Hermes 模型系列有天然的协同关系。**Nous Portal** 是 Nous Research 自己的推理 API（portal.nousresearch.com），支持 Hermes-4-70B、Hermes-4-405B、Hermes 3 405B、DeepHermes-3 8B 等模型，新用户获得 $5 免费额度。v0.8.0 还将 Xiaomi MiMo v2 Pro 作为免费层辅助模型。

更深层的协同在于 **Atropos RL 训练管线**。Hermes Agent 同时是个人助手和**研究基础设施**——它可以批量生成代理轨迹（ShareGPT 格式），通过 GRPO（Group Relative Policy Optimization）配合 LoRA 适配器训练下一代工具调用模型。三组件架构包括：Atropos（轨迹 API 服务器）、Tinker（训练服务处理模型权重）、Environments（定义任务和奖励函数）。这意味着 Hermes Agent 的使用数据可以直接反哺 Hermes 模型系列的迭代。

此外，独立项目 **hermes-agent-self-evolution** 使用 DSPy 和 GEPA（Genetic Evolution of Prompt Architectures）对 Hermes 的提示词、技能和代码进行进化优化，这是一篇 ICLR 2026 Oral 论文的研究成果。

---

## 代码结构：模块化但高度内聚

```text
hermes-agent/
├── run_agent.py              # AIAgent 核心对话循环 (~9,200 行)
├── cli.py                    # HermesCLI 交互式终端 (~8,500 行)
├── model_tools.py            # 工具发现、Schema 收集、调度分派
├── toolsets.py               # 工具集分组与平台预设
├── hermes_state.py           # SQLite 会话存储 (FTS5)
├── hermes_constants.py       # 路径常量 (HERMES_HOME)
├── batch_runner.py           # 批量轨迹生成
│
├── agent/                    # 智能体内部模块
│   ├── prompt_builder.py     # 系统提示词组装 (SOUL.md + 记忆 + 技能 + 上下文)
│   ├── context_compressor.py # 对话压缩算法
│   ├── auxiliary_client.py   # 辅助 LLM (视觉/摘要/压缩)
│   ├── memory_manager.py     # 记忆管理编排
│   └── subdirectory_hints.py # 渐进式子目录发现
│
├── hermes_cli/               # CLI 子命令
│   ├── main.py               # 入口点 (~5,500 行)
│   ├── runtime_provider.py   # 提供者→API模式+凭据 路由
│   ├── setup.py              # 交互式设置向导 (~3,100 行)
│   ├── skin_engine.py        # CLI 主题引擎 (7 内置皮肤)
│   └── commands.py           # 斜杠命令注册表
│
├── tools/                    # 工具实现 (48+ 工具)
│   ├── registry.py           # 中央注册表 (无依赖)
│   ├── delegate_tool.py      # 子代理委托
│   ├── mcp_tool.py           # MCP 客户端 (~2,200 行)
│   ├── terminal_tool.py      # 终端编排
│   ├── file_tools.py         # 文件操作
│   ├── browser_tool.py       # 浏览器自动化 (11 工具)
│   └── environments/         # 6 种终端后端
│
├── gateway/                  # 消息网关
│   ├── run.py                # GatewayRunner (~7,500 行)
│   ├── session.py            # 会话持久化
│   └── platforms/            # 15+ 平台适配器
│
├── cron/                     # 定时调度
├── acp_adapter/              # 编辑器集成 (ACP)
├── plugins/memory/           # 记忆提供者插件
├── environments/             # RL 训练环境
├── skills/                   # 内置技能
├── optional-skills/          # 可选技能
└── tests/                    # Pytest (~3,289 测试)
```

文件依赖链清晰：`tools/registry.py`（零依赖）→ `tools/*.py`（导入时自注册）→ `model_tools.py`（触发发现）→ `run_agent.py`/`cli.py`/`batch_runner.py`。

---

## 两分钟快速上手

**安装**（Linux/macOS/WSL2，无需前置依赖）：

```bash
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
```

安装脚本自动处理 Python、Node.js、所有依赖和 `hermes` 命令注册。

**配置与首次运行**：

```bash
hermes setup                          # 交互式设置向导（模型、终端、网关）
hermes chat                           # 启动交互式对话
hermes chat -q "总结最近的 PR"          # 一次性查询
hermes chat --model anthropic/claude-sonnet-4.6  # 指定模型
hermes chat --toolsets web,terminal    # 选择工具集
hermes -c                             # 恢复上次会话
hermes -p work                        # 使用 "work" 配置文件
```

**开发者安装**：

```bash
git clone https://github.com/NousResearch/hermes-agent.git
cd hermes-agent
curl -LsSf https://astral.sh/uv/install.sh | sh
uv venv venv --python 3.11
source venv/bin/activate
uv pip install -e ".[all,dev]"
```

核心配置文件位于 `~/.hermes/config.yaml`（Schema 版本 10），支持环境变量替换 `${VAR_NAME}`。关键配置项包括模型/提供者选择、终端后端类型、压缩策略、记忆限制、委托子代理参数、MCP 服务器列表等。API 密钥存储在 `~/.hermes/.env` 中。

消息网关通过 `hermes gateway run` 启动，支持 systemd 服务安装（`hermes gateway install`）。定时任务通过 `hermes cron create "every 1h" "检查邮件并总结"` 配置。

---

## 与主流智能体框架的关键差异

Hermes Agent 的定位在智能体生态中独树一帜——它**既不是框架也不是库**，而是一个**完整的、可部署的智能体应用**。

与 **LangChain** 相比，LangChain 是构建自定义 LLM 管线的模块化工具箱，提供对每个提示词和链的细粒度控制，但一个基础 RAG 聊天机器人就需要 100-500+ 行代码。Hermes 是开箱即用的完整智能体，自带记忆、技能和消息网关。

与 **AutoGPT** 相比，AutoGPT 专注于自主任务分解和 Web 交互。Hermes 专注于跨会话记忆和技能积累。官方文档称两者是"互补的方法"。

与 **Claude Code** 相比，Claude Code 是出色的会话内编码智能体，但本质上是会话绑定的。Hermes 是常驻服务器的持久化智能体，跨会话记忆和多平台可达。值得注意的是，Hermes 可以**将 Claude Code 作为子代理调用**，结合两者优势。

与 **OpenAI Codex CLI** 相比，Codex CLI 有优秀的 token 效率和内核级沙箱，但记忆仅基于会话历史而非活的知识图谱。Hermes 在此基础上增加了始终在线的编排层，且可导入 Codex CLI 凭据。

最直接的竞争对手是 **OpenClaw**（原 Clawdbot，345,000+ Star）——同为"持久化个人智能体"赛道，但 OpenClaw 基于 TypeScript、拥有更大社区（5,700+ 技能），Hermes 则在**自我改进技能、RL 训练集成、终端后端多样性**（6 种 vs OpenClaw 的 2 种）上占优。Hermes 内置 `hermes claw migrate` 迁移工具，战略性地在 OpenClaw 披露 9 个 CVE 时发布。

---

## 六周内从内部原型到 27,000 Star 的爆发式增长

Hermes Agent 展现了 2026 年开源 AI 项目前所未有的发展速度。项目于 **2026 年 2 月**作为 Nous Research 内部项目启动，v0.1.0 是未公开的初始基础。首个公开版本 v0.2.0（2026年3月12日）即包含 **216 个合并 PR、63 位贡献者、119 个已解决 Issue**。此后以近乎每周一个大版本的节奏迭代：

v0.2.0 至 v0.8.0 的 8 个大版本在约 6 周内发布，项目当前拥有 **27,000+ Star、3,500+ Fork、242+ 贡献者**。核心开发者 **@teknium1** 在单个版本周期内提交了 157 个 PR。社区生态包括 awesome-hermes-agent（资源列表）、autonovel（自主小说写作管线，100k+ 字）、hermes-workspace（Web 界面，500+ Star）、mission-control（编排仪表板，3,700+ Star）等。

项目采用 **MIT 许可证**，活跃的 Discord 社区用于 Bug 报告和功能讨论。Skills Hub（agentskills.io）提供跨智能体技能市场。从发展轨迹看，Hermes Agent 正在快速成为"常驻式 AI 智能体"赛道的领先选手，其自我进化机制和 RL 训练集成为开源智能体开发提供了独特的研究价值。

## 结语：为什么 Hermes Agent 值得关注

Hermes Agent 的核心创新不在于某个单一功能，而在于它**将持久记忆、程序化技能、多平台可达性和 RL 训练基础设施整合为一个内聚的系统**。大多数智能体框架要么是开发者工具箱（LangChain），要么是会话内助手（Claude Code），要么是自主执行器（AutoGPT）。Hermes Agent 是第一个将"**智能体即长期运行的服务**"理念完整落地的开源实现——它在你不使用时休眠，在你需要时通过任何消息平台唤醒，并且每次交互都让它变得更聪明。对于研究者而言，其 Atropos RL 管线和 GEPA 进化优化提供了从"使用智能体"到"训练更好智能体"的完整闭环。
