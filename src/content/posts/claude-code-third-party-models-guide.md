---
title: Claude Code 接入第三方模型完全指南
date: 2026-03-15
badge: AI
tags: ["AI", "Claude Code", "LLM"]
draft: false
---

**Claude Code 支持通过修改 API 端点来使用 DeepSeek、MiniMax、通义千问、智谱 GLM 等第三方模型，费用可低至原生 Claude 的 1/10 到 1/65，但会丧失工具调用、扩展思考、提示缓存等核心能力。** 对于预算有限或位于中国大陆的开发者，第三方模型是可行的替代方案；但对于需要完整 agentic 编码体验的用户，原生 Claude 订阅（Pro $20/月或 Max $100-200/月）仍是最优选择。Claude Code 的提示词、工具定义和 Agent 编排均为 Claude 模型深度定制，第三方模型在工具调用环节表现明显退化。

---

## 第三方模型接入的三条技术路径

Claude Code 原生使用 Anthropic Messages API 格式，**不支持** OpenAI 兼容 API。接入第三方模型主要有三种方式：

**路径一：直连 Anthropic 兼容端点。** DeepSeek、MiniMax、通义千问（阿里百炼）、智谱 GLM、Kimi 等国产模型厂商已先后推出 Anthropic API 兼容端点，只需设置环境变量即可直连，无需中间件。这是最稳定、最推荐的方式。

**路径二：通过代理/路由转发。** 对于仅提供 OpenAI 兼容 API 的服务商（如 Google Gemini、OpenAI GPT），需要使用 Claude Code Router（GitHub **2.6 万+ star**）、LiteLLM、Claude Bridge 等工具做 API 格式转换。OpenRouter 同时支持 Anthropic API 格式，可一站式接入 400+ 模型。

**路径三：Ollama 本地模型。** 自 Ollama v0.14.0（2026 年 1 月）起原生支持 Anthropic Messages API，可将 Claude Code 连接到 qwen3-coder、devstral 等本地开源模型，最低推荐 **32K-64K** 上下文窗口。

### 核心环境变量速查表

| 环境变量 | 用途 |
|---------|------|
| `ANTHROPIC_BASE_URL` | 覆盖 API 端点 URL（默认为 Anthropic 官方） |
| `ANTHROPIC_AUTH_TOKEN` | 第三方服务商的 API Key |
| `ANTHROPIC_MODEL` | 默认使用的模型名称 |
| `ANTHROPIC_SMALL_FAST_MODEL` | 轻量/快速任务使用的模型 |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | 映射到 Opus 别名的模型 |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | 映射到 Sonnet 别名的模型 |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | 映射到 Haiku 别名的模型 |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | 设为 `1` 禁止向 Anthropic 发送遥测 |
| `API_TIMEOUT_MS` | 超时时间，第三方建议 **600000-3000000** |

配置优先级从高到低为：会话内 `/model` 命令 → CLI `--model` 参数 → 环境变量 → `~/.claude/settings.json` → 运行时默认值。

### 各服务商配置实例

**DeepSeek（V3/V3.2/R1）** — 官方提供 Anthropic 兼容端点：

```bash
export ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic
export ANTHROPIC_AUTH_TOKEN=${DEEPSEEK_API_KEY}
export ANTHROPIC_MODEL=deepseek-chat          # 非推理模式
# export ANTHROPIC_MODEL=deepseek-reasoner    # 推理模式
export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1
export API_TIMEOUT_MS=600000
```

**MiniMax（M2.5）** — 国际与国内端点分离：

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.minimax.io/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "<MINIMAX_API_KEY>",
    "ANTHROPIC_MODEL": "MiniMax-M2.5",
    "ANTHROPIC_SMALL_FAST_MODEL": "MiniMax-M2.5",
    "API_TIMEOUT_MS": "3000000",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": 1
  }
}
```

国内用户使用 `https://api.minimaxi.com/anthropic` 端点。

**通义千问（Qwen3-Coder）** — 通过阿里百炼接入：

```bash
export ANTHROPIC_BASE_URL=https://dashscope.aliyuncs.com/apps/anthropic
export ANTHROPIC_AUTH_TOKEN=${DASHSCOPE_API_KEY}
export ANTHROPIC_MODEL=qwen3-coder-plus
```

