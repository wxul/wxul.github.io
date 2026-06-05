---
title: Flue：Astro 团队的"Agent Harness 框架"，以及它在框架版图里的位置
date: 2026-06-04
badge: AI
tags: ["AI", "Agent", "Harness", "Developer"]
draft: false
---

Astro 联合创始人 Fred K. Schott 在 2026 年 5 月 1 日发布了 **Flue**,一个 TypeScript 写的开源框架,放在 `withastro` 组织下,自称是 **"The Agent Harness Framework"**。在 LangGraph、Mastra、Vercel AI SDK 已经各占山头的当下,又来一个新框架,第一反应难免是"这和现有的有什么不一样"。这篇就来拆一拆 Flue 的设计、看几段代码,再把它放进当前的框架版图里横向比一比。

---

## 一、一句话定位:它主攻的是 harness 这一层

理解一堆 Agent 框架差异的最好视角,是看**它把哪一层当成核心抽象**。粗分四层:

1.  **模型原语层**:统一各家模型的调用 / 流式 / tool calling —— Vercel AI SDK。
    
2.  **编排层**:用图、状态机或对话组织多步、多 Agent 流程 —— LangGraph、CrewAI、AutoGen、LlamaIndex Workflows。
    
3.  **应用框架层**:在前两层之上打包 memory、RAG、evals、observability、UI 流式 —— Mastra。
    
4.  **运行架层(harness)**:不替你编排步骤,而是给模型一个能自主干活的运行环境(文件系统、沙箱、工具、上下文管理、子智能体),然后信任它像 Claude Code 那样自己把任务跑完 —— **Flue**,以及 LangChain 的 DeepAgents、OpenAI Agents SDK 新增的 sandbox 能力。
    

**Flue 的独特之处,就是把第 4 层拎出来当主角。** 大多数框架的重心在"怎么帮你编排流程"或"怎么帮你打包功能",而 Flue 把"模型在哪运行、怎么安全运行、怎么记住工作、失败怎么自纠"这套 harness 关注点推到中心。这也是它和别人"不在同一维度竞争"的根本原因。

---

## 二、Flue 的核心理念与抽象

### 2.1 Agent = Model + Harness

Flue 官方定义直白:**一个 agent = 一个跑在 harness 里的 LLM。** harness 给模型五样东西:

-    **Filesystem**:记住工作成果
    
-    **Tools**:采取行动
    
-    **Sandbox**:安全执行命令
    
-    **Context**:长任务里保持专注
    
-    **Subagents**:并行处理
    

凑齐这五样,模型就能自主循环——读文件 → 跑命令 → 调工具 → 发现错误 → 纠正 → 再来,直到完成。你负责搭 harness,模型负责跑完任务。这就是 "Harness-first"。

灵感来源讲得很明白:**Claude Code、Codex、OpenCode** 这类编码 agent。但 Flue 刻意做了两个减法:

-    **去掉"必须有人在终端前操作"** → Flue 的 agent 是 **100% headless** 的,纯靠代码 API 调用。官方原话:"一些最流行的 agent harness 是为编码设计的,Flue 刻意相反——Flue 的 agent 纯无头,**JavaScript API 是 Flue 成功的关键**,而对其他产品而言 API 往往是其主产品的事后补充。"
    
-    **去掉"只能写代码"** → 它面向任意任务:issue 分诊、代码审查、安全扫描、客服等。
    

三条设计原则:**Harness-first**(给运行架而非脚本)、**Open by default**(模型 / 沙箱 / 部署目标全开放无锁定)、**AI-first**(框架本身设计为配合 Claude Code 这类编码 agent 来开发,逻辑大量写成 Markdown)。

### 2.2 核心概念速查

