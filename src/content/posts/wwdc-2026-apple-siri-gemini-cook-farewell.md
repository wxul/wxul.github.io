---
title: 库克谢幕之作：WWDC 2026 上，苹果终于把 Siri 交给了 Google
date: 2026-06-09
badge: AI
tags: ["AI", "LLM", "Apple", "WWDC", "Siri", "Gemini"]
draft: false
---

> 一场"修补之年"的发布会，却藏着苹果 AI 战略最深刻的一次转身——它租下了对手的大脑。

## 导语

2026 年 6 月 8 日，太平洋时间上午 10 点，苹果第 37 届全球开发者大会（WWDC 2026）在 Apple Park 拉开帷幕。今年的主题标语是"All systems glow"（万物焕光），但真正让全场记住的，不是焕新的图标，而是这是 Tim Cook 作为 CEO 主持的最后一届 WWDC——他将在 9 月 1 日把权杖交给硬件工程高级副总裁 John Ternus。在主题演讲结尾的告别视频里，库克一度眼含泪光。

这场发布会被外界普遍解读为"苹果 AI 的救赎之战"。两年前在 WWDC 2024 上，苹果高调预告了一个"更个人化的 Siri"，结果跳票再跳票，甚至因虚假宣传付出了代价：2026 年 5 月，苹果以 2.5 亿美元和解了一起集体诉讼（Landsheft v. Apple Inc.，由 Clarkson 律所提起），赔偿 2024 年 6 月 10 日至 2025 年 3 月 29 日间购买 iPhone 16 及部分 iPhone 15 的用户，每台 25 至 95 美元——理由正是它在 iPhone 16 上宣传的个性化 Siri 功能迟迟未能兑现。而这一次，苹果端出的不是又一张路线图 PPT，而是一个真正重建过的 Siri——只不过它的"大脑"，来自 Google 的 Gemini。

对开发者和技术从业者而言，这届 WWDC 的信息量极大：从重写的 Siri、全新的 Apple 基础模型（AFM 3），到 App Intents 取代 SiriKit、Xcode 27 引入第三方编码代理、Core AI 全新框架，再到与欧盟监管的公开决裂。本文将带你完整梳理。

## 一、大会基本信息与整体氛围

WWDC 2026 于 6 月 8 日至 12 日举行，依旧采用线上为主、线下为辅的混合形式。6 月 8 日，苹果在 Apple Park 邀请了超过 1000 名开发者、设计师和学生现场参加。主题演讲（Keynote）与开发者状态（Platforms State of the Union）当天先后进行，整周还有超过 100 场视频技术分场。

值得注意的是，库克只在开场和结尾做了简短发言，并未参与任何产品揭幕；而即将接任的 Ternus 全程没有出现在主题演讲中——他是个"硬件人"，而 WWDC 是软件的主场。

媒体评价两极。一方面，普遍认为这是一届"修补之年"（refinement year）的发布会：苹果罕见地"先讲修 bug，再讲新功能"。软件工程高级副总裁 Craig Federighi 在台上说："我们相信最好的操作系统不只是建立在重大突破上，而是建立在对细节的精雕细琢上。"TechCrunch 评论称，这对苹果而言"已经是最接近承认错误的表态了"。另一方面，发布会当天苹果股价一度上涨约 2%，但在主题演讲期间转跌，收盘下跌近 2%。Futurum 分析师 Daniel Newman 直言第一反应是"在打勾完成任务，但仍然乏善可陈"。MacRumors 论坛里甚至有用户吐槽"这是我看过最糟糕的一届 WWDC"。

发布的所有系统——iOS 27、iPadOS 27、macOS 27（代号 Golden Gate，金门）、watchOS 27、tvOS 27、visionOS 27——开发者测试版当天推送，公测版 7 月推出，正式版将于今秋（9 月）随 iPhone 18 Pro 系列一同发布。

## 二、发布会内容全览

### iOS 27 与系统更新：性能优先的"雪豹时刻"

