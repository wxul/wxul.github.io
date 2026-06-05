---
title: DeepSeek V4-Pro 性能分析：开源模型登顶 LiveCodeBench 与 Codeforces
date: 2026-04-24
badge: AI
tags: ["AI", "LLM", "Coding"]
draft: false
---

**DeepSeek 于 2026 年 4 月 24日 发布的 V4-Pro 预览版，以 1.6 万亿参数 MoE 架构、1M 超长上下文和 Muon 优化器训练，在 LiveCodeBench（93.5）与 Codeforces（3206）两项代码竞赛基准上反超 GPT-5.4、Gemini-3.1-Pro 和 Claude Opus-4.6，成为目前最强的开源模型。** 但在通用知识（MMLU-Pro 87.5）、HLE（37.7）和超长上下文检索（MRCR 1M 83.5）上仍落后闭源前沿模型。该模型沿用 MIT 许可开源权重，在单 token 推理上比 V3.2 节省 73% FLOPs 和 90% KV 缓存，延续了 DeepSeek "以架构效率对抗暴力堆算力" 的路线。以下数据均来自 Hugging Face 官方模型卡（deepseek-ai/DeepSeek-V4-Pro）及随附的 DeepSeek\_V4.pdf 技术报告，社区评测部分来自 Reuters、Decrypt 等二手信源。

## 双模型架构与关键技术创新

DeepSeek V4 系列采取 "Pro + Flash" 双规格布局：**DeepSeek-V4-Pro 总参 1.6T、激活 49B**；**DeepSeek-V4-Flash 总参 284B、激活 13B**。两者均原生支持 **1,000,000 token 上下文**。模型采用 FP8 混合精度（Base 版）或 FP4 + FP8 混合精度（Instruct 版，MoE 专家参数走 FP4），HF 仓库显示的 862B 参数尺寸即为 FP4 量化后的实际文件体量。

架构层面有三项核心升级。第一是**混合注意力机制**，将 Compressed Sparse Attention (CSA) 与 Heavily Compressed Attention (HCA) 组合使用，在 1M token 场景下 V4-Pro 的单 token 推理 FLOPs 仅为 V3.2 的 **27%**，KV 缓存仅为 **10%**——这是整代更新最具工程含金量的数字。第二是 **Manifold-Constrained Hyper-Connections (mHC)**，在传统残差连接上加流形约束，提升跨层信号传播稳定性同时保留表达能力。第三是首次在旗舰模型上使用 **Muon 优化器**取代 AdamW 类方法，带来更快的收敛速度和训练稳定性。

预训练语料达 **32 万亿 token**（V3 为 14.8T，翻倍有余），后训练采取两阶段范式：先通过 SFT 与 GRPO 独立培养各领域专家模型，再用 on-policy distillation 将这些专家合并为统一模型。Instruct 版支持三档推理强度：**Non-think**（直答）、**Think High**（显式思维链）与 **Think Max**（推至能力上限，需至少 384K 上下文窗口）。

## Base 模型基准：对标 V3.2 的大幅跃迁

在 Base 模型对比中，V4-Pro-Base 相对 V3.2-Base 呈现全面上扬，但并非每项都领先：

| 指标  | V3.2-Base (671B/37B) | V4-Flash-Base (284B/13B) | V4-Pro-Base (1.6T/49B) |
| --- | --- | --- | --- |
| MMLU | 87.8 | 88.7 | **90.1** |
| MMLU-Pro | 65.5 | 68.3 | **73.5** |
| C-Eval | 90.4 | 92.1 | **93.1** |
| HumanEval (Pass@1) | 62.8 | 69.5 | **76.8** |
| BigCodeBench | **63.9** | 56.8 | 59.2 |
| GSM8K | 91.1 | 90.8 | **92.6** |
| MATH | 60.5 | 57.4 | **64.5** |
| SuperGPQA | 45.0 | 46.5 | **53.9** |
| FACTS Parametric | 27.1 | 33.9 | **62.6** |
| LongBench-V2 | 40.2 | 44.7 | **51.5** |
| Simple-QA verified | 28.3 | 30.1 | **55.2** |

最引人注目的是 **FACTS Parametric 从 27.1 飙升至 62.6**（+35.5），以及 **Simple-QA verified 近乎翻倍**（28.3→55.2），显示预训练数据质量与事实性记忆有显著提升。但在 **BigCodeBench 上 V4 反而退步**（63.9→59.2），BBH（87.6→87.5）也微跌，说明规模扩张并非单调增益。

## 前沿对标：代码与编程竞赛登顶，通用知识落后

