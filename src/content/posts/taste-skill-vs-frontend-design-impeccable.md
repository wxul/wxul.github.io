---
title: 给 AI 装上"审美"：聊聊 taste-skill，顺便对比官方 frontend-design 和 Impeccable
date: 2026-06-08
badge: AI
tags: ["AI", "Claude Code", "Vibe Coding", "Developer"]
draft: false
---

## 你大概也见过这种页面

紫蓝色渐变背景，正中间一行加粗大标题，下面三个等宽的功能卡片，每个卡片头上顶着一个圆角图标块，字体清一色 Inter。

不管你让 AI 做的是 SaaS 落地页、个人作品集还是后台仪表盘，它总能给你这一套。换个需求，换汤不换药。这就是这两年开发者圈子里被反复吐槽的 "AI slop"——AI 流水线垃圾。

原因其实不神秘。大模型是在海量网页上训练出来的，而过去几年的网页又高度同质化（React + Tailwind + shadcn/ui 几乎成了默认栈）。当你给一个模糊的需求时，模型会很自然地回归到训练数据的"视觉均值"：那个统计意义上最安全、最常见、也最无聊的样子。

于是就有了一类专门对付这个问题的工具——**前端设计类的 Agent Skill**。它们的思路出奇地一致：与其指望模型"突然有了品味"，不如把一位资深设计工程师的判断，用一份文件硬塞进模型的上下文里，把它的输出从"训练数据尾分布的均值"往"专业原则"那一头掰。

最近在 GitHub 上很火的 taste-skill，就是这类工具里声量最大的一个。这篇文章讲讲它到底是什么、怎么用，再把它跟两个绕不开的对手——Anthropic 官方的 frontend-design 和前 Chrome DevTools 负责人做的 Impeccable——摆在一起对比一下，帮你判断该装哪个。

这三个都是 `SKILL.md` 形态的可移植技能，一份文件到处能用，不绑定具体工具——这点在后面对比时会反复用到。

## 主角：taste-skill

taste-skill 出自一位叫 Leon Lin（GitHub 上是 Leonxlnx，X 上是 @LexnLin）的开发者之手，他自称是个住在慕尼黑的 16 岁"vibecoder"。项目 2026 年 2 月上线后迅速蹿红，一度冲上 GitHub Trending 前十，目前 star 数已经三万多。MIT 协议，开源。

它的口号很直白："**gives your AI good taste. stops the AI from generating boring, generic slop**"（给你的 AI 一点品味，别再生成无聊的通用垃圾）。

### 怎么装、怎么用

```bash
# 装全套
npx skills add https://github.com/Leonxlnx/taste-skill

# 只装旗舰技能
npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"
```

装完之后，智能体在做前端任务时会自动把它读进去。你也可以干脆把某个 `SKILL.md` 复制进项目，或者直接粘到 ChatGPT / Codex 的对话里——它就是一份文本，没有魔法。

### 三个"旋钮"

taste-skill 最有辨识度的设计，是它旗舰技能开头的三个 1–10 的可调参数，智能体会把它们当全局变量读：

- **DESIGN_VARIANCE（设计变化度）**：1 = 完美对称，10 = 艺术化混乱；
- **MOTION_INTENSITY（动效强度）**：1 = 静态，10 = 电影级 / 物理动效；
- **VISUAL_DENSITY（视觉密度）**：1 = 美术馆般空灵，10 = 驾驶舱般密集。

默认值是 8 / 6 / 4。你可以在每次提示里临时覆盖，比如"做个仪表盘，VISUAL_DENSITY 拉到 9，MOTION_INTENSITY 降到 2"。这种"旋钮化"的体验，是它区别于其它同类的最大特点——你能像调音台一样实时拧。

（一个小提醒：旋钮值并不做校验，你写个 11 它会静默当成 8–10 处理。另外只有旗舰技能有旋钮，其它变体是固定规则。）

### 硬规则

正文则是一长串非常有主见的硬性规则，比如：

- 在"高级 / 创意"调性下**禁用 Inter 字体**，改用 Geist、Outfit、Satoshi 这类；
- **禁用"AI 紫蓝渐变"**（项目里管这叫 "THE LILA BAN"）；
- 最多一个强调色，且饱和度低于 80%；
- 高变化度下**禁用居中 Hero**；
- 别用 `h-screen` 做全高首屏（改用 `min-h-[100dvh]`，避免 iOS Safari 上的布局跳动）；
- 动画只对 `transform` 和 `opacity` 做（走硬件加速）；
- 代码里禁用 emoji；
- 强制要求写好加载 / 空 / 错误三种状态。

它还附了一份"创意武器库"——bento 网格、磁吸按钮、视差倾斜卡片、滚动劫持、动态排版等高级 UI 模式的参考词汇。

### 一组变体