| 概念  | 作用  | API |
| --- | --- | --- |
| **Agent** | 可寻址、长期存在的 agent 实体 | `createAgent(() => ({...}))` |
| **Harness** | 初始化后的运行架(含沙箱/工具/技能) | `await init(agent)` |
| **Session** | 持久化会话(消息历史 + 元数据) | `harness.session()` |
| **Workflow** | 代码里从输入到结果的有界编排 | 导出 `run` |
| **Tool** | 模型可选调用的能力(注意:**不是权限边界**) | `defineTool({...})` |
| **Skill** | Markdown 写的可复用指令(非可执行代码) | `SKILL.md` + frontmatter |
| **Role / Subagent** | 专门化的子智能体角色 | `.flue/roles/` |
| **Task** | 在分离会话里跑一次性子智能体 | `session.task()` |

几个值得划重点的设计:

-    **Skills 是 Markdown,不是代码。** "怎么分诊一个 issue"写成一篇带 YAML frontmatter(name/description)的 `SKILL.md`,框架按需喂给模型。逻辑因此天然可版本控制、可 review、可被另一个编码 agent 读懂。技能**懒加载**:初始化只把 name/description 放进目录,正文激活时才读入上下文,省 token。
    
-    **Tool 不是授权边界。** 官方明确警告:工具参数是"模型可选填的输入",**不要**把凭证、租户 ID 塞进模型能看到的参数里。需要隔离密钥时用 `defineCommand()`,把特权 CLI 的密钥藏在命令定义里,模型不可见。
    
-    **文件即路由。** agent 源文件放 `./agents/` 或 `./.flue/agents/`,每个 webhook agent 自动获得 `POST /agents/<name>/<id>` 路由。URL 里的 `<id>` 标识 agent 实例(某客户 / 某仓库 / 某对话空间的持久运行时作用域)。约定优于配置,和 Astro/Next.js 一脉相承。
    

---

## 三、几段代码

### 3.1 最小 agent

```ts
// .flue/agents/hello-world.ts
import { createAgent } from '@flue/runtime';

export const triggers = { webhook: true };

export default createAgent(() => ({
  model: 'anthropic/claude-sonnet-4-6',
}));
```

`flue dev`(默认端口 3583,谐音 "FLUE")一跑,就有了一个挂在 `POST /agents/hello-world/<id>` 上的无头 agent。

### 3.2 结构化输出(Valibot schema)

```ts
import { createAgent, type FlueContext } from '@flue/runtime';
import * as v from 'valibot';

export async function run({ init, payload }: FlueContext) {
  const harness = await init({ model: 'anthropic/claude-sonnet-4-6' });
  const session = await harness.session();

  const { data } = await session.prompt(
    `Translate to ${payload.language}: "${payload.text}"`,
    {
      result: v.object({
        translation: v.string(),
        confidence: v.picklist(['low', 'medium', 'high']),
      }),
    }
  );

  return data; // data.translation / data.confidence 完全类型化
}
```

`response` 还带回 `response.model.id`、`response.usage.totalTokens` 等元数据,便于成本核算和可观测性。

### 3.3 完整体 agent(技能 + 工具 + 本地沙箱)

```ts
import { createAgent } from '@flue/runtime';
import { local } from '@flue/runtime/node';
import triage from '../skills/triage/SKILL.md' with { type: 'skill' };
import * as githubTools from '../tools/github.ts';
import instructions from '../AGENTS.md';

export default createAgent(() => ({
  model: 'anthropic/claude-sonnet-4-6',
  tools: [...githubTools],
  skills: [triage],
  sandbox: local(),
  instructions,
}));
```

### 3.4 沙箱:Flue 的差异化武器

沙箱在 Flue 里是**一等公民**,这也是它和其他 TS 框架拉开距离的地方:

-    **默认:虚拟沙箱(just-bash)。** 基于 Vercel Labs 的 just-bash,是**内存级虚拟文件系统 + bash 解释器**,**不需要容器**。启动快、便宜、易横向扩展,适合高并发。
    
-    **`local()`:本地沙箱。** 挂载宿主文件系统 / shell,`gh`/`git`/`npm` 开箱即用,适合 CI。
    
-    **Cloudflare:** cf-shell + R2。
    
-    **Daytona 等远程容器:** 声明式镜像,缓存后秒级启动。
    