魔搭（ModelScope）提供 **每日 2000 次免费调用**，接入地址为 `https://api-inference.modelscope.cn`。

**智谱 GLM** — 提供一键配置脚本：

```bash
curl -fsSL "https://cdn.bigmodel.cn/install/claude_code_env.sh" | bash
```

手动配置时，国内端点为 `https://open.bigmodel.cn/api/anthropic`，国际端点为 `https://api.z.ai/api/anthropic`。

---

## cc-switch：可视化模型管理工具

**cc-switch 是一款基于 Tauri 2.0 构建的跨平台桌面应用**，解决了开发者在多个 API 服务商之间手动编辑配置文件的痛点。它不仅支持 Claude Code，还覆盖 Codex、Gemini CLI、OpenCode、OpenClaw 共 **5 款 AI 编码工具**。

- **GitHub 地址**：https://github.com/farion1231/cc-switch
- **最新版本**：v3.12.2（2026 年 3 月）
- **GitHub Stars**：**约 2.5 万+**，是该领域最热门的工具
- **技术栈**：Rust 后端 + React 18 + TypeScript 前端
- **许可证**：MIT

### 安装方式

macOS 用户可通过 Homebrew 安装：
```bash
brew tap farion1231/ccswitch
brew install --cask cc-switch
```

也可从 GitHub Releases 页面直接下载 `.msi`（Windows）、`.dmg`（macOS）、`.deb`/`.AppImage`（Linux）安装包。Arch Linux 用户可通过 AUR 安装：`paru -S cc-switch-bin`。

### 核心功能

cc-switch 提供 **GUI 可视化界面**，核心功能包括：一键切换 API 服务商、API 端点速度测试、WebDAV 云端配置同步、MCP Server 统一管理、CLAUDE.md/AGENTS.md 提示词编辑、会话历史浏览器、技能（Skills）自动扫描安装，以及内置本地代理。它预置了 **20+ 个服务商模板**，涵盖 Anthropic、DeepSeek、GLM、Kimi、MiniMax、SiliconFlow 等。模型配置支持 4 层映射（Haiku/Sonnet/Opus/自定义），可同时管理 Anthropic Messages API 和 OpenAI Chat Completions 两种格式。

### CLI 版本和替代工具

除桌面版外，cc-switch 生态还包括：**SaladDay/cc-switch-cli**（Rust 命令行版本，与桌面版 WebDAV 同步兼容）和 **HoBeedzc/cc-switch**（npm 包 `@hobeeliu/cc-switch`，纯终端操作）。其他替代工具包括 **CCS（Claude Code Switch）**、**claude-code-switch（ccm）** 和 **Claude Code Router（CCR）**。

---

## 模型编码能力与实测对比

### 基准测试横评

**SWE-bench Verified**（真实 GitHub Issue 解决能力，业界金标准）是评估编码模型最具参考价值的指标：

| 模型 | SWE-bench 得分 | HumanEval | 上下文窗口 | API 价格（输入/输出，每百万 token） |
|------|--------------|-----------|-----------|-------------------------------|
| Claude Opus 4.5/4.6 | **80.9%** | 91% | 200K（1M beta） | $5.00 / $25.00 |
| MiniMax M2.5 | **80.2%** | 89.6% | 205K | $0.27 / $0.95 |
| DeepSeek V3.2 | 67.8% | ~90% | 128K | $0.28 / $0.42 |
| Qwen3-Coder | 69.6% | — | 128K+ | 阶梯定价，极低 |
| Claude Sonnet 4.5/4.6 | 66-69% | 87% | 200K | $3.00 / $15.00 |
| Gemini 2.5 Pro | ~59% | 91% | **1M** | $1.25 / $10.00 |
| GPT-4o | ~49% | 90.2% | 128K | $2.50 / $10.00 |

**MiniMax M2.5 是首个在 SWE-bench 上追平 Claude Opus 的开源模型**，得分达 80.2%，且价格仅为 Opus 的 **1/26**。DeepSeek V3.2 在性价比上最为突出——SWE-bench 得分 67.8%（接近 Sonnet 水平），但输出价格仅为 Sonnet 的 **1/36**。

