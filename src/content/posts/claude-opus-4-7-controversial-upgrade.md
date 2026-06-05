---
title: Claude Opus 4.7:一次高调但充满争议的升级
date: 2026-04-18
badge: AI
tags: ["AI", "Claude Code", "LLM"]
draft: false
---

**Anthropic 于 2026 年 4 月 16 日发布 Claude Opus 4.7,在编码与智能体任务上重夺通用可用模型王座,但同时公开承认它"广泛能力不如"自家未发布的 Mythos Preview。** 这次更新对 SWE-bench Pro 提升了近 11 个百分点、视觉分辨率翻了三倍、并新增"xhigh"推理档位;然而伴随而来的是一场关于 Opus 4.6 被"阉割"(nerfing)的信任危机、长上下文检索大幅回退,以及对 Anthropic 双轨发布策略的广泛质疑。Opus 4.7 定位清晰——面向生产级智能体编码的聚焦升级,而不是全面领先的"碾压级"发布。与 GPT-5.4、Gemini 3.1 Pro 的竞争已进入逐项拉锯阶段,而 Mythos 的存在则让这场发布本身被不少评论者形容为"为 Mythos 打广告"。

## 发布与定位:双轨策略下的"二号机"

Opus 4.7 延续了 Anthropic 约两个月一次的迭代节奏(**4.5 于 2025 年 11 月,4.6 于 2026 年 2 月,4.7 于 2026 年 4 月 16 日**)。它并非新一代模型,而是对 Opus 4.6 架构的直接升级。API 模型 ID 为 `claude-opus-4-7`,定价保持不变——**每百万输入 token 5 美元、输出 25 美元**,prompt caching 可省 90%,Batch API 再砍 50%。模型已同步上线 claude.ai、Anthropic API、Amazon Bedrock、Google Vertex AI、Microsoft Foundry 以及 GitHub Copilot(Pro+/Business/Enterprise,启动促销 7.5 倍请求乘数至 4 月 30 日)。

真正耐人寻味的是公司语气。Anthropic 在官方博客中罕见地主动承认 Opus 4.7"**不如我们最强的 Claude Mythos Preview 广泛能力强**"——后者是 4 月 7 日通过 Project Glasswing 向 Apple、Google、Microsoft、思科、摩根大通等约 11 家伙伴有限开放的前沿模型,不公开发售。Gizmodo 因此讥讽:"大胆的策略啊——把新发布宣传成比另一个选项'能力更弱'的水货版本。"Brave New Coin 则写道,Anthropic"花了大量发布篇幅提醒所有人它金库里还锁着一个更好的"。这种定位让 Opus 4.7 带着一种"过渡品"气质,也让它承担起 Mythos 级安全护栏的实地测试任务。

## 技术规格与工程细节

Opus 4.7 维持 **1,000,000 token 上下文窗口**(仍为 Gemini 3.1 Pro 2M 的一半)、**128K 最大输出**。最显著的架构跃升来自视觉通道——图像长边支持到 **2,576 像素(约 3.75 百万像素)**,是 4.6 的 1.15 MP 的三倍以上,坐标与实际像素 1:1 对齐,意味着计算机使用(computer-use)智能体不再"近视"。

为给开发者更细致的算力/质量调节,Anthropic 新增了 **xhigh 档位**,位于 high 与 max 之间,Claude Code 已默认切到 xhigh;加上 low、medium、high、max 共五档。同时推出公测的 **Task Budgets**,允许为整个智能体循环设定 token 预算目标(最低 20,000),模型可见倒计时,但并非硬上限。Hex CTO 称"**低档 4.7 大约等价于中档 4.6**"——这是官方合作伙伴测试里被反复引用的一句话。

有三项**破坏性 API 变更**值得迁移者警惕:扩展思考预算被移除(改用 adaptive thinking)、`temperature`/`top_p`/`top_k` 不再接受非默认值(请改用 prompting 引导)、thinking content 默认为空(需显式 `display: 'summarized'` 才可见)。此外,新分词器使同样文本变成 **1.0–1.35 倍 token**,意味着"同价"说法在实际成本上存在注水。Opus 4.7 还"**更字面地执行指令**",Anthropic 在迁移指南中明确警告:为 4.6 写的 prompt 有时会产生意外结果。