官方模型卡给出的 "V4-Pro-Max vs 前沿模型" 对比是本次发布最关键的数据（参照对象包括 Claude Opus-4.6 Max、GPT-5.4 xHigh、Gemini-3.1-Pro High、Kimi K2.6 Thinking、GLM-5.1 Thinking）：

| 基准  | Opus-4.6 Max | GPT-5.4 xHigh | Gemini-3.1-Pro | DS-V4-Pro Max |
| --- | --- | --- | --- | --- |
| MMLU-Pro | 89.1 | 87.5 | **91.0** | 87.5 |
| GPQA Diamond | 91.3 | 93.0 | **94.3** | 90.1 |
| HLE | 40.0 | 39.8 | **44.4** | 37.7 |
| **LiveCodeBench** | 88.8 | —   | 91.7 | **93.5** |
| **Codeforces Rating** | —   | 3168 | 3052 | **3206** |
| HMMT 2026 Feb | 96.2 | **97.7** | 94.7 | 95.2 |
| IMOAnswerBench | 75.3 | **91.4** | 81.0 | 89.8 |
| **Apex Shortlist** | 85.9 | 78.1 | 89.1 | **90.2** |
| SimpleQA-Verified | 46.2 | 45.3 | **75.6** | 57.9 |
| SWE Verified | **80.8** | —   | 80.6 | 80.6 |
| SWE Multilingual | **77.5** | —   | —   | 76.2 |
| MRCR 1M | **92.9** | —   | 76.3 | 83.5 |
| Terminal Bench 2.0 | 65.4 | **75.1** | 68.5 | 67.9 |
| BrowseComp | 83.7 | 82.7 | **85.9** | 83.4 |
| GDPval-AA (Elo) | 1619 | **1674** | 1314 | 1554 |

**三项明确领先**：LiveCodeBench 93.5（+1.8 vs Gemini）、Codeforces 3206 分（高出 GPT-5.4 38 分）、Apex Shortlist 90.2。这把 V4-Pro-Max 坐实为**当前代码竞赛基准上的最强模型**，且是开源模型首次在主流代码榜单上同时超过 OpenAI、Anthropic 和 Google 的旗舰。

**高度竞争力但未夺冠**：SWE Verified 80.6 与 Gemini 并列、距 Opus 仅 0.2 分；IMOAnswerBench 89.8 远超 Opus 的 75.3，但输给 GPT-5.4 的 91.4；HMMT 95.2 紧追 97.7。

**明显落后**：MMLU-Pro（87.5 vs Gemini 91.0）、HLE（37.7 vs Gemini 44.4）、Apex 主榜（38.3 vs Gemini 60.9，差 22.6 分）、SimpleQA-Verified（57.9 vs Gemini 75.6）、MRCR 1M 长上下文（83.5 vs Opus 92.9）、GDPval-AA 经济价值任务（1554 Elo vs GPT-5.4 1674）。**这些差距基本集中在 "通用知识广度" 和 "极限长上下文保真度" 两个维度**，与 DeepSeek 历代"重推理、轻知识"的画像一致。

## 推理效率、训练与部署成本

V4 最硬核的工程卖点是**长上下文推理成本的大幅下降**。官方披露在 1M token 设置下，V4-Pro 单 token 推理 FLOPs 仅为 V3.2 的 27%、KV 缓存仅为 10%。对于跑长代码库、整段法律文档、整本书分析等场景，这意味着吞吐可提升 3–10 倍，显存压力也显著减轻。FP4 量化版模型体积约 862B 参数大小（HF 显示），社区报告**双张 RTX 4090 或单张 RTX 5090 可在量化后本地运行**，尽管实际交互速度有限。

**训练成本官方未披露**，但基于架构延续 DeepSeek 一贯的效率路线（V3 以 557.6 万美元、2.788M H800 GPU 小时训练 14.8T token），32T token 的 V4 训练成本预计在 1500–3000 万美元量级，仍然比 GPT-4 级别的 1 亿美元+ 低约一个数量级。Reuters 在 2026 年 4 月 3 日报道 V4 将在**华为 Ascend 950PR 芯片**上运行训练与推理，凸显中国厂商绕开 Nvidia 管制的路径。

**API 定价（官方数据）**，DeepSeek 官方 API 提供 Flash 与 Pro 两档定价。V4-Pro：缓存命中输入 1元/M tokens，缓存未命中输入 12元/M tokens，输出 24元/M tokens；V4-Flash：缓存命中输入 0.2元/M tokens，缓存未命中输入 1元/M tokens，输出 2元/M tokens。按当前汇率（约7.25）换算，V4-Pro 输出约合 $3.3/M tokens，V4-Flash 输出约合 $0.28/M tokens。相比 Claude Opus 4.6 的 $15/M 输出，Pro 版成本约为其 1/4.5，Flash 版则低至 1/50。两款模型均支持 1M 上下文、384K 最大输出、Tool Calls 及 JSON Output，API 兼容 OpenAI 和 Anthropic 双格式（api.deepseek.com 与 api.deepseek.com/anthropic）。