### 中文编码支持

DeepSeek V3.2 在中文 SimpleQA 上超越了 GPT-4o 和 Claude，是 **中文场景下最强的编码模型**。Qwen 系列由阿里巴巴训练，天然双语（中英文），拥有大量中文编码训练数据。智谱 GLM 系列同样对中文有出色支持。相比之下，Claude 和 GPT 的中文编码能力虽然可用，但并非为中文场景专门优化。

### 响应速度

GPT-4o 约 **45 tokens/秒**，首 token 延迟约 0.8 秒，是主流模型中最快的。MiniMax M2.5 比前代快 **37%**，与 Claude Opus 4.6 速度相当。DeepSeek V3.1 之后速度大幅改善。Claude 模型响应速度中等，但订阅额度才是实际使用中更大的瓶颈。最快的模型为 Mercury 2（765 tok/s）和 Gemini 2.5 Flash-Lite（0.36 秒延迟）。

---

## 费用对比与成本估算

### 每百万 token 定价一览

| 服务商 | 经济型模型 | 中端模型 | 旗舰模型 |
|--------|----------|---------|---------|
| **DeepSeek** | V3.2: $0.28 / $0.42 | — | V3.2 Reasoner: $0.28 / $0.42 |
| **MiniMax** | M2.5: $0.27 / $0.95 | M1: $0.40 / $1.76 | — |
| **Qwen** | Flash: ~$0.02 / $0.10 | Plus: $0.40 / $1.20 | Qwen3 Max: $1.20 / $6.00 |
| **Gemini** | 2.5 Flash-Lite: $0.10 / $0.40 | 2.5 Pro: $1.25 / $10.00 | 3.1 Pro: $2.00 / $12.00 |
| **OpenAI** | GPT-4.1 Nano: $0.13 / $0.52 | GPT-4.1: $2.60 / $10.40 | GPT-5.2: $1.75 / $14.00 |
| **Anthropic** | Haiku 4.5: $1.00 / $5.00 | Sonnet 4.5: $3.00 / $15.00 | Opus 4.5: $5.00 / $25.00 |

DeepSeek 缓存命中时输入价格低至 **$0.028/百万 token**，可节省高达 90% 的输入成本。

### Claude Code 订阅方案

| 方案 | 月费 | 额度 | 可用模型 |
|------|-----|------|---------|
| Pro | $20 | ~45 条/5 小时窗口 | Sonnet |
| Max 5x | $100 | ~225 条/5 小时窗口 | Sonnet + Opus |
| Max 20x | $200 | ~900 条/5 小时窗口 | 完整 Opus 访问 |

### 实际使用成本估算

Anthropic 官方数据显示，Claude Code 平均消耗约 **$6/开发者/天**，90 分位在 $12 以下。一位重度用户 8 个月的追踪数据显示：API 等价成本超过 **$15,000**，但 Max 计划实付仅约 **$800**，节省率达 **93%**。以每月 200M token 的中等使用强度估算：

| 方案 | 预估月费 |
|------|---------|
| DeepSeek V3.2 API | **$60-80** |
| MiniMax M2.5 API | ~$140 |
| Claude Max 5x 订阅 | **$100**（固定） |
| Claude Sonnet API | $400-600 |
| GPT-4.1 API | $500-600 |

**关键发现**：对于中重度用户，Claude Max 订阅（$100-200/月）的性价比远超 API 按量付费。但对于轻度用户或预算极其有限的场景，DeepSeek API 的绝对成本最低。

---

## 原生 Claude 与第三方模型的核心差异

### 功能退化是最大问题

Claude Code 的提示词、工具定义和 Agent 编排均为 Claude 模型 **深度定制**。正如 Hacker News 上一位开发者所言：「Claude Code 好用的原因是 Anthropic 深谙 Claude Sonnet 的能力，只需为自家模型定制提示词，还能反过来训练模型适配特定工具。」使用第三方模型时，这种模型-工具的深度耦合被打破，导致显著的功能退化：