除了旗舰款，taste-skill 还内置了一批针对不同场景的变体：`gpt-taste`（为 GPT/Codex 调校得更严格）、`image-to-code`（图片转代码流水线）、`redesign-existing-projects`（先审计再重设计）、以及 soft / minimalist / brutalist 几种固定美学风格。目前旗舰款在做一次大改写（v2，实验中），新增了"先读懂场景再写代码"的简报推断、暗色模式协议、超范围清单（明确说自己**不适合**仪表盘、数据表、多步表单），还把破折号 em-dash 全面禁掉了——因为这是测试中 AI 最常露馅的"风格破绽"。

如果你想要稳定，可以锁定老版本 `design-taste-frontend-v1`。

## 对手一号：Anthropic 官方 frontend-design（轻量中立的起点）

聊 taste-skill 绕不开 Anthropic 官方的 frontend-design，因为后面要讲的 Impeccable 和 taste-skill，某种意义上都是站在它肩上的。

它是 Anthropic 官方 skills 仓库里的一个技能，Apache 2.0 开源，由 Applied AI 团队的 Prithvi Rajasekaran 和 Alexander Bricken 编写。它是整个生态里安装量最大的设计技能——官方插件页显示已经八十多万次安装，挂着 "Anthropic Verified" 的认证。

```bash
npx skills add https://github.com/anthropics/skills --skill frontend-design
```

但它最大的特点是**极简**：整个文件只有约 42 行、4 KB 出头，没有脚本、没有参考文件、没有设计 token、不带任何具体数值。

它给的不是规则，是**思维框架**。核心是"先想清楚再写代码"的四步：

1. **Purpose**——这个界面解决什么问题，给谁用？
2. **Tone**——从一串极端里挑一个：极简到残酷、极繁到混乱、复古未来、有机自然、奢华精致、玩具感、杂志编辑风、粗野主义……
3. **Constraints**——框架、性能、可访问性的约束；
4. **Differentiation**——什么让它令人难忘？

它最出名的一句话是：**"Bold maximalism and refined minimalism both work — the key is intentionality, not intensity."**（大胆的极繁和精致的极简都行，关键是意图，不是强度。）

它也有软性禁令——别用 Inter / Roboto / Arial、别用白底紫渐变、别用千篇一律的布局——但都是"方向性"的提醒，不是 taste-skill 那种"饱和度必须低于 80%"的硬约束。

**这是它和 taste-skill 最本质的分野**：Anthropic 给你"方向"（选一个极端、要有意图），但不给数字、不给禁用清单、不给可调旋钮；taste-skill 则把方向固化成了能直接执行的硬规则和旋钮。前者是"创意提示"，后者是"带强制力的设计规范"。

它的好处是官方背书、零配置、即装即用、开源可改，适合当**任何前端任务的默认起点**。短板也来自它的轻：它倾向于"以整页的尺度思考"，你只想改个小组件它可能会过度发挥；它会和你已有的严格设计系统打架；而且第一次生成仍可能滑回默认值，需要你再让它自审一遍。说到底，它坦坦荡荡地承认自己就是"约 50 行 markdown"。

有一点值得提醒：网上有些文章说它集成进了 Claude Cowork，但这一点在 Anthropic 官方文档里查不到证据，官方只列了 Claude Code、Claude.ai 的 artifacts 和 API 三个渠道，引用时建议谨慎。

## 对手二号：Impeccable（重度武装的那个）

如果说 Anthropic 是最轻的一端，那 Impeccable 就是最重的一端，也是 taste-skill 真正的正面对手。

它的作者来头不小——Paul Bakaus，jQuery UI 的创造者、前 Google Chrome DevTools 产品负责人、AMP 和 Web Stories 的发起人。Apache 2.0 协议，README 里明确写着"基于 Anthropic 原版 frontend-design 技能扩展"。它增长也猛，3 月初才一万 star，现在已经三万五千多。

Impeccable 的核心洞察是一个很妙的概念——**词汇鸿沟（vocabulary gap）**。Bakaus 说："你没法要求'更多的垂直韵律（vertical rhythm）'，如果你压根不知道这个词存在的话。" 不懂"带色中性色（tinted neutrals）"这种术语的开发者，根本无法向 AI 表达这类诉求。所以 Impeccable 不是叫 AI"更有创意"，而是**把一整套专业设计词汇和规则注入上下文，让人和 AI 共享同一套设计语言**。它把自己定位成"夹在你的意图和 AI 执行之间的一层词汇"。

它的工程化程度也远超前两者，几乎是个完整的软件项目：