## 社区反馈与使用体验的初步画像

由于 V4-Pro 权重刚登上 Hugging Face（发布时关注数仅 30，126k 为组织粉丝数），独立第三方评测尚未大规模展开。目前可见的信号有几类。

**发布前的泄漏与内测口碑普遍积极**：Decrypt、Financial Express、The Information 等媒体从 1 月起多次援引内部测试称 V4 在代码任务上超越 Claude 与 GPT 系列，尤其在"长代码 prompt 处理"上有突破。r/DeepSeek、r/LocalLLaMA 早在 3 月就开始囤积 API credits 等待发布。V4-Lite 在 4 月初的 API 测试节点上被开发者报告"128K 上下文召回率从 V3.2 的 45% 提升到 94%"，这与官方 LongBench-V2 从 40.2 跃升至 51.5 的趋势吻合。

**批评声也并存**。2025 年 4 月一篇题为 "DeepSeek Sucks—And I'm Done Pretending It Doesn't" 的 Medium 长文曾在 Reddit 热传，控诉 DeepSeek 模型产生 "样板套话加 bug" 和 "幻觉出不存在的库"。社区普遍预期 V4-Pro 的真实代码表现需在 Cursor、Cline、Claude Code 等实际 agentic 脚手架中复现，才能验证 LiveCodeBench 93.5 是否存在基准污染或 scaffold 依赖问题——OpenAI 在 4 月初就公开质疑所有前沿模型在 SWE-bench Verified 上的训练数据污染风险。

## V4-Pro 的强项、短板与对用户的实际含义

**真正突出的三个领域**是代码生成与竞赛编程（LiveCodeBench 与 Codeforces 双冠）、数学竞赛（HMMT、IMOAnswerBench、Apex Shortlist 均在 89–95 区间，与 GPT-5.4 互有胜负）、以及长上下文推理的工程效率（1M 上下文下 FLOPs/缓存成本大幅领先同级模型，这不是得分而是 $/token 优势）。对于**跑整库级代码重构、竞赛级算法题、大规模数学证明辅助**的用户，V4-Pro-Max 很可能是当前性价比最高的选择。

**相对不足的三个领域**。一是**通用世界知识与事实问答**，MMLU-Pro 落后 Gemini-3.1-Pro 3.5 分、SimpleQA-Verified 落后 17.7 分，说明预训练语料在知识广度上仍与 Google、Anthropic 的内部数据存在代差。二是**极限长上下文的"真读懂"能力**，MRCR 1M 得分 83.5 明显逊于 Opus 4.6 的 92.9，即虽然窗口开到 1M，但在密集信息检索场景准确率仍有差距。三是**高复杂度 agentic 与经济价值任务**，Apex 主榜 38.3 仅为 Gemini 的 63%，GDPval-AA Elo 落后 GPT-5.4 120 分；这意味着在长程多工具工作流（如端到端客服、复杂数据分析、企业级 browsing）里 V4-Pro 还不是首选。

## 结论：开源阵营首次在代码基准上翻越闭源天花板

V4-Pro 的意义在于两点。第一，它是**第一个在 LiveCodeBench 和 Codeforces 上同时击败 GPT-5.4、Claude Opus 4.6 和 Gemini-3.1-Pro 的开源模型**，把"开源 vs 闭源"的差距在这条赛道上从"落后一代"压缩到"局部反超"。第二，它验证了 DeepSeek 的工程路线——**靠稀疏注意力、流形约束连接和新优化器把长上下文 FLOPs 砍到 27%**，而不是盲目堆算力——这种"算法红利大于算力红利"的方法论，对在 Nvidia 受限环境下运营的中国 AI 实验室有战略意义。

但也要看到，V4-Pro 仍是**典型的"专才型旗舰"**：代码与数学封顶，知识与长上下文保真度与真正的 agentic 任务上离 Gemini-3.1-Pro、GPT-5.4 还有半代差距。对开发者的实际建议是：**代码 / 数学 / 预算敏感场景优先选 V4-Pro，企业知识库 / 客服 agent / 多工具长程工作流场景继续选 Claude Opus 或 Gemini**。随着社区在未来几周发布独立第三方评测，这一判断可能进一步细化——但至少在发布首日，开源阵营已经把旗帜插上了代码竞赛的山顶。