## 跑分:一次聚焦而非全面的胜利

在 Anthropic 发布的对比表里,Opus 4.7 在多数发展方向上显著领先 4.6,但相对 GPT-5.4 和 Gemini 3.1 Pro,更像是**窄而深**的胜利。

| 基准  | Opus 4.6 | **Opus 4.7** | GPT-5.4 | Gemini 3.1 Pro | Mythos Preview |
| --- | --- | --- | --- | --- | --- |
| SWE-bench Verified | 80.8% | **87.6%** | —   | 80.6% | 93.9% |
| SWE-bench Pro | 53.4% | **64.3%** | 57.7% | 54.2% | 77.8% |
| Terminal-Bench 2.0 | 65.4% | 69.4% | **75.1%\*** | 68.5% | 82.0% |
| MCP-Atlas(工具使用) | 75.8% | **77.3%** | 68.1% | 73.9% | —   |
| OSWorld-Verified(计算机使用) | 72.7% | **78.0%** | 75.0% | —   | 79.6% |
| BrowseComp(智能体搜索) | 83.7% | 79.3% ↓ | **89.3%** | 85.9% | 86.9% |
| GPQA Diamond | 91.3% | 94.2% | **94.4%** | 94.3% | 94.6% |
| HLE(带工具) | 53.3% | 54.7% | **58.7%** | 51.4% | 64.7% |
| CharXiv(带工具) | 84.7% | **91.0%** | —   | —   | 93.2% |
| CyberGym | 73.8% | 73.1% ↓ | 66.3% | —   | **83.1%** |
| GDPval-AA 知识工作(Elo) | —   | **1,753** | 1,674 | 1,314 | —   |

\*GPT-5.4 的 Terminal-Bench 由 OpenAI 自报 harness,不完全可比。

VentureBeat 总结这场交锋:在直接可比的项目上 Opus 4.7 对 GPT-5.4 **只以 7:4 略胜**。Opus 4.7 的强项集中在**智能体编码、扩展工具调用、计算机使用、金融分析与知识工作**;而 GPT-5.4 仍守住**智能体搜索与原生终端任务**,Gemini 在**多语言 Q&A(MMMLU 92.6%)和 2M 上下文**上占优。值得特别指出的两个**回退**:BrowseComp 从 83.7% 掉到 79.3%,**长上下文检索从 91.9% 骤降到 59.2%**(Anthropic 在模型卡中自揭,HN 用户 `bachittle` 捕获此点)。CyberGym 则在 Anthropic 训练阶段被"**有意削弱**",以先验证 Mythos 级网络安全护栏。

合作伙伴的内测数字同样密集:**Cursor 的 CursorBench 从 58% 跳到 70%**、**Hex 93 任务编码基准提升 13%**、**Databricks OfficeQA Pro 错误率降 21%**、**Rakuten 称生产任务解决率×3**、**Box 报告模型调用减 56%、工具调用减 50%**、XBOW 自动渗透测试的视觉辨识率**从 54.5% 飙到 98.5%**。Notion 称其为首个通过"隐式需求测试"的 Claude——不用显式告知即可推断该用哪种工具。

## 社区反应:信任赤字与"阉割"后遗症

Opus 4.7 的发布无法脱离其紧前发生的一场公关危机。**AMD AI 高级总监 Stella Laurenzo(GitHub 账号 stellaraccident)** 于 4 月初发布一份基于 **6,852 次 Claude Code 会话、234,760 次工具调用、17,871 个思考块**的数据分析,得出结论:"**Claude has regressed to the point it cannot be trusted to perform complex engineering.**"她发现 Claude 可见思考长度从 1 月的约 2,200 字符**坍缩到 3 月的约 600 字符(下降 73%)**、"读文件 / 改文件"比例从 6.6 掉到 2.0、每任务 API 调用数在 2–3 月间最多暴涨 80 倍。Fortune(4 月 14 日)、The Register、VentureBeat、PC Gamer、Inc. 都就此做了报道,把矛头对准 Anthropic 的透明度问题与是否为节省算力而偷偷降智。