- 1 个核心 skill + 7 个领域参考文件（排版、色彩对比、空间、动效、交互、响应式、文案）；
- **23 条 slash 命令**：craft、shape、critique、audit、polish、bolder、quieter、harden、animate、colorize……生成完还能 `/audit` 检查、`/polish` 打磨、`/distill` 精简；
- 一个命令行检测器（`npx impeccable detect`），41 条确定性规则，输出 JSON、带 CI 退出码，能直接进流水线门禁；
- 一个 Chrome 浏览器插件检测器；
- 还区分 **brand（营销页）和 product（应用 / 后台）两种语域**，规则随之切换。

具体规则上它和 taste-skill 高度重叠：用 OKLCH 色彩、永不用纯黑纯白（每个中性色都向品牌色微调）、行长 65–75 字符、卡片是"懒人答案"、嵌套卡片永远是错的、动效禁 bounce 和 elastic、文案禁 em-dash……几乎是一份共识清单。

它的强项是成熟度和章法——命令工作流让迭代有据可依，CLI 检测能进 CI，支持十几种智能体，而且本地运行、无遥测，对医疗金融这类合规场景友好。

短板也明显：上手有门槛（必须先 `teach` 一遍、写好 PRODUCT.md 才能开工）；7 个参考文件每次会话要吃掉八千到一万五千 token，对一次小修改来说偏重；说到底，规则就是"Paul Bakaus 的品味被编码成了规则"，用它就等于接受他的审美偏好。有意思的是，它早期最大的争议是"官网自己的设计被嫌不好看"——不过作者回应得很积极，很快迭代修复了。

## 三者放在一起，怎么选

把它们摆在一条"从轻到重"的光谱上，会非常清楚：

| | Anthropic frontend-design | taste-skill | Impeccable |
|---|---|---|---|
| **定位** | 轻量中立的起点 | 旋钮化的硬规则 | 词汇层 + 命令工作流 |
| **体量** | 约 42 行，纯原则 | 中等，规则 + 变体 | 重型，skill + 参考 + 23 命令 + CLI |
| **交互范式** | 思维框架，给方向 | 三档旋钮 + 多变体 | 23 条 slash 命令 + 双语域 |
| **硬约束** | 软性禁令为主 | 硬编码数值规则 | 确定性规则 + CLI 检测 |
| **模型适配** | 通用 | 有 gpt-taste 专用变体 | 一份源码编译成多 provider |
| **上手成本** | 即装即用 | 即装即用，旋钮可动态调 | 需先 teach / 写 PRODUCT.md |
| **协议 / 背书** | Apache 2.0，官方 | MIT，社区 | Apache 2.0，资深从业者 |

给 vibe coder 的选型建议，其实很简单：

- **默认起点**：装 Anthropic frontend-design。零成本、官方背书、先把"地板"抬起来。
- **想要旋钮化的实时控制，或者主要用 GPT / Codex**：选 taste-skill，尤其它的 `gpt-taste` 变体是专门为这类模型调的。
- **想要命令式工作流 + CI 门禁、团队协作、合规场景**：选 Impeccable，它的章法和工程化是最强的。

而且最重要的一点：**这些 skill 是可以叠加的，互补而不冲突**。你完全可以用 Anthropic 抬地板、再叠一个 taste-skill 或 Impeccable 强化审美，甚至再加 Vercel 的 `web-design-guidelines` 做可访问性和性能的技术正确性审查。

## 最后泼一盆冷水

聊了这么多，有几句实在话得说在前面，免得你期望过高：

**第一，这些归根结底"只是 prompt"。** 它们能影响模型，但无法强制模型。同一个 skill，换个模型、换个提示，结果可能天差地别。它们抬高的是"地板"，不是"天花板"——指望装上就出大师作品，不现实。

**第二，"规则"不等于"品味"。** 知道 "tinted neutrals" 这个词，不等于知道什么时候该用它。这些清单反映的是作者群体的审美共识，不是宇宙真理。所谓 "AI slop" 的判定本身就很主观——今天被禁的紫渐变，换个语境也许正合适。

**第三，人工终审省不掉。** 没有哪个 skill 带确定性保证（Impeccable 的 CLI 检测是最接近的，但也只覆盖得了反模式）。最后那一眼，还得你自己来看。

**第四，留意它们和你已有设计系统的冲突。** 如果你的项目已经在用 Material / Fluent / 自家 token，这些 skill 会和你的规范打架。要么别装，要么 fork 一份把规则对齐到自己的 token 再用。

说到底，这一类工具最务实的用法是：**把它当成一个会把你的输出从"平庸均值"往"专业原则"推一把的助手，而不是一个替你拿主意的设计师。** 它值不值得留下，标准只有一个——装上之后，你的代码评审结果有没有变得更好。有，就留；没有，就删。

---

*本文涉及的 star、安装量等数据增长很快，文中数字截至 2026 年 6 月初，请以各项目官方页面的实时数据为准。taste-skill v2 仍在迭代中，具体规则可能调整。*
