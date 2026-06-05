---
title: Claude Code Channels 深度解析：用 Telegram 遥控你的 AI 编程助手
date: 2026-03-21
badge: AI
tags: ["AI", "Claude Code", "MCP"]
draft: false
---

> Anthropic 正式推出 Claude Code Channels 研究预览版，让开发者得以通过手机消息应用远程指挥 AI 完成编程任务——这或许是 AI 辅助编程迈向"异步智能体"时代的关键一步。

---

## 一、它到底是什么？

2026 年 3 月 20 日，Anthropic 在 Threads 上低调发布了一条公告，却在开发者社区引发了巨大震动：

> "我们刚刚以研究预览版发布了 Claude Code Channels。它允许你通过特定 MCP 控制你的 Claude Code 会话，首批支持 Telegram 和 Discord。你可以直接从手机向 Claude Code 发消息。"

这段话出自 Anthropic 工程师 Boris Cherny，简短却意味深长。

**Claude Code Channels** 是 Claude Code 的一项新能力扩展，其核心是：**将外部消息平台（Telegram、Discord 等）与本地运行的 Claude Code 会话打通，构建一条双向通信信道**。

换句话说，你可以在手机上打开 Telegram，给你的 AI 发一条消息："帮我把登录模块的单元测试补全"，然后去吃顿饭，回来发现工作已经完成并等待你审核。

这彻底改变了 Claude Code 的使用范式——从"坐在电脑前同步等待"变成"随时随地异步派活"。

---

## 二、背后的竞争：它其实是在回应 OpenClaw

如果你关注 AI 工具圈，应该听说过一个名叫 **OpenClaw** 的开源项目（最初名为"Clawd"，由开发者 Peter Steinberger 创建）。这个项目在 2026 年 1 月爆红，GitHub 星标一度突破 **25.7 万**，核心卖点正是"让 AI 在后台持续运行，通过 iMessage、Slack、Telegram、WhatsApp 等多达 30+ 平台接受指令"。

OpenClaw 的走红说明了一件事：开发者迫切需要能在"离开电脑"时继续工作的 AI 智能体。

然而 OpenClaw 也有明显短板：需要专用硬件（比如一台始终开机的 Mac Mini）、存在已知安全漏洞（CVE-2026-25253，CVSS 评分 8.8），且 Anthropic 已就商标问题发出律师函。随后 OpenAI 收购了 Steinberger，OpenClaw 的前景变得扑朔迷离。

就在此时，Anthropic 推出了 Channels。VentureBeat 的报道直接将其称为 **"OpenClaw killer"**，AI 领域知名 YouTuber Matthew Berman 则说得更直接：**"他们把 OpenClaw 直接内置进来了。"**

Channels 提供了官方背书、更低的上手门槛、无需专用硬件，以及更好的安全模型——这正是 OpenClaw 的软肋所在。当然，作为研究预览，Channels 目前仍缺少一些 OpenClaw 的进阶功能（如定时任务、心跳轮询等），但方向已经十分明确。

---

## 三、技术架构：MCP 是核心

要理解 Channels 怎么工作，需要先了解它的技术基础：**MCP（Model Context Protocol）**，即 Anthropic 推出的模型上下文协议。

MCP 是一套标准化协议，允许外部服务以"工具"的形式接入 Claude 的会话上下文。Channel 本质上就是**一个特殊的 MCP 服务器**，它扮演消息平台与 Claude Code 会话之间的双向桥梁角色。

整个通信链路如下：

```
手机（Telegram/Discord）
        ↓ 发送消息
   Channel MCP 服务器
        ↓ 注入事件
  运行中的 Claude Code 会话
        ↓ 执行任务（写代码、跑测试、修 Bug）
   Channel MCP 服务器
        ↓ 回传结果
手机（Telegram/Discord）
```

当开发者带 `--channels` 标志启动 Claude Code 时，它会启动一个轮询服务，持续监听来自已配置平台的消息。收到的消息以 `<channel source="telegram">` 的形式注入活跃会话，Claude 读取后执行工作，再通过相同信道回复。

Channel 插件的预构建版本托管在官方仓库 `anthropics/claude-plugins-official`（该仓库已有逾 12,800 个星标），基于 **Bun JavaScript 运行时**运行。Anthropic 同时提供了一个名为 **Fakechat** 的本地调试工具——纯 localhost 运行、无需连接任何外部服务，让开发者可以先在本地测试推送/回复逻辑，再对接真实平台。

---

## 四、如何上手：以 Telegram 为例

以下是完整的配置流程，参考自 Anthropic 官方文档（code.claude.com/docs/en/channels）。

### 第一步：更新 Claude Code

Channels 需要 **v2.1.80 或更高版本**，同时需要使用 claude.ai 账号登录（Console 和 API Key 认证方式在预览阶段暂不支持）。

```bash
claude --version
# 确认版本 >= 2.1.80
```

### 第二步：在 Telegram 创建 Bot