| 功能 | 原生 Claude | 第三方模型 |
|------|-----------|----------|
| 工具调用（文件编辑、Bash 命令） | 完全优化，模型专门训练 | **严重退化**——多数模型无法正确使用 CC 的工具格式 |
| 扩展思考/自适应思考 | 完整支持，支持 "think"/"ultrathink" 关键词 | **不可用**——Claude 专属 API 功能 |
| 提示缓存 | 原生支持，缓存读取不计入速率限制 | **不可用** |
| 1M 上下文窗口 | Opus/Sonnet 4.6 通过 [1m] 后缀启用 | **不可用** |
| 子代理委派 | 完整功能 | 退化（依赖工具调用质量） |
| MCP 集成 | 完整支持 | 部分可用（需可靠的工具调用） |
| 服务器工具（Web 搜索/获取） | Anthropic 服务端基础设施 | **不可用** |
| 程序化工具调用 | Claude 编写 Python 编排工具，减少上下文污染 | **不可用** |
| Computer Use | Anthropic 定义的内置工具 | **不可用** |

**实际体验**：多位开发者测试发现，GPT-5 在 Claude Code 中「无法正确使用工具」，Grok 在函数调用中「生成空格和换行直到达到最大 token 数」。中国开发者社区的共识是：即使第三方模型（如 GLM-4.7）在自家 CLI 中表现一般，放入 Claude Code 后表现会 **明显提升**——这归功于 Claude Code 卓越的上下文工程，但工具调用方面仍无法与原生 Claude 相比。

### 稳定性与可用性

原生 Claude 的稳定性由 Anthropic 官方保障，支持通过 AWS Bedrock 和 Google Vertex AI 做多供应商容灾。第三方模型的常见问题包括：DeepSeek 的 **API Error 422**（涉及代码文件的对话 JSON 反序列化错误）、超时问题（需将 `API_TIMEOUT_MS` 调高到 60-300 万毫秒）、中间件代理引入的额外故障点。中国开发者社区的经验是：「能少用一个中间件，就少用一个中间件」——优先选择直连 Anthropic 兼容端点。

### 中国大陆用户的特殊处境

Anthropic 自 2025 年 9 月起明确禁止「中国控制的公司」使用 Claude 服务，直接从中国大陆访问会返回 **400 错误**，即使通过 Bedrock 中国区域（cn-northwest-1）也无法使用 Claude 模型。这使得第三方模型对中国开发者而言不仅是「省钱方案」，更是 **唯一可行路径**。智谱 GLM、MiniMax、DeepSeek、Qwen 和 Kimi 均提供国内直连端点，是中国开发者使用 Claude Code 框架的核心依赖。

---

## 最优策略取决于你的使用场景

**对于追求最佳编码体验的专业开发者**，Claude Max 20x（$200/月）提供最高的综合价值——完整的工具调用、扩展思考、1M 上下文窗口以及远低于 API 的等效成本。一位重度用户 8 个月节省了超过 $14,000。

**对于预算敏感的开发者**，混合策略最为高效：将 DeepSeek V3.2 或 MiniMax M2.5 用于日常编码和原型开发（月费 $60-140），将 Claude Pro（$20/月）用于需要深度推理的复杂架构决策。中国开发者社区的最佳实践正是这种「双轨策略」。

**对于中国大陆开发者**，cc-switch + 国产模型 Anthropic 兼容端点是当前最成熟的方案。DeepSeek 在编码质量上领先（中国模型中 SWE-bench 最高分），Qwen 通过魔搭提供每日 2000 次免费调用，智谱 GLM 提供一键配置脚本。MiniMax M2.5 以 80.2% 的 SWE-bench 得分成为性价比最高的选项，编码能力接近 Claude Opus，价格仅为其 4%。

需要注意的关键事实是：**Claude Code 不仅仅是一个聊天界面，它是一个深度耦合的 Agent 系统**。其价值的很大一部分来自模型与工具的协同优化——这在使用第三方模型时会不可避免地打折扣。选择第三方模型本质上是在用「编码助手」的完整性换取成本和可及性的优势，这个取舍是否值得，取决于你的具体需求和约束条件。