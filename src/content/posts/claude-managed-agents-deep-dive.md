---
title: Claude Managed Agents 技术深度解析
date: 2026-04-11
badge: AI
tags: ["AI", "Claude Code", "Agent", "Harness"]
draft: false
---

**Claude Managed Agents 是 Anthropic 于 2026 年 4 月 8 日发布的全托管智能体基础设施，它将开发者从沙箱搭建、状态管理、容错恢复等底层工程中彻底解放出来。** 与直接调用 Messages API 由你自己编排 agent loop 不同，Managed Agents 把 Claude 的推理循环、工具执行、上下文工程和会话持久化全部封装为一组可组合的 API——你只需定义"智能体做什么"，Anthropic 负责"智能体怎么跑"。该服务目前处于 public beta，所有 Claude API 账户均可使用，需在请求中附带 `managed-agents-2026-04-01` beta header（SDK 会自动设置）。定价模型为标准 token 费用 + **$0.08/session-hour** 的运行时费用，仅按毫秒级活跃时长计费，空闲等待不收费。

---

## 四个核心概念如何协同工作

理解 Managed Agents 的关键在于把握四个核心抽象之间的关系：**Agent 定义"谁"，Environment 定义"在哪里跑"，Session 是两者结合后的"一次运行实例"，Events 则是驱动整个运行过程的"消息流"。**

**Agent** 是一个可复用、可版本化的配置对象，通过 `POST /v1/agents` 创建。它捆绑了模型选择（如 `claude-sonnet-4-6`）、system prompt、工具集、MCP 服务器、Skills 以及可调用的其他 Agent（多智能体场景）。Agent 一经创建即获得唯一 ID，版本号从 1 开始，每次更新自增。更新采用乐观并发控制——必须提供当前 `version`，且未变更的字段自动保留。Agent 可被归档（archive），归档后只读，已有 session 继续运行但不能启动新 session。

**Environment** 是云容器模板，定义预装包（pip/npm）、网络策略（`unrestricted` 或白名单）和挂载文件。它决定了 session 的执行环境能力边界。例如一个数据分析 Environment 会预装 pandas 和 plotly，而一个受限 Environment 可能关闭所有外网访问。

**Session** 是 Agent 在 Environment 中的一次有状态运行。创建 session 时引用 agent ID 和 environment ID，即可获得一个持久化的执行上下文。Session 的核心是一个 **append-only 的事件日志**——所有发生的事情都被追加记录，永不丢失。即使网络断开或基础设施崩溃，session 的进度和输出也完整保留。写入 `/mnt/session/outputs/` 的文件通过 Files API 持久化。

**Events** 是双向消息流。用户发送 `user.message`（指令）、`user.custom_tool_result`（自定义工具结果）、`user.tool_confirmation`（工具审批）；Agent 返回 `agent.message`（文本回复）、`agent.tool_use`（内置工具调用）、`agent.custom_tool_use`（自定义工具请求）、`session.status_idle`（完成或等待中）。开发者通过 SSE（Server-Sent Events）实时获取事件流。

**与 Messages API 的本质区别**在于：Messages API 是无状态的单次请求-响应，你自己构建每一轮对话、管理上下文窗口、实现工具执行和错误重试；而 Managed Agents 把这一整套编排逻辑变成了托管服务。具体来说，Anthropic 帮你管理了 **agent loop 编排**（工具调用决策、多步推理循环）、**沙箱基础设施**（容器生命周期、安全隔离）、**内置工具执行**（bash、文件操作、网页搜索直接在容器内运行）、**上下文工程**（自动 compaction、prompt caching、context trimming）、**会话持久化与崩溃恢复**（harness 崩溃后自动从事件日志恢复），以及**凭证安全管理**（token 永远不会出现在沙箱中）。

---

## Session、Harness、Sandbox 三层解耦架构

Anthropic 工程团队在技术博客中详细描述了 Managed Agents 的核心架构设计思路：将智能体的组件"虚拟化"为三个独立接口——**Session（会话日志）、Harness（编排大脑）、Sandbox（执行双手）**——彼此可以独立失败和替换。

**Session 是持久层**，本质是一个 append-only 的事件日志，存活于 harness 和 sandbox 之外。关键接口包括 `getEvents()`（按位置读取事件切片）、`emitEvent(id, event)`（写入事件）、`wake(sessionId)`（从日志重启 harness）和 `getSession(id)`（获取完整日志）。Session 是唯一的"真相来源"（source of truth），所有状态恢复都从它开始。

**Harness 是无状态的编排循环**——即"大脑"。它拉取 session 日志中的待处理事件，将事件变换后填入 Claude 的上下文窗口，调用 Claude 推理，然后将 Claude 的工具调用路由到相应的 sandbox 执行。关键设计是 **harness 本身无需存活**：如果 harness 崩溃，新的 harness 通过 `wake(sessionId)` 启动，用 `getSession(id)` 取回事件日志，从最后一条事件恢复执行。Harness 也**永远不接触任何凭证**。

**Sandbox 是临时容器**——即"双手"。通过统一接口 `execute(name, input) → string` 被 harness 调用，按需通过 `provision({resources})` 懒加载创建。容器被视为"cattle, not pets"——如果容器挂了，harness 将失败捕获为工具调用错误传回给 Claude，Claude 决定是否重试，新容器可通过标准配方重新初始化。正如工程博客所述：**"harness 不关心 sandbox 是一个容器、一部手机还是一个宝可梦模拟器"**。

这种解耦带来了显著的性能提升。早期的单体设计中，每个 session 都要预先支付容器启动成本，即使根本不需要执行代码。解耦后，推理可以在编排层拉取到待处理事件后立即开始，容器仅在 Claude 实际需要执行时才创建。**p50 TTFT（首 token 时间）降低约 60%，p95 TTFT 降低超过 90%**。

### 一次完整的任务执行流程

1.  **提交任务**：开发者向 session 发送 `user.message` 事件
    
2.  **Harness 激活**：无状态 harness 启动（或通过 `wake()` 恢复），拉取 session 日志
    
3.  **上下文构建**：Harness 将历史事件变换（组织排列、缓存优化、压缩摘要）后填入 Claude 上下文窗口
    
4.  **推理**：Claude 分析任务，决定下一步行动
    
5.  **工具执行（按需）**：如果需要代码执行，懒加载容器 → `execute(name, input) → string`
    
6.  **事件持久化**：每步操作通过 `emitEvent()` 持久写入 session 日志
    
7.  **循环**：Claude 读取工具结果，继续推理，直到任务完成
    
8.  **完成通知**：`session.status_idle` 事件（`stop_reason: end_turn`）表示任务完成
    

整个过程中，如果容器失败——捕获为工具错误，Claude 决定重试；如果 harness 失败——新 harness 从 session 日志恢复。**没有单点故障可以导致工作丢失。**

### 上下文管理的三重策略

长时间运行的任务不可避免地会超出 Claude 的上下文窗口。Managed Agents 用三层策略应对：

**Compaction（压缩）** 将接近窗口极限的对话生成摘要，用摘要替换原始消息重新开始新的上下文窗口。被压缩的消息从 Claude 的上下文中移除，但始终可从 session 日志中恢复——这是区别于传统 compaction 的关键优势。**Context trimming（修剪）** 选择性移除旧的工具结果、thinking blocks 等低信号 token。**Session 作为外部上下文对象** 是最核心的创新：session 日志作为一个活在上下文窗口之外的可查询数据结构，harness 可以通过 `getEvents()` 按位置读取任意历史切片——回退到某个特定时刻之前、重读某个关键操作的前后文。正如工程团队所述："不可逆地丢弃上下文可能导致失败，因为你无法预知未来的 turn 需要哪些 token。"

### 多智能体协作机制

Multi-agent sessions 目前处于 research preview，需要单独申请访问。其机制是：一个 **coordinator agent** 通过 `callable_agents` 字段声明可调用的其他 agent，所有 agent **共享同一容器和文件系统**，但各自拥有独立的 **session thread**——即上下文隔离的事件流和对话历史。

```json
"callable_agents": [
  {"type":"agent","id":"$REVIEWER_AGENT_ID","version":1},
  {"type":"agent","id":"$TEST_WRITER_AGENT_ID","version":1}
]
```

主要限制是 **只允许一层委托**：coordinator 可以调用其他 agent，但被调用的 agent 不能再调用自己的子 agent。每个 thread 有独立的事件流，可通过 `/v1/sessions/{id}/threads/{thread_id}/stream` 单独监听。Session 状态会聚合所有 thread——只要任何一个 thread 还在 `running`，整个 session 就是 `running`。

---

## 内置工具集与外部集成能力

### 八个内置工具

`agent_toolset_20260401` 提供 **8 个默认全部启用**的工具：

| 工具  | 功能  |
| --- | --- |
| `bash` | 在容器中执行 shell 命令 |
| `read` | 读取本地文件 |
| `write` | 写入本地文件 |
| `edit` | 对文件进行字符串替换编辑 |
| `glob` | 文件模式匹配 |
| `grep` | 正则表达式文本搜索 |
| `web_search` | 网页搜索 |
| `web_fetch` | 获取 URL 内容 |

工具可以精细控制。使用 `configs` 数组禁用特定工具，或通过 `default_config: {enabled: false}` 切换为白名单模式只启用需要的工具。每个工具还支持 `permission_policy`：`always_allow` 自动执行，`always_ask` 则暂停等待用户审批——这是 human-in-the-loop 的基础。

### MCP 服务器集成

Managed Agents 通过 agent 的 `mcp_servers` 数组连接外部 MCP（Model Context Protocol）服务器。支持 HTTP、Streamable HTTP、SSE 三种传输方式。OAuth token 通过 `authorization_token` 字段传入，由 Anthropic 的安全代理转发——**token 存储在安全保险库中，Claude 的沙箱代码永远无法访问原始凭证**。当 Claude 调用 MCP 工具时，产生 `agent.mcp_tool_use` 事件。

```json
{
  "mcp_servers": [{
    "type": "url",
    "url": "https://your-mcp-server.example.com/sse",
    "name": "internal-tools",
    "authorization_token": "oauth_token_here"
  }]
}
```

### Agent Skills

Skills 是模块化的能力扩展包，由文件系统中的指令、脚本和资源组成。Claude 根据任务需要动态加载 Skill。**预置 Skills** 包括 PowerPoint（pptx）、Excel（xlsx）、Word（docx）和 PDF 的创建与编辑。自定义 Skills 通过 `/v1/skills` API 上传，组织级别共享。

Skills 采用**渐进式加载（progressive disclosure）**：Level 1 仅加载 YAML frontmatter 元数据（约 100 tokens），Level 2 在触发时加载完整指令（<5k tokens），Level 3 按需加载脚本和参考资料（无限制）。Skills 需要配合 `code-execution-2025-08-25` beta header 启用。

### 凭证安全架构

安全设计的核心原则是**结构性隔离**：凭证永远不出现在 Claude 代码运行的沙箱中。两种模式实现这一点：**Git token** 在容器初始化时就被写入 git remote 配置，push/pull 可以正常工作但 agent 从不接触 token 本身；**OAuth token** 存储在安全保险库中，Claude 通过专用代理（proxy）调用 MCP 工具，代理根据 session 关联的 token 从保险库取出凭证并代为发出请求。

---

## 开发者实战：从创建到流式接收

### Python 完整示例

```python
from anthropic import Anthropic

client = Anthropic()

# 1. 创建 Agent
agent = client.beta.agents.create(
    name="Data Analyst",
    model="claude-sonnet-4-6",
    system="You are a data analyst. Write clean Python code and create visualizations.",
    tools=[{"type": "agent_toolset_20260401"}],
)

# 2. 创建 Environment（预装数据分析包）
environment = client.beta.environments.create(
    name="data-env",
    config={
        "type": "cloud",
        "networking": {"type": "unrestricted"},
        "packages": {"type": "packages", "pip": ["pandas", "plotly", "numpy"]},
    },
)

# 3. 启动 Session
session = client.beta.sessions.create(
    agent=agent.id,
    environment_id=environment.id,
    title="Sales data analysis",
)

# 4. 发送任务并流式接收事件
with client.beta.sessions.events.stream(session.id) as stream:
    client.beta.sessions.events.send(
        session.id,
        events=[{
            "type": "user.message",
            "content": [{"type": "text", "text": "Analyze the CSV at /data/sales.csv and create a trend chart"}],
        }],
    )
    for event in stream:
        match event.type:
            case "agent.message":
                for block in event.content:
                    print(block.text, end="")
            case "agent.tool_use":
                print(f"\n[Tool: {event.name}]")
            case "session.status_idle":
                print("\nDone.")
                break
```

### TypeScript 完整示例

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const agent = await client.beta.agents.create({
  name: "Coding Assistant",
  model: "claude-sonnet-4-6",
  system: "You are a helpful coding assistant.",
  tools: [{ type: "agent_toolset_20260401" }],
});

const env = await client.beta.environments.create({
  name: "dev-env",
  config: { type: "cloud", networking: { type: "unrestricted" } },
});

const session = await client.beta.sessions.create({
  agent: agent.id,
  environment_id: env.id,
});

const stream = await client.beta.sessions.events.stream(session.id);

await client.beta.sessions.events.send(session.id, {
  events: [{
    type: "user.message",
    content: [{ type: "text", text: "Build a REST API with Express.js" }],
  }],
});

for await (const event of stream) {
  if (event.type === "agent.message") {
    for (const block of event.content) {
      process.stdout.write(block.text);
    }
  } else if (event.type === "session.status_idle") {
    console.log("\nAgent finished.");
    break;
  }
}
```

### Human-in-the-loop 实现

两种机制让人类介入 agent 执行：

**工具审批（Tool Confirmation）**：将工具的 `permission_policy` 设为 `always_ask`，agent 每次调用该工具时会暂停并发出确认请求。开发者监听到 `session.status_idle`（`stop_reason: requires_action`）后，发送 `user.tool_confirmation` 事件。

```python
# 监听到需要审批的事件
if event.type == "session.status_idle" and event.stop_reason == "requires_action":
    # 向用户展示工具调用详情，获取决策
    client.beta.sessions.events.send(session.id, events=[{
        "type": "user.tool_confirmation",
        "tool_use_id": blocking_tool_use_id,
        "result": "allow",  # 或 "deny"，可附 deny_message
    }])