对比一下:Vercel AI SDK 完全没有内置沙箱;Mastra 沙箱不是核心卖点;OpenAI Agents SDK 直到 2026 年 4 月才补上原生 sandbox 且先发 Python。**"零配置就有安全代码执行环境"是 Flue 最实在的卖点之一。**

### 3.5 其余能力速记

-    **模型:** model specifier 字符串,如 `anthropic/claude-sonnet-4-6`、`openai/gpt-5.5`、`openrouter/...`、`cloudflare/@cf/...`;provider 目录来自 Pi(pi.dev),认证走标准环境变量;`thinkingLevel`(off→xhigh,默认 medium)调推理强度;`registerProvider()` 接 Ollama 等本地模型。
    
-    **工具:** 自定义工具 + 内置文件系统/shell 工具(grep/glob/read/bash)+ **MCP 远程工具**(`connectMcpServer()`,默认 streamable HTTP,工具名带前缀如 `mcp__inventory__lookup_item`)。
    
-    **流式:** `flue run` 经 SSE 把进度流到 stderr;支持 WebSocket;可观测性走 OpenTelemetry,官方 `@flue/opentelemetry` 适配器,另有 Braintrust、Sentry 接入示例。
    
-    **持久化:** Cloudflare 上由 **Durable Objects** 自动持久化会话历史,数天/数周后可恢复;Node.js 默认内存,可插自定义 store。
    
-    **部署:** `flue build --target node|cloudflare` 产出自包含产物,可部署到 Node.js、Cloudflare Workers、GitHub Actions、GitLab CI/CD、Daytona、Render 等。继承自 Astro 的"运行时无关"基因。
    

---

## 四、横向对比:主流框架各占哪一层

| 框架  | 语言  | 核心抽象 | 编排模型 | 沙箱  | 成熟度(2026 年中) |
| --- | --- | --- | --- | --- | --- |
| **Flue** | TS,运行时无关 | **harness** | 模型自主循环 + 有界 workflow | **一等公民**:just-bash + 容器 | 极新(2026-05),**实验性**,星标小 |
| **Mastra** | TS  | 应用框架 | Agents + **图式 workflow**(分支/并行/挂起恢复) | 非核心 | v1.0(2026-01)、22.3k+ stars、$13M 融资、Replit/WorkOS 在用 |
| **Vercel AI SDK** | TS  | 模型原语 | ToolLoopAgent(stepCountIs) | 无   | 非常成熟,Web 标准 |
| **OpenAI Agents SDK** | Py + TS | 极简原语 | **Handoffs** + Guardrails | 2026-04 新增(先发 Py) | Swarm 演进,Py ~26k stars |
| **LangGraph** | Py + TS | **有状态图** | 有向图 + checkpointing + 时间旅行 | 手动  | **最成熟**,月下载 ~12M,Uber/JPMorgan/Klarna 在用 |
| **CrewAI** | Python | 角色制多智能体 | Crews + Flows | 基础  | 52.4k stars、v1.14.6 |
| **AutoGen** | Py(+.NET) | 对话式多智能体 | GroupChat | **最强代码执行** | 50.4k stars,**已转维护模式**(继任 Microsoft Agent Framework) |
| **LlamaIndex** | Py(+ TS) | 数据/检索优先 | 事件驱动 step | 非核心 | 成熟,RAG 首选 |

> 各框架星标 / 版本 / 功能随时间变化,数字为 2026 年中快照,部分来自搜索缓存,以实时数据为准。

各家一句话定性:

-    **LangGraph**:低层有状态图编排(节点 + 条件边 + checkpointing + 时间旅行调试),生产成熟度和企业采用当前最高(Klarna 用它服务 8500 万用户,平均解决时间降约 80%)。理念上**最接近 Flue 的其实是 LangChain 的 DeepAgents**——在 LangGraph 之上加规划、子智能体、文件系统,本质也是一种 harness;区别是 DeepAgents 要自己组装更多,Flue 用强约定换低代码,更像"用现成 harness"。
    