这正是 Opus 4.7 发布当天 Hacker News **275 分主帖**的情绪底色。即便是正向声音——比如 `grandinquistor`("编码基准有大幅提升,进展并没有停滞")和 `muzani`("把 effort 开到 high 后质量问题全没了,token 反而更少")——也被一大串怀疑与讽刺淹没:

> "This made me LOL. They keep trying to fleece us by nerfing functionality and then adding it back next release. It's an abusive relationship at this point." —— `sleazebreeze`
> 
> "Quick everyone to your side projects. We have ~3 days of un-nerfed agentic coding again." —— `TIPSIO`
> 
> "This reads more like an advertisement for Mythos." —— `koehr`

**分布式逃离 Claude Code 的现象**反复被提及。`buildbot` 在 4.6 表现恶化后改用 OpenAI Codex:"4.6 试着查一点张量并行的简单做法,agent 零次 web fetch,硬生生幻觉了 17K 非常离谱的 token";`cmrdporcupine` 说 Codex 已经暴露出 CC 的"sloppy";`aurareturn` 甚至提出"算力危机论":"OpenAI 的 2 倍 Codex 用量上限在偷走 CC 用户,而且看来奏效了……Claude 最近 90% 的问题都是算力不足。"Anthropic 否认曾将算力转给其他项目,但这种否认未能在开发者圈站住脚。

**技术层面的批评**也很具体。一条 "Tell HN" 帖反映新上线的网络安全分类器**追溯性屏蔽了授权合法的漏洞赏金研究**——模型自身会说"这是授权研究,我将分析并起草、不制造武器化代码",但 API 级分类器依旧拦截;用户指出"Cyber Verification Program"实质上偏向已有公开 CVE 记录的研究者。新分词器 1.35× 的 token 膨胀配上更高默认思考档位,实际使订阅额度隐性变小。**Max 200 美元订户**在发布当日也抱怨 4.7 还未推送到他们的账号,`anonfunction`:"很爱啊,我花 200 美元就是为了用不上他们刚宣布的功能。"

**Simon Willison** 用他著名的"鹈鹕骑自行车"测试测 4.7,结果让位给 Qwen3.6-35B-A3B——"Opus 把自行车车架画砸了",即便切到 `thinking_level: max` 也没好到哪里去。**Andrej Karpathy** 在同期"AI 精神病"长文中将 Mythos 级能力与通用用户的感知鸿沟作为行业拐点来谈,没直接点评 4.7。一些 SEO 型博客(Vellum、Digital Applied、Lushbinary、The-AI-Corner)则普遍给出"**聚焦升级,不是横扫**"的结论。

## Mythos 阴影、安全策略与双轨争议

Anthropic 把 Opus 4.7 明确定位成 Mythos-class 安全机制的试验田——**"自动检测并阻止被禁或高风险网络安全使用的护栏"首次在这一代内置**。对真正的安全研究者,公司开放了新的 Cyber Verification Program。这种双轨安排激起两派反应。Gizmodo、Brave New Coin、9to5Google、Axios 一致认为发布稿"把新模型说成比另一选项更弱"实在诡异;HN 上多位用户把 Mythos 的封存类比成 **OpenAI 当年 GPT-2 的"太危险不能释放"营销**,`CodingJeebus` 讽刺"这种'我们为安全不能放出来'的套路已经是 POC or STFU 的加强版了"。