iOS 27 被定位为类似当年 macOS Snow Leopard 的"打磨型"版本，重点在性能、稳定性和续航。苹果声称：应用启动最高快 30%、拍照后照片加载快 70%、AirDrop 传输快 80%，iPad 与外部硬盘之间的文件传输快 5 倍。设备兼容性是惊喜——iOS 27 支持到 2019 年的 iPhone 11，没有砍掉任何一款能跑 iOS 26 的机型，苹果称这是"史上覆盖用户最多的一次 iOS 发布"。（不过 watchOS 27 则相当激进，仅支持最新的 5 款 Apple Watch。）

**Liquid Glass 2.0**：去年备受争议的"液态玻璃"设计语言迎来第二代。最重要的改变是新增了一个透明度滑块，让用户可以从全透明一路调到"完全着色"。macOS 上也恢复了侧边栏图标的颜色、收紧了窗口圆角。

**为折叠屏 iPhone 铺路**：iOS 27 加入了适配铰链状态的 SwiftUI/UIKit 自适应布局 API，为今秋传闻中的折叠屏 iPhone（内屏约 7.8 英寸）做准备。

**macOS Golden Gate** 正式终结了 Intel Mac，标志着苹果向 Apple Silicon 的全面过渡。

### 应用层的 Apple Intelligence 新功能

苹果这次把 AI 织进了几乎每一个系统应用：

- **照片**：Spatial Reframe（空间重构）可在拍摄后调整构图、视角，甚至用生成式 AI 补全画面边缘；Clean Up 抠图更精准。
- **快捷指令**：可以用自然语言描述就生成快捷指令，终结了 Shortcuts 多年的"难用"标签。
- **Safari**：AI 自动归类标签页；"Notify Me"可监控网页变化（如补货、降价）；"Describe an Extension"可用一句话生成 Safari 扩展。
- **密码**：可"代理式"地自动访问网站、登录并把弱密码升级为强密码。
- **信息/邮件**：Smart Reply 会学习你对不同联系人的写作风格。
- **Visual Intelligence**：扩展到分摊账单、识别营养信息等。
- **家庭**：把相关的智能家居通知聚合为一条，AI 总结监控摄像头录像，并支持搜索"包裹送达"等具体事件。

### 开发者工具：本届最具结构性意义的变化

对开发者来说，这届 WWDC 影响深远：

- **App Intents 取代 SiriKit**：App Intents 现在是接入 Siri AI 的"强制"标准接口，SiriKit 收到正式弃用通知。任何还在用 SiriKit 的语音功能都进入了倒计时。
- **Foundation Models 框架升级**：从去年引入的本地模型 API，升级为统一的 Swift API，支持图像输入、服务端模型和自定义技能。最关键的是引入了公开的 `LanguageModel` 协议——任何模型提供商都可实现它（Google 已通过 Firebase Apple SDK 把云端 Gemini 接入）。开发者现在可以直接调用 Apple 基础模型，也可以调用 Claude、Gemini 等第三方模型。框架还新增了可即时切换模型、工具和指令的 Dynamic Profiles。
- **Core AI 全新框架**：苹果称其为"全新框架"，专为 Apple Silicon 的统一内存和神经引擎打造，让开发者把自己的自定义模型（乃至完整 LLM）完全跑在设备端，零服务器依赖、零 token 成本。（注：会前 Gurman 等报道称 Core AI 是 Core ML 的替代者，但苹果官方只称其为"全新框架"，并未明确说"替代"，二者短期内可能并存。）
- **免费云端额度**：加入 App Store 小型企业计划且首次下载量低于 200 万的开发者，可免费使用跑在 Private Cloud Compute 上的新一代 Apple 基础模型，不收云 API 费用。
- **Xcode 27**：内置双引擎 AI——本地预测性多行代码补全（跑在 Apple Silicon 神经引擎上，无需联网），同时可接入 Anthropic、Google、OpenAI 的编码代理。Swift 语言也精简了 Swift 6 严格并发的标注负担。

## 三、AI 深度解读：苹果"租下"了 Google 的大脑

这是本届 WWDC 真正的核心。

### Siri AI：迟到两年的重生

苹果把全新的 Siri 直接命名为"Siri AI"，称其为 Siri 诞生十余年来最大的一次升级。它能：