```

**自定义工具（Custom Tools）**：定义 `type: "custom"` 的工具，agent 调用时产生 `agent.custom_tool_use` 事件并暂停，开发者在自己的后端执行操作后返回 `user.custom_tool_result`。这让你可以将 agent 接入任何外部系统（数据库查询、内部 API 调用等），同时保持完全的控制权。

**中途指令**：你还可以在 agent 运行过程中随时发送新的 `user.message` 事件来改变方向，session 状态不会丢失。

### 错误处理与重试

容器故障被自动捕获为工具调用错误，传回给 Claude 判断是否重试——Claude 可以请求 `provision()` 一个新容器继续工作。Harness 崩溃则通过 `wake(sessionId)` 从 session 日志自动恢复。开发者侧应监听 `session.error` 事件，该事件包含 `error.type` 和 `error.message` 字段。网络断连不会丢失进度——重新连接 SSE stream 即可从断点继续接收事件。

### 关于 Hooks

Hooks（钩子）是 **Agent SDK** 的特性（如 `PreToolUse`、`PostToolUse`、`Stop` 等），不直接暴露在 Managed Agents API 中。在 Managed Agents 中，等效的控制通过事件流实现：工具审批机制（`user.tool_confirmation`）替代了 `PreToolUse` hook 的拦截功能，自定义工具的请求-响应模式替代了自定义 hook 逻辑，中途发送 `user.message` 替代了运行时干预。**如果你需要细粒度的 hook 控制（如在每次文件写入后运行格式化脚本），应考虑使用 Agent SDK 而非 Managed Agents。**

---

## 成本模型与适用边界

### 定价结构

Managed Agents 的费用由两部分组成：

**Session 运行时费用 $0.08/小时**，仅在 session 状态为 `running` 时按毫秒精度计费。Agent 空闲等待用户输入（`idle`）、等待工具审批、或处于 `rescheduling`/`terminated` 状态时完全不计费。一个 24/7 不间断运行的 agent 每月运行时费用约 **$58**，但实际场景中大部分时间是空闲的。容器计算成本已包含在 session 运行时中，不再单独收取 Code Execution 容器时费。

**Token 费用按标准 API 定价**：Opus 4.6 为 $5/$25 per MTok（输入/输出），Sonnet 4.6 为 $3/$15，Haiku 4.5 为 $1/$5。Prompt caching 的缓存读取享受 0.1x 折扣。Web search 额外收费 **$10/千次搜索**，web fetch 不额外收费。

一个参考案例：使用 Opus 4.6 的 1 小时编码 session，消耗 50K 输入 + 15K 输出 token，总费用约 **$0.71**（含 运行时）。启用后可降至约 $0.53。

### 速率限制

| 操作类型 | 限制  |
| --- | --- |
| 创建类端点（agents, sessions, environments） | **60 次/分钟** |
| 读取类端点（retrieve, list, stream） | **600 次/分钟** |

此外，组织级 spend limits 和 tier-based token 速率限制（RPM, ITPM, OTPM）同样适用——并行运行大量 agent 时，token 消耗受限于你所在 tier 的 Messages API 限额。

### 什么时候该用 Managed Agents

**适合的场景**：长时间运行的异步任务（代码生成、数据分析、文档处理）；需要快速上线而非自建基础设施；需要内置的可观测性和审计跟踪（Console 中可视化每一步工具调用和决策）；工作负载有明显波峰波谷（按用量付费避免闲置成本）。Notion、Rakuten、Sentry、Asana 等已在生产中使用。

**不适合的场景**：需要多模型混用（Managed Agents 仅支持 Claude）；有严格的数据驻留/合规要求（不支持 ZDR，仅运行在 Anthropic 基础设施上）；需要细粒度 hook 控制或自定义 agent loop 逻辑（应使用 **Agent SDK**）；需要在 Bedrock/Vertex 上运行（目前仅支持 Claude 直连 API）；需要 GPU 或特殊执行环境。对于需要完全控制但又想用 Claude 能力的团队，**Agent SDK** 是更好的选择——它提供与 Claude Code 相同的工具和 agent loop，但运行在你自己的基础设施上。Messages API 则适合需要最大灵活性、多模型支持或极度定制化编排的场景。

---

## 结语：Meta-harness 的设计哲学

Managed Agents 最深刻的设计洞察不是任何单个功能，而是其 **meta-harness 哲学**。正如工程团队引用 Rich Sutton 的"The Bitter Lesson"所警示的：harness 编码了"Claude 不能独立完成什么"的假设，但这些假设会随模型能力提升而过时。Sonnet 4.5 曾在上下文接近极限时提前结束任务（"context anxiety"），需要 harness 强制插入 context reset；但 Opus 4.5 上这个行为已经消失，那些 reset 变成了"死重"。

Managed Agents 通过 Session/Harness/Sandbox 三个稳定接口应对这种进化——它不假设 Claude 未来需要什么具体编排策略，只保证 Claude 能操作状态（session）、执行计算（sandbox）、并扩展到多个"大脑"和多只"手"。这种设计让今天的 harness 实现可以被明天更好的实现替换，而你的 agent 定义和 session 历史纹丝不动。对于开发者而言，**这意味着你投入在 agent 逻辑和业务规则上的工作具有持久价值，而基础设施层面的优化由 Anthropic 持续推进。**