另一方面,Council on Foreign Relations 与部分安全研究者(包括 Dan Hendrycks)把 Mythos 级能力(据报道可发现大量零日,包括一个 **27 年的 OpenBSD 漏洞**和 **16 年的 FFmpeg 漏洞**;对 Firefox 找出 **181 个可利用漏洞**对比 Opus 4.6 的 2 个)视作对关键基础设施的严肃战略挑战。Cal Newport 则指出大部分"新能力"其实在 Opus 4.6 的发布说明里已暗示过,Mythos 与前代之间的差异可能被"千倍于 500"这种表述人为放大。Anthropic 在模型卡中还披露了一个**小而重要**的细节:"在先前模型(包括 Mythos Preview)上发生的链式思考监督技术错误在 Opus 4.7 的训练中也存在,影响了 7.8% 的 episodes。"——这是少见的坦诚,但也引发信任讨论。

Anthropic 自评 Opus 4.7"**largely well-aligned and trustworthy, though not fully ideal**";在诚实性与对抗 prompt 注入方面优于 4.6,但在受管制物质的"过度详细的减害建议"上略逊一筹。Mythos 仍被 Anthropic 认为是**对齐最佳**的模型。

## Opus 4.7 的优势、短板与竞品格局

Opus 4.7 的优势可概括为三条主线:**生产级智能体编码**(SWE-bench Pro 上首次跨过 60%、Cursor/Hex 等合作伙伴看到两位数百分点提升、**工具错误减至原来的 1/3**、**能连续数小时保持焦点**)、**高分辨率视觉驱动的计算机使用**(3.75 MP 图像支持、XBOW 视觉辨识从 54.5% 跳到 98.5%)、以及**更细粒度的成本-推理控制**(xhigh 档 + Task Budgets)。对金融、法律与多步合规工作,GDPval-AA Elo 1,753 几乎是 Gemini 3.1 Pro(1,314)的近 440 分差距,等同于"其它模型几乎无法在同赛道与之较量"。

短板同样清晰:**长上下文检索从 91.9% 回退到 59.2%**,对 1M 上下文重度用户是严重风险;BrowseComp 智能体搜索落后 GPT-5.4 Pro 10 分、HLE 带工具场景也不及;Terminal-Bench 2.0 在同 harness 下仍不如 GPT-5.4;多语言 Q&A 落后 Gemini;上下文窗口只有 Gemini 的一半、API 价格是 Gemini 的 2.5 倍;Mythos 把自己旗舰在 SWE-bench Verified(93.9%)、Pro(77.8%)、CyberGym(83.1%)上再压一头,形成内部"天花板压顶"效应。与 Grok 的直接对比数据仍稀少,但开发者社区的共识是:**Grok 走实时/速度,Claude 走深度/综合**,两者定位不重合。

综合看,这场竞争已进入**逐项拉锯**阶段:Opus 4.7 对 GPT-5.4 的 7-4 窄胜、对 Gemini 在编码场景的优势、对 Mythos 的自证不足,加在一起描绘出一个**没有单一霸主**的 2026 年前沿格局。Anthropic 以 ~300 亿美元年化收入、Claude Code 约 25 亿美元年化、外界开价 ~8000 亿美元估值的体量,需要的是证明"还能稳定进步",而这一版本——尽管存在透明度瑕疵——大体完成了这个任务。

## 结语:一次必要但不漂亮的升级

Opus 4.7 最有意思的地方不在基准数字,而在**它暴露了 Anthropic 当下的战略张力**:既要保持"负责任 AI"叙事,又要在算力紧张中满足开发者对稳定性的强烈需求;既要吹出 Mythos 的领先以维护估值,又要让公开模型看起来不像被故意"降级";既要 ship 快,又要守住对齐。"less broadly capable than Mythos"这句自我矮化式的官方措辞,折射的是一个被迫把**市场沟通、安全治理、商业现金流**同时打包给 4.7 的尴尬发布窗口。

对开发者而言,实用结论较为朴素:**如果你的工作落在复杂工程、长时智能体编码、或需要高分辨率计算机使用——现在就升级并把默认档位调到 high/xhigh;如果你依赖大上下文检索或智能体搜索,先留在 4.6 或评估 GPT-5.4/Gemini**。对 Anthropic 而言,更重要的议题不是下一个跑分,而是**重建被 4.6 "阉割"风波撕开的透明度信任**;Opus 4.7 提供了筹码,但远未买回所有人的耐心。