- **理解屏幕内容**：看着邮件里的航班确认，直接说"把它加到日历，并把详情发给 Sarah"。
- **调用个人上下文**：跨 Messages、Mail、Photos、Files、Notes 安全检索，能从几个月前的一条短信里找出某个细节并据此执行多步任务。
- **进行多轮对话**：支持中途改主意（"定个 10 分钟……不，15 分钟的计时器"）。
- **独立成 App**：iPhone、iPad、Mac 上都有一个独立的 Siri 应用，通过 iCloud 私密同步对话历史。在 iOS 上，它活在灵动岛里，可长按电源键唤起。

但 Siri AI 本身仍打着"beta"标签，将在"今年晚些时候"以英语先行推出。

### 架构：System Orchestrator 与 AFM 3 五模型家族

苹果在主题演讲后的技术问答中，由 Federighi 携 Sebastien Marineau-Mes、Mike Rockwell、Amar Subramanya 详细拆解了架构。

核心是一个叫 **System Orchestrator（系统编排器）** 的模块，它根据查询所需的算力和个人数据量，把请求路由到设备端或云端的不同模型。Federighi 称它是"我们整个系统隐私架构的核心"。

支撑它的是第三代 Apple 基础模型（AFM 3），一个五模型家族。根据苹果机器学习研究院 6 月 8 日发布的官方报告（注：完整技术报告将于今夏晚些时候放出，以下为 beta 阶段数据）：

- **AFM 3 Core**：30 亿参数的密集模型，处理日常任务。在苹果的人类评测中，新版在通用文本任务上的偏好率达 45.6%，而 2025 基线仅为 23.3%；在图像理解上的偏好率超过 61%。
- **AFM 3 Core Advanced**：200 亿参数的稀疏模型，是最强的端侧模型，原生多模态。它采用苹果研究人员开发的 **Instruction-Following Pruning（IFP，指令跟随剪枝）** 技术，完整模型存于闪存（NAND），按 prompt 选择激活其中 10 亿到 40 亿参数（"专家"），从而突破 DRAM 限制。它只在"最强的 Apple Silicon"上解锁（苹果官方仅称"最强 Apple silicon 系统"，并未点名 A19 Pro 芯片，外界关于"必须 A19 Pro"的说法属推测）。其语音合成的平均意见分（MOS）达到 4.15，高于现有生产基线的 3.87；在口语化场景更达 4.24 对 3.82。
- **AFM 3 Cloud**：服务端"主力"模型，基于去年的 **Parallel-Track Mixture-of-Experts（PT-MoE）** 架构改进，优化延迟。通用文本偏好率 64.7%，碾压 2025 服务端模型的 8.7%；图像理解 37.8% 对 9.6%。
- **ADM 3 Cloud (Image)**：图像生成与编辑模型，驱动 Image Playground、Genmoji 和 Spatial Reframe。
- **AFM 3 Cloud Pro**：最强模型，用于复杂推理和 agentic 工具调用。Subramanya 称其"质量与 Gemini 前沿模型相当"，跑在 Google Cloud 中的 Nvidia GPU 上，但仍在 Private Cloud Compute 框架内。

### 与 Google 的合作：约 10 亿美元一年

2026 年 1 月 12 日，苹果与 Google 宣布多年合作，由 Google 的 Gemini 模型为新 Siri 和下一代 Apple Intelligence 提供基础。据 Bloomberg 的 Mark Gurman 在 2025 年 11 月 5 日报道，苹果"计划每年支付约 10 亿美元，使用 Alphabet 旗下 Google 开发的、参数高达 1.2 万亿的超强 AI 模型"；Google Cloud CEO Thomas Kurian 已在 2026 年 4 月的 Google Cloud Next '26 上公开确认这一合作。该模型采用混合专家（MoE）设计，每次查询只激活相关的参数子集——这正是该交易在大规模下经济上可行的原因：苹果获得了前沿级模型的知识容量，却只需付出接近小得多的系统的推理成本。