-    **LlamaIndex**:数据 / 检索优先,RAG 场景首选,Flue 不主打检索。
    
-    **CrewAI**:角色 / 目标 / 背景故事的团队隐喻(Crews)+ 事件驱动 Flows,多 Agent 角色协作直观,Python 生态。
    
-    **AutoGen**:对话式 GroupChat,代码执行最强,但**已进入维护模式**,新项目需留意继任者 Microsoft Agent Framework。
    
-    **OpenAI Agents SDK**:从 Swarm 演进,极简原语(Agent / Handoffs / Guardrails / Sessions / Tracing),Py + TS 双语言一等支持,2026-04 补上原生 sandbox(支持 Blaxel / Cloudflare / Daytona / E2B / Modal / Runloop / Vercel),但先发 Python。多 Agent 靠显式 handoffs,与 OpenAI 生态绑定更紧。
    

---

## 五、重点对决:三个 TS 原生框架到底差在哪

TS 栈里真正容易混淆的是 **Flue / Mastra / Vercel AI SDK**,因为它们都打勾"TS 原生、类型安全、模型无关、可部署 Cloudflare/Node"。但它们根本不在同一层:

-    **Vercel AI SDK** 解决"怎么统一调模型 + 流式 + tool calling + 生成式 UI",**没有**沙箱 / 文件系统 / 部署运行时。它的 `ToolLoopAgent` 默认最多 20 步(`stepCountIs(20)`)。关键事实:**Mastra 内部就用 Vercel AI SDK 做模型交互**——它是地基,不是房子。
    
-    **Mastra** 是"电池齐全"的 TS 应用框架:agents + 图式 workflow + memory + RAG + evals + observability + 本地可视化 playground(Mastra Studio),Zod schema,模型路由覆盖 1,113+ 模型。编排是**显式图式 workflow**(分支 / 并行 / 条件 / 挂起恢复 / 人在回路)。已 v1.0、有融资和生产用户。
    
-    **Flue** 刻意**不让你画图、不让你写循环**,把编排交给模型自主完成,自己专注沙箱、skills、运行时可移植性。逻辑大量写在 Markdown,默认零配置 just-bash 沙箱,主打"一次编写到处部署"。
    

浓缩成一句话:

> **Vercel AI SDK 给你调模型的原语;Mastra 给你一套画好流程、带 RAG 和调试 UI 的应用框架;Flue 给你一个让模型自主干活的安全运行架。**

成熟度的差距要诚实面对:**Mastra 已 v1.0 且有生产案例,Flue 还是实验性、星标小。**

---

## 六、上手前的几个注意事项

1.  **Experimental,API 会变。** README 明确写 "APIs may change",核心包已从 `@flue/sdk` 改名 `@flue/runtime`(v0.6 起),当前约 0.7.x。生产采用前务必锁版本、盯 CHANGELOG;要长期 API 稳定就等 1.0 或社区扩大。
    
2.  **文档与示例存在改名不一致**(`@flue/sdk` / `@flue/client` / `@flue/cloudflare` 旧名残留),以官方最新文档为准。
    
3.  **GitHub 体量数据有冲突**(不同来源星标在约 1.7k–2.8k,也出现过仅 24 stars 的疑似缓存异常),想了解真实热度直接看 `withastro/flue` 仓库实时数据。
    
4.  **PyFlue 是社区非官方移植**(基于 LangChain DeepAgents),不代表官方路线,别混淆。
    

---

## 结语

Flue 真正有意思的地方,不是"又一个能调 LLM 的 TS 库",而是它**把一直被开发者手工拼装的 harness,第一次正式产品化成框架的核心抽象**。这个方向是顺着趋势走的——模型自主能力越强,"少编排、多放权,但靠安全沙箱兜底"会成为越来越多 agent 的形态,Claude Code 已经验证了这条路。

但方向对,和现在就能押上生产,是两回事。今天的 Flue 还很年轻、还很实验性。当作早期项目去玩、去理解它代表的设计思路,价值已经够了;要的是稳,LangGraph 和 Mastra 仍是更稳妥的答案。