1. 在 Telegram 中搜索 **@BotFather**，发送 `/newbot`
2. 按提示输入 Bot 名称和用户名
3. 获取 **Bot Token**（格式如 `1234567890:ABCDefghIJKlmnoPQRstuvWXyz`），妥善保存

### 第三步：安装 Telegram Channel 插件

在 Claude Code 会话中执行：

```
/plugin install telegram@claude-plugins-official
```

系统会提示输入 Bot Token。插件安装成功后，进入配置环节。

### 第四步：配对账号

重新启动 Claude Code，带上 `--channels` 标志：

```bash
claude --channels plugin:telegram@claude-plugins-official
```

在你的 Telegram 中，向刚创建的 Bot 发送 `/pair`，Bot 会返回一个 **6 位配对码**。将这个配对码粘贴回终端，完成账号绑定。

配对成功后，建议开启**白名单模式**，防止陌生人触发 Bot：

```
/allowlist add <user_id>
```

### 第五步：开始使用

配置完成后，你就可以在手机上直接向 Bot 发消息了。Bot 具备三个核心 MCP 工具：

- **reply**：发送文本、文件、图片（支持线程回复）
- **react**：为消息添加 Emoji 表情回应
- **edit_message**：编辑已发送的消息（常见用法：先发"处理中…"，完成后更新为最终结果）

一次典型的对话可能是这样的：

> **你（手机）**：现在帮我检查一下 `src/auth/` 目录下的代码，看有没有 SQL 注入风险，有的话直接修复。
>
> **Claude Bot**：收到，开始扫描 src/auth/ 目录… 🔍
>
> **Claude Bot**（3 分钟后）：已完成检查，发现 2 处潜在 SQL 注入点，均已修复：
>
> - `login.py` 第 47 行：参数化查询替代字符串拼接
> - `session.py` 第 123 行：添加输入转义
>
> 已提交为 `fix/sql-injection-auth`，请查看。

Discord 的配置流程与 Telegram 类似，只是第二步改为在 Discord Developer Portal 创建应用并获取 Bot Token。

---

## 五、安全机制：Anthropic 如何保证可控性

远程控制本地 AI 执行代码操作，安全性是最大的顾虑。Anthropic 设计了多层防护：

**1. 配对认证**
账号绑定基于 6 位配对码，只有持有该码的人才能完成绑定，防止未授权访问。

**2. 白名单隔离**
通过 `/allowlist` 命令，可限定只有特定用户 ID 才能与 Bot 交互，陌生人的配对请求会被静默忽略。

**3. 插件白名单**
在研究预览阶段，`--channels` 标志只接受 Anthropic 维护的白名单插件。若要加载自定义 Channel，需要显式使用 `--dangerously-load-development-channels` 标志，名称本身就是一个警示。

**4. 权限暂停机制**
如果 Claude 在执行过程中遇到需要权限确认的操作（如写入敏感文件），会话会自动暂停，直到你在本地终端手动批准——不存在远程绕过权限的情况。

**5. 企业级管控**
对于 Team 和 Enterprise 用户，管理员需在 `claude.ai → Admin settings → Claude Code → Channels` 中显式启用功能，或在 Managed Settings 中将 `channelsEnabled` 设为 `true`。仅将 MCP 服务器写入 `.mcp.json` 是不够的，还必须在 `--channels` 参数中明确指定，确保每个会话都是明确选择接入的。

---

## 六、自定义 Channel：超越 Telegram 和 Discord

官方目前只内置了 Telegram 和 Discord，但 Channels 架构的真正价值在于**可扩展性**——任何能发送 HTTP 请求的服务都可以成为一个 Channel。

### 方式一：使用 Webhook Channel（推荐入门）

最简单的自定义方式是 Webhook。Anthropic 提供了通用 Webhook Channel 支持，任何可以发送 POST 请求的系统都可以借此接入：

```bash
# 启动带 Webhook Channel 的会话
claude --channels webhook
```

Claude Code 会输出一个本地监听地址，你可以从任意服务向该地址推送事件：

```bash
curl -X POST http://localhost:PORT/channel \
  -H "Content-Type: application/json" \
  -d '{"message": "线上告警：支付服务错误率上升至 5%，请排查"}'
```

这意味着你可以把 Grafana 监控告警、GitHub Actions 构建结果、Sentry 错误通知，全部接入 Claude Code，让它自动响应。

### 方式二：开发自定义 Channel 插件

对于需要深度集成的场景（比如接入企业微信、飞书、Slack），可以自己开发 Channel 插件。插件本质上是一个实现了 Channel MCP 规范的 Bun 脚本。

**基础结构如下：**

```ts
// my-channel/index.ts（基于 Bun 运行时）
import { ChannelPlugin } from "@anthropic/claude-plugins-sdk";

const plugin = new ChannelPlugin({
  name: "my-custom-channel",

  // 工具定义：Claude 可以调用的动作
  tools: [
    {
      name: "reply",
      description: "向用户发送回复消息",
      inputSchema: {
        type: "object",
        properties: {
          message: { type: "string" },
          threadId: { type: "string", optional: true },
        },
      },
      handler: async ({ message, threadId }) => {
        // 调用你的消息平台 API 发送消息
        await yourPlatformAPI.send(message, threadId);
      },
    },
  ],

  // 事件监听：监听外部消息并注入 Claude 会话
  async startListening(onEvent) {
    yourPlatformAPI.onMessage((msg) => {
      onEvent({
        type: "message",
        source: "my-custom-channel",
        content: msg.text,
        metadata: { userId: msg.from, threadId: msg.threadId },
      });
    });
  },
});

plugin.run();
```

**本地调试阶段**，使用开发标志：

```bash
claude --dangerously-load-development-channels ./my-channel/index.ts
```

注意：该标志仅建议在开发和测试环境使用，生产环境应等待 Anthropic 完善插件审核机制。

### 方式三：复用社区插件

由于 Channels 发布后开源社区响应极为迅速，已有多个社区项目填补了官方的空白：

- **afk-code**（GitHub: `clharman/afk-code`）：支持 Slack，适合企业内部使用
- **claude-code-discord**（GitHub: `zebbern/claude-code-discord`）：功能更完善的 Discord 机器人，支持分支管理和 Shell 命令
- **CodePilot**（GitHub: `op7418/CodePilot`）：桌面端 GUI，支持 Telegram、飞书、Discord 和 QQ，对国内开发者尤为友好

这些项目仍在快速迭代，使用前建议评估其安全性和维护状态。

---

## 七、典型使用场景

Channels 上线后，开发者社区已经涌现出大量创意用法：

**场景 1：移动端异步编程**
在通勤途中通过 Telegram 给 Claude 下达任务，到办公室时代码已经写好等待 Code Review。

**场景 2：CI/CD 自动响应**
将 GitHub Actions 或 Jenkins 的构建失败事件通过 Webhook 推入 Claude，让它自动分析日志、定位问题、提交修复 PR。

**场景 3：监控告警处理**
Grafana 或 PagerDuty 告警触发时，Claude 自动查看相关代码、分析可能原因，并在消息平台上汇报初步判断。

**场景 4：个人 AI 助理**
一位 Hacker News 用户分享了他的用法：在 VPS 上持续运行 Claude Code，通过 Telegram 构建了一个德语练习机器人、一个报销单解析工具和一个日历管理助手，全部共用同一套 Claude 会话。

**场景 5：远程代码评审**
出门在外时，让 Claude 对刚合入的 PR 做初步安全扫描，把可疑点直接发到你的手机上。

---

## 八、当前限制与注意事项

作为研究预览版，Channels 存在若干明显局限，使用前需要了解：

**平台支持有限**：目前仅有 Telegram 和 Discord 两个官方插件，没有 Slack、企业微信、飞书或 WhatsApp 的原生支持。

**无真正的守护进程模式**：Claude Code 会话依赖终端进程持续运行，没有系统服务化的选项。若要实现"始终在线"，需要借助 `tmux`、`screen` 或将其部署在 VPS 上。

**协议可能变更**：官方明确表示 `--channels` 标志的语法和协议合约可能随研究推进而调整，自定义插件需要关注兼容性。

**订阅要求**：Channels 不单独收费，包含在现有 Claude 订阅中（Pro/Max/Team/Enterprise 均支持），但需要 claude.ai 账号登录，Console 和 API Key 认证暂不可用。

**账号限制**：一个 Channel 实例当前只能绑定到一个 claude.ai 账号，多账号协作场景尚不支持。

---

## 九、总结：AI 编程工具的范式转变

Claude Code Channels 所代表的，不只是"可以用手机发消息给 AI"这么简单的体验升级。

它意味着 AI 编程助手正式从**同步工具**走向**异步智能体**。你不再需要坐在电脑前全程盯着 AI 工作；你可以把任务交出去，AI 在后台持续运转，遇到问题再找你确认，完成后主动通知你。

更重要的是，基于 MCP 的扩展架构意味着 Channels 的边界远不止于 Telegram 和 Discord。任何可以发送事件的系统——监控平台、CI/CD 流水线、Issue 追踪器、消息队列——都可能成为触发 AI 工作的信号源。

正如 Latent Space 通讯所评论的："Telegram 和 Discord 只是开始。一旦这套模式建立起来，Channel 列表会扩展到你的团队已经在使用的任何地方。"

当然，研究预览意味着这一切仍处于早期阶段。随着 Anthropic 收集开发者反馈、完善插件生态、增加对更多平台的官方支持，Channels 的形态还会持续演进。但方向已经确立——**AI 不再只是你坐下来使用的工具，而是可以随时随地待命的协作伙伴。**

---

*参考资料：Anthropic 官方文档（code.claude.com/docs/en/channels）、VentureBeat、Threads (@boris_cherny)、Hacker News 讨论帖*