苹果反复强调一个微妙的区分：端侧 AFM 模型完全是苹果自研；而 AFM Cloud / Cloud Pro 是苹果"在与 Google 合作下"训练的——用 Gemini 的输出和技术做训练（训练跑在 Google Cloud 的 TPU 上），但苹果自己做了预训练、后训练、强化学习等大量工作，最终交付的仍是"苹果模型"。Federighi 说："我们没有把 Gemini App 作为我们的 App。"换句话说，用户接触不到一行 Google 代码或 Gemini agent。

### 隐私：Private Cloud Compute 扩展到第三方云

这次最大的技术让步是：Private Cloud Compute（PCC）首次跑到了苹果数据中心之外——运行在 Google Cloud 的 Nvidia GPU 上。苹果用 Nvidia 机密计算、Intel TDX、Google Titan 芯片等层叠技术来维持隐私保证：请求被匿名化、剥离 Apple ID、token 化后才到达 Google 基础设施；Google 受合同约束不得用这些数据训练模型；苹果还承诺通过 Apple Security Bounty 计划开放 PCC 节点供外部研究人员验证。

据报道，最重的查询会通过 Google Cloud 上的 Nvidia B200 GPU 路由处理——因为苹果发现把万亿参数模型完全跑在自家 PCC 上"太慢，无法在 Siri 所需的规模下可用"。

### 第三方 AI：ChatGPT 仍在，并向所有人开放

值得开发者注意的是，iOS 27、iPadOS 27、macOS 27 允许用户把第三方 AI 服务（如 Claude、ChatGPT、Gemini）设为 Apple Intelligence 功能（包括写作工具、Image Playground）的默认提供方。OpenAI 的 ChatGPT 集成保留不变。这相当于苹果把它花十年构建的分发渠道，向所有 AI 提供商打开了一道口子。

### 欧盟与中国：一道刺眼的星号

Siri AI 在发布时不会登陆欧盟的 iPhone 和 iPad。苹果称，欧盟监管机构对《数字市场法》（DMA）的"极端解读"，会要求苹果向任何第三方 AI 系统开放近乎无限制的系统级访问权限——读写消息、购买、访问文件、跨 App 执行操作，且缺乏用户的持续可见性和控制。苹果设计了一个叫 **Trusted System Agent（可信系统代理）** 的中介框架，并提议用 18 个月分阶段推出，但欧盟委员会拒绝了苹果提出的每一个方案。Federighi 说"我们深感失望"，且目前没有时间表。有意思的是，macOS 27、watchOS 27、visionOS 27 上的 Siri AI 在欧盟可用——因为只有 iOS 和 iPadOS 被认定为 DMA 下的"守门人"服务。中国则因另一套监管要求，初期也不会上线。欧盟开发者同样无法测试或集成 Siri AI 功能。

## 四、AI 前景影响评估

### 对苹果：务实，但也是"承认天花板"

把 Siri 的"大脑"外包给 Google，对一家以芯片自研和端侧处理为核心卖点的公司而言，是一次哲学上的大转身。但分析师多数认为这是务实之举。Deepwater 的 Gene Munster 估算整个交易在多年期内价值最高可达 50 亿美元，并称"苹果靠自己让 Siri 变强大要花 50 亿美元以上，这是它能做的财务上最明智的决定"。Wedbush 的 Daniel Ives 称之为"务实地承认苹果无法独自赢得 AI 军备竞赛"。NPR 援引分析师观点指出，投资者反而欣赏苹果"只是付租金给 Google"，而不是像其他公司那样把钱铲进自建 AI 的无底洞。

对比之下，苹果 2025 财年（截至 9 月）资本开支为 127.2 亿美元（CFO Kevan Parekh 称同比增 35%），而 Alphabet 同期资本开支指引高达约 920 亿美元——差了近 7 倍。苹果的逻辑很清楚：它不需要拥有世界上最好的模型，它需要的是把"足够好"的模型深度整合进 25 亿台活跃设备的能力。Ming-Chi Kuo 的观点一针见血——WWDC26 的关键不在事件后的短期股价，而在于"苹果能否用同样的 Gemini，做出比 Google 自己更好的 AI 应用、agentic 工作流和端云混合体验"。

