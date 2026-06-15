---
title: OpenRouter Fusion 拆解：把「多模型审议」做成一个可直接调用的 API
date: 2026-06-15
badge: AI
tags: ["AI", "OpenRouter", "Fusion", "LLM", "Router"]
draft: false
---

## 一、Fusion 到底是什么：不是一个模型，而是一条流水线

很多人第一次在 OpenRouter 的模型列表里看到 `openrouter/fusion` 时，会下意识把它当成又一款新的大语言模型。这种理解是错的。

Fusion 是 OpenRouter 于 **2026 年 6 月 13 日** 正式上线的一项原生功能，官方将其定位为 **「多模型审议系统」（multi-model deliberation）** 或 **「复合模型 API」（compound model API）**。它在官网导航中和 Models、Chat、Rankings 并列，是一级入口；模型卡片明确标注 Provider 为 OpenRouter 自家，上下文窗口 128K（[openrouter.ai/fusion](https://openrouter.ai/fusion)、[openrouter.ai/openrouter/fusion](https://openrouter.ai/openrouter/fusion)）。

简单说：当你向 `openrouter/fusion` 发一个提示时，背后并不是某一个具体模型在回答你，而是 **一个由最多 8 个模型组成的「专家面板」先各自独立作答，然后由一个 judge 模型对这些回答做结构化对比，最后再由一个 synthesizer 综合成终稿**。

它和你过去理解的「路由器」或「模型聚合器」完全不是同一类东西——后者通常是「从 N 个模型里挑一个最合适的来回答」，而 Fusion 是 **让 N 个模型都回答，再对比、再综合**。

## 二、三个入口，一条流水线

Fusion 给开发者提供了三种使用姿势，但官方文档反复强调：「All three entry points hit the same pipeline.」（[plugins/fusion](https://openrouter.ai/docs/guides/features/plugins/fusion)）

1. **模型别名** `openrouter/fusion`——最简单。你像调用普通模型一样直接传 slug，OpenRouter 帮你跑完整条流水线。
2. **服务器工具** `openrouter:fusion`——目前仍标记为 **beta**。允许任何模型把 Fusion 当成可调用的工具，由模型自己决定何时审议。
3. **Fusion 插件**——配置层，用来调整 panel 模型清单、judge、是否启用 web 检索等参数。

底层的 router 当前包含 6 个模型；`analysis_models` 字段允许指定 1–8 个面板成员（[fusion-router](https://openrouter.ai/docs/guides/routing/routers/fusion-router)）。

## 三、工作流程拆解：Panel → Judge → Synthesizer

官方文档把过程拆为三个阶段，也可以细分为六步。核心逻辑如下：

**第一阶段：Panel（并行作答）**
用户的提示被并行发给面板中的每个模型。默认 Quality 预设下，面板是 **Claude Opus Latest、GPT Latest、Gemini Pro Latest** 三家最新版同台。每个面板模型都会自动启用 `openrouter:web_search` 与 `openrouter:web_fetch` 两个服务器工具，因此它们都可以在回答前去互联网取证。

**第二阶段：Judge（结构化对比）**
所有面板回答返回后，由一个 judge 模型读取。注意：**这里 OpenRouter 反复强调「judge compares them — it doesn't merge them」**。judge 并不输出最终答案，而是输出一段结构化 JSON，列出五项内容：

- **Consensus**：哪些点是多个模型一致认同的
- **Contradictions**：哪些点彼此矛盾
- **Partial coverage**：哪些细节只有部分模型提到
- **Unique insights**：哪些独到见解
- **Blind spots**：哪些显著盲点

默认情况下，judge 就是面板里的第一个模型（即 Claude Opus Latest）。

**第三阶段：Synthesizer（撰写终稿）**
最后由 synthesizer / 调用模型基于 judge 的 JSON 写出真正回给用户的答案。

整条流水线的意义在于：它把「多模型集成」从拼接式的暴力合并，升级成了 **「先对比、后撰写」** 的两层架构。模型之间的冲突不会被掩盖，反而会显式暴露给 judge 与 synthesizer 处理。

## 四、参数与能力速查

| 项目 | 取值 |
| --- | --- |
| 提供方 | OpenRouter（自有） |
| 上下文窗口 | 128K |
| 面板规模 | 1–8 个模型 |
| 默认 Quality 预设 | Claude Opus Latest / GPT Latest / Gemini Pro Latest |
| Router 当前包含模型数 | 6 |
| 面板检索能力 | 默认启用 web_search + web_fetch |
| 服务器工具状态 | beta（API 与行为可能变化） |
| 模型别名页价格 | $0/M token（实际按底层调用计费） |
| 发布日期 | 2026-06-13 |

## 五、定价模型：别名是「$0」，账单可不一定

Fusion 的计费方式是这次产品里最容易被误解的部分。

官方页 `openrouter/fusion` 上显示价格为 **$0/M token**，但这并不意味着它免费。文档原文说得很直接：**「priced as the sum of those underlying completions rather than a single model.」**——你支付的，是面板内所有补全调用的总和，再加上 judge 和 synthesizer 的调用。

OpenRouter 给出的经验值是：在 **默认 3 模型面板** 下，Fusion 的总成本大约是同一提示直接调用单个模型的 **4–5 倍**，而且 **「Cost scales linearly with panel size」**——你把面板扩到 6 个模型，成本就会按比例增长。

这一点对企业用户尤其重要：Fusion 的边际成本结构与传统单一模型完全不同，必须在用户体量和回答价值之间做加减法。它适合那些「宁可多花 5 倍钱也要把一次回答做对」的场景；如果是大流量、低价值的常规问答，单模型 + RAG 仍然更划算。

## 六、性能与对比：DRACO 基准上的两组关键数字

OpenRouter 在发布 Fusion 时配套放出了一组基准数据，主要跑的是 Perplexity 提出的 **DRACO 深度研究基准**（100 个任务、10 个领域）。

最受关注的两组对比：

- **Quality 路线**：以 Fable 5 + GPT-5.5 组成面板，由 Opus 4.8 合成，得分 **69.0%**；作为对照，单独跑 Fable 5 是 **65.3%**。
- **Budget 路线**：以 Gemini 3 Flash + Kimi K2.6 + DeepSeek V4 Pro 组成预算面板，得分 **64.7%**。这组数字在 DRACO 上既击败了 GPT-5.5、也击败了 Claude Opus 4.8，与 Fable 5 仅差不到 1 个百分点，**而成本约为 Fable 5 单跑的一半**（[fusion-beats-frontier](https://openrouter.ai/blog/announcements/fusion-beats-frontier/)、[officechai 报道](https://officechai.com/ai/openrouter-launches-fusion-api-which-uses-a-combination-of-models-to-achieve-fable-like-performance-at-half-the-price/)）。

如果这些数字成立，意味着两件事：第一，**多模型审议确实可以把一组中等模型抬到接近前沿模型的水平**；第二，**前沿单一模型的「性价比上限」并不是终点**。

但请务必注意以下几点免责声明：

1. 所有性能数字 **完全来自 OpenRouter 自报基准**，没有独立第三方复现。
2. OpenRouter 自承用 **Gemini 3.1 Pro Preview** 替换了 DRACO 原论文的 Gemini 3 Pro 作 judge；DRACO 作者本人指出，更换 judge 可能造成 10–25 分的分数波动。因此该分数与 DRACO 原论文 **不能直接横向比较**。
3. 面板模型可以走 web_search，理论上可能在搜索过程中触达评分细则，使分数偏乐观。

换句话说，64.7% 和 69.0% 这两个数字应该被当作 **「在 OpenRouter 自家设置下的厂商口径成绩」**，而不是「全球客观排名」。

## 七、Fusion 与传统路由 / 聚合的关键差异

为了避免概念混淆，把 Fusion 放在更大的「多模型基础设施」光谱里看：

- **传统路由器**（如基于成本 / 延迟 / 标签挑选模型）：从 N 个模型中 **挑一个** 回答 → Fusion 让 **N 个全部** 回答。
- **Mixture-of-Experts（MoE）**：在模型内部不同 token 走不同子网络 → Fusion 在 **模型之间** 做加权与对比，颗粒度是「模型」。
- **传统集成（ensemble / 投票）**：直接对输出做平均或多数表决 → Fusion 的 judge **不合并文本**，而是输出 JSON 化的对比报告，把决策留给 synthesizer。

这种「先比较、再撰写」的两层结构，是 Fusion 与同类产品最本质的差别。

## 八、典型使用场景与不适用场景

**适用：**

- 深度研究、文献综述、跨源事实核查
- 多视角对比型问题（同一个话题想看不同模型怎么说）
- 单模型容易出盲点或幻觉的高风险问答
- 需要 web 取证的回答（默认就开了 web_search/web_fetch）

**不适用（或慎用）：**

- 高频、低价值的对话任务——成本会被线性放大 4–5 倍
- 极低延迟场景——三阶段流水线意味着 **至少 3 轮调用**，TTFT 与端到端延迟必然高于单模型，且官方尚未公布延迟数据
- 强一致性、确定性输出场景——审议过程引入了额外的不可控环节

## 九、已知问题与开放疑问

研究过程中收集到的、值得关注的待办清单：

1. **没有独立第三方基准。** 截至目前，DRACO 之外的 GPQA、HELM、SWE-bench、SimpleQA 等基准上都没有公开的 Fusion 数据。「击败前沿模型」是单一来源主张，理性的做法是把它当作市场宣传而不是结论。
2. **Beta 状态。** `openrouter:fusion` 服务器工具页明确写着 beta，意味着接口签名、行为、定价都可能在没有提前通知的情况下变化。
3. **数据合规与隐私。** 面板默认会把同一提示发给三家不同厂商（Anthropic / OpenAI / Google）。如果你的提示包含敏感数据，必须确认 OpenRouter 与底层厂商各自的数据留存与训练政策能否满足合规要求。
4. **降级策略未公开。** 当面板里某个模型超时或拒答时如何降级？OpenRouter 暂未公开 SLA 与错误处理细节。
5. **judge / synthesizer 是否可独立指定。** 文档主要描述了 `analysis_models` 与 `model`（judge），但 synthesizer 在工程实现上是否就是 judge 的同一次调用，目前公开材料表述并不完全一致。
6. **社区反馈样本太小。** 距离 6 月 13 日发布仅数日，HackerNews、Reddit 与独立评测社区都尚未给出系统性反馈，主要二手信息源仍是 officechai、digg、KuCoin、cryptobriefing 等转述。

## 十、结语：值不值得用

Fusion 的核心想法既不新——多模型集成是学界老话题——也很新：把「先比较、后撰写」做成一个像普通模型一样调用的 API，并且把 web 检索默认装在每个面板成员身上，让审议过程天然带「取证能力」。这在 2026 年中这个时间点上是一个相当克制、相当工程化的产品决策。

但目前公开材料里的所有性能优势都是 **OpenRouter 自家口径**。如果你正在评估是否把 Fusion 引入生产系统，比较稳妥的路径是：

1. 用你自己的真实任务，对 Fusion、Fable 5、Opus 4.8、GPT-5.5 做一组 A/B；
2. 把成本因子直接打进评估指标里（Fusion 是单模型 4–5 倍）；
3. 别让 beta 状态的服务器工具进核心链路，先从 `openrouter/fusion` 这个稳定别名开始用。