### 对 AI 行业格局：Google 是最大赢家

这笔交易是对 Google 的重大背书。Gemini 一举拿下了苹果这个体量的客户，坐实了它作为前沿模型供应商的地位。就在苹果 1 月 12 日宣布采用 Gemini 当天，Alphabet 股价收于 331.86 美元创历史新高，市值首次突破 4 万亿美元，成为继 Nvidia、Microsoft、Apple 之后第四家跻身"4 万亿俱乐部"的公司；其股价 2025 年累计上涨约 65%。

输家也清晰。OpenAI 的 ChatGPT 和微软的 Copilot 在移动端争夺战中被边缘化——Google 如今同时掌控 Android 和 iPhone 上的 AI 入口。微软股价在相关时段下跌。三星处境尴尬：它的 Galaxy AI 本就用 Gemini，如今与 iPhone 在 AI 能力上再无差异化可言。亚马逊则加速把 Anthropic 的 Claude 整合进 Alexa 以求差异化。

### 对消费者：体验改善，但仍需"交付证明"

对普通用户来说，最实际的改变是一个真正能用的 Siri、更快的旧手机、更好用的 Safari 和快捷指令、更强的家长控制。Siri AI 免费，但有每日使用额度，重度使用可通过 iCloud+ 订阅扩展额度——这与整个 AI 行业的定价模式趋同。

但怀疑仍在。鉴于苹果过去两年的"反复横跳"，分析师 Newman 说"我不确定他们给了我们足够的理由再次信任他们，证明要靠交付和执行"。一切都要等今秋正式版落地后才能见分晓。

### 对开发者：一个全新的分发渠道正在打开

这可能是最被低估的长期影响。未来两年内将有数十亿台设备运行内置 AI 层和"扩展"框架的 iOS 27。任何能通过质量、体验和 App Store 营销赢得用户信任、成为首选"扩展"的 AI 提供商，将继承一条苹果花了十年才建成的分发渠道。同时，App Intents 成为接入 Siri 的强制接口，意味着那些早早暴露丰富 App Intents 的应用会通过 Siri 获得更多分发；而试图把用户锁在自家界面里的应用，可能被直接绕过——正如 Ming-Chi Kuo 所警告的："Gemini 驱动的 Siri 会在 App Store 生态里制造赢家和输家。"

### 能追上甚至超越对手吗？

短期看，苹果在原始模型能力上仍落后于 Google、OpenAI。它的 AFM Cloud Pro"与 Gemini 前沿模型相当"，本质上是站在 Gemini 的肩膀上。但苹果赌的不是模型本身，而是整合与隐私：端云协同、System Orchestrator 路由、深度系统集成，加上"隐私不可妥协"的品牌叙事。Federighi 反复强调"我们相信 AI 中的隐私不可妥协……数据只用于执行你的请求，外部专家可随时验证这一承诺"。

这条路能否走通，取决于苹果能否把"足够好的模型 + 极致的整合体验"这套组合拳，转化为消费者真正愿意每天使用的功能。对大多数普通用户而言，AI 不必是世界第一，只要能简化日常即可——而这恰恰是苹果最擅长的战场。

## 结语

WWDC 2026 是一场充满张力的发布会。它是 Tim Cook 的谢幕，是苹果 AI 战略两年挣扎后的"重置"，也是一次罕见的"放下身段"——既向用户承认要先"精雕细琢"修补基础，也向行业承认无法独自打造前沿 AI 而选择"租下" Google 的大脑。

对开发者而言，真正的功课不在台上的 Siri 演示，而在台下的架构变迁：App Intents 取代 SiriKit、Foundation Models 框架开放、Core AI 落地、Xcode 引入多模型代理。这是数年来 Apple 平台最具结构性意义的一个周期。趁正式版到来前的几个月窗口，提前迁移 App Intents、适配折叠屏布局、拥抱端侧智能的团队，将是这一波浪潮里最先受益的人。

至于苹果的 AI 救赎是否成功，正如那位分析师所说——证明，要靠交付。今秋见分晓。
