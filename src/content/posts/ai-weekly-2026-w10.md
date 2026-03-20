---
title: AI 周报｜2026 年第 10 周（3月3日—3月10日）
date: 2026-03-11
badge: AI
tags: ["AI"]
draft: false
---

> **本期导读：** OpenAI 完成史上最大私募融资、Claude Cowork 震动企业软件市场、五角大楼 AI 军备竞赛白热化、MWC 2026 AI 硬件全面爆发、Karpathy 开源自动科研工具……这是 AI 历史上事件密度最高的一周之一。

---

## 💰 资本与战略

### [OpenAI 完成 1100 亿美元融资，估值 7300 亿美元刷新人类史上最大私募纪录](https://techcrunch.com/2026/02/27/openai-raises-110b-in-one-of-the-largest-private-funding-rounds-in-history/)

**来源：TechCrunch / Crunchbase｜3 月 4 日正式交割**

亚马逊领投 500 亿美元、英伟达与软银各出资 300 亿美元，OpenAI 以 7300 亿美元估值完成 1100 亿美元融资，成为人类有史以来最大私募融资纪录——此前这个纪录也是 OpenAI 自己在 2025 年创下的 400 亿美元。

作为交易的一部分，OpenAI 将在亚马逊 Bedrock 平台打造"有状态运行时环境"，并承诺消耗至少 2GW 的 AWS Trainium 算力；英伟达方面则将提供 3GW 推理算力与 2GW 的 Vera Rubin 训练资源。CEO 山姆·奥特曼表示，ChatGPT 目前每周活跃用户已突破 **9 亿**，2026 年头两个月的新增订阅量创下历史最高纪录。

---

### [微软联手 Anthropic 发布 Copilot Cowork，"Wave 3"企业 AI 升级覆盖整个 M365](https://venturebeat.com/orchestration/microsoft-announces-copilot-cowork-with-help-from-anthropic-a-cloud-powered)

**来源：VentureBeat｜3 月 10 日**

微软宣布"M365 Copilot Wave 3"升级，核心是与 Anthropic 联合开发的云端 AI 协作工具 **Copilot Cowork**——可跨 Word、Excel、PowerPoint、Teams、Outlook 等全线应用自主完成多步任务。此举让 Claude Opus 4.6 模型正式进入 Copilot Chat 主流入口。值得关注的是：Claude Cowork 在今年头两个月的发布，已引发企业软件股 **2850 亿美元**市值蒸发，因为投资者开始重新评估项目管理、写作、工作流自动化类 SaaS 产品的未来。

---

### [Anthropic Claude Cowork 发布企业版：接入 Gmail、DocuSign、Slack 等 20+ 应用](https://techcrunch.com/2026/02/24/anthropic-launches-new-push-for-enterprise-agents-with-plugins-for-finance-engineering-and-design/)

**来源：TechCrunch / CNBC｜3 月 1—4 日持续热议**

Anthropic 于 2 月 24 日举办"Enterprise Agents"发布会，随后本周正式大规模推广。Claude Cowork 企业版新增 Gmail、Google Drive、DocuSign、FactSet、Slack、Clay 等 20+ 系统连接器，并推出金融分析、工程、人力资源、投行研究等现成 Agent 模板。NYSE 首席技术官 Sridhar Masam 在发布会现场演示了从 Jira 工单到代码提交的全自动流程。Salesforce 报告称，基于 Claude 的 Slack 机器人用户满意度达 **96%**，每用户每周节省 **97 分钟**。

---

## 🤖 大模型与技术

### [GPT-5.4 正式发布：百万 Token 上下文 + 原生电脑操控，幻觉率降低 33%](https://openai.com/index/introducing-gpt-5-4/)

**来源：OpenAI｜3 月 5 日**

OpenAI 发布旗舰模型 GPT-5.4，主要升级包括：

- **上下文窗口**：扩展至 100 万 Token，可在内存中持有整个项目全貌
- **原生 Computer Use**：无需插件即可直接操作浏览器和桌面应用
- **三能力融合**：推理、编程与 AI Agent 工作流首次深度融合，彼此不再有性能牺牲
- **幻觉率**：相较 GPT-5.2 下降 33%

同步上线 ChatGPT Pro 与 [GitHub Copilot](https://github.blog/changelog/2026-03-05-gpt-5-4-is-generally-available-in-github-copilot/)，覆盖 VS Code、JetBrains、Xcode 等主流 IDE。经测试，GPT-5.4 在 44 个职业岗位中有 83% 的工作任务表现与专业人员持平或超越。

---

### [阿里 Qwen 团队核心人员接连离职，开源社区震动](https://techcrunch.com/2026/03/03/alibabas-qwen-tech-lead-steps-down-after-major-ai-push/)

**来源：TechCrunch / VentureBeat｜3 月 3—4 日**

Qwen 系列技术负责人林俊阳及多名核心研究员，在 Qwen3.5 发布后相继宣布离职。VentureBeat 标题直问：["阿里是否亲手砍断了自己最强的 AI 团队？"](https://venturebeat.com/technology/did-alibaba-just-kneecap-its-powerful-qwen-ai-team-key-figures-depart-in)知名开发者 Simon Willison 呼吁："趁模型权重还能下载，赶紧存好。"这一事件对中国开源 AI 生态形成不确定性冲击——此时 Qwen 已是全球下载量最大的开源模型系列之一。

---

### [字节跳动 Seedance 2.0 视频生成器引爆好莱坞版权大战](https://techcrunch.com/2026/02/15/hollywood-isnt-happy-about-the-new-seedance-2-0-video-generator/)

**来源：TechCrunch / Reuters｜3 月 3—10 日持续发酵**

用户只需文字描述，Seedance 2.0 就能生成蜘蛛侠、米老鼠等受版权保护角色的逼真视频。本周，迪士尼、派拉蒙相继发出停止侵权函，MPA（美国电影协会）与 SAG-AFTRA（演员工会）联合谴责。两会期间，中国传媒大学党委书记公开表示看到 Seedance 2.0 后"感到非常震惊，以后何去何从"。这是 AI 视频生成领域迄今规模最大的版权冲突。

---

### [中国大模型 API 调用量单周首超美国，中国日均消耗 Token 两年暴增 300 倍](https://news.sina.com.cn/zx/ds/2026-03-03/doc-inhptein4611107.shtml)

**来源：新浪财经 / 经济观察报｜3 月 3—7 日**

OpenRouter 数据显示，2 月第二周中国大模型 API 调用量达 **4.12 万亿 Token**，超过美国的 2.94 万亿 Token。国家数据局数据进一步显示：2024 年初中国日均 Token 消耗量仅 1000 亿，而 2025 年 6 月底已突破 **30 万亿**，两年增长 300 多倍。豆包大模型单日 Token 调用量亦突破 50 万亿。

---

## ⚔️ AI 军事化与治理争议

### [Anthropic 被列"国家安全风险"，拒绝向五角大楼开放无限制 Claude 访问](https://fortune.com/2026/03/07/pentagon-emil-michael-anthropic-claude-defense-ai-openai-iran-war-palantir/)

**来源：Fortune / MIT Technology Review｜3 月 3—7 日**

本周最具争议的 AI 事件。美国国防部副部长 Emil Michael 公开表示，Anthropic 拒绝在"无安全限制"条件下向军事系统开放 Claude，随即被列为"供应链风险"。据报道，五角大楼官员在一次模拟伊朗冲突推演中首次意识到 Claude 的战略价值，随后发出开放权限要求遭拒。

Anthropic CEO Dario Amodei 表示"别无选择，将在法庭上对这一认定提出质疑"。与此同时，[OpenAI 与五角大楼签署了受限访问协议](https://www.technologyreview.com/2026/03/02/1133850/openais-compromise-with-the-pentagon-is-what-anthropic-feared/)，划定"三条红线"：禁止国内大规模监控、禁止自主致命决策、须保持人类对武力使用的控制权。MIT Technology Review 评论：OpenAI 的"妥协"正是 Anthropic 一直担心的那个选项。

---

### [xAI Grok 与五角大楼达成机密系统部署协议](https://www.axios.com/2026/02/23/ai-defense-department-deal-musk-xai-grok)

**来源：Axios｜3 月 3 日起成为舆论焦点**

马斯克旗下 xAI 的 Grok 模型将部署至美国国防部分类系统。由于马斯克同时担任 DOGE 政府效率顾问，利益冲突质疑持续发酵。有分析人士指出，这是 Anthropic 退出后军方转向的替补方案之一。

---

### [OpenAI 硬件负责人因军事合作愤而辞职，60 天内第 9 位出走高管](https://fortune.com/2026/03/02/openai-anthropic-pentagon-tempest/)

**来源：Fortune｜3 月 8 日**

OpenAI 硬件副总裁 Caitlin Kalinowski 公开声明，无法接受公司在军事 AI 安全保障上的立场，随即离职。这是 60 天内因安全理念分歧出走的第 9 位 OpenAI 高管。多名 Google 员工同期联名发公开信，支持 Anthropic 的立场。

---

### ["亲人类 AI 宣言"发布，获 95% 美国民众支持，硅谷主流却集体沉默](https://techcrunch.com/2026/03/07/a-roadmap-for-ai-if-anyone-will-listen/)

**来源：TechCrunch｜3 月 7 日**

MIT 物理学家 Max Tegmark 牵头，跨党派联盟提出五大原则，核心是：在缺乏科学共识与充分民主讨论之前，禁止开发超级智能。民调显示 **95%** 的受访美国人表示支持。但同时 TechCrunch 指出，硅谷的主流声音依然保持沉默。

---

### [英国 ICO 与 Ofcom 联合调查 xAI Grok"真人深度伪造"问题](https://techcrunch.com/2026/03/07/a-roadmap-for-ai-if-anyone-will-listen/)

**来源：TechCrunch｜3 月 9 日**

英国信息专员办公室（ICO）和通信监管机构 Ofcom 向 xAI 发出正式信息要求，调查 Grok 生成涉及真实人物不当内容的问题。这是英国首次对 AI 生成内容展开双机构联合调查。

---

## 🇨🇳 国内政策与产业

### [两会政府工作报告：首提"打造智能经济新形态"，"十五五"末 AI 产业规模剑指 10 万亿](https://finance.sina.com.cn/jjxw/2026-03-07/doc-inhqcymr1760598.shtml)

**来源：新华社 / 每日经济新闻｜3 月 5 日**

政府工作报告连续第三年部署"人工智能+"战略，首次提出"打造智能经济新形态"。国家发改委宣布目标：到"十五五"末，AI 相关产业规模将从现有 **1.2 万亿元**增至 **10 万亿元以上**，相关企业超 6200 家。两会代表委员同步聚焦 AI 专项立法议题，呼吁打破合规"瓶颈"。

---

### [中国传媒大学一口气砍掉 16 个本科专业，校长：Seedance 2.0 出来后"感到震惊"](https://www.wenxuecity.com/news/2026/03/09/126566500.html)

**来源：HK01 / 文学城｜3 月 9 日**

全国政协委员、中国传媒大学党委书记廖祥忠在两会发言中披露：2025 年中国传媒大学已撤销包括翻译、摄影在内的 **16 个本科专业和方向**。他表示，未来是"人机分工时代"，课堂教学需彻底重构，"形式改变、内容改变，还要改变思路……剩下的交给 AI，让学生去学习。"

---

### [小米 AI Agent "龙虾"（miclaw）开启封测，基于自研 MiMo 大模型打造移动端超级入口](https://www.aitop100.cn/ai-daily-2026-03-06)

**来源：AITOP100 / 新浪科技｜3 月 6 日**

小米正式宣布基于自研 MiMo 大模型打造的移动端 AI Agent 产品 **Xiaomi miclaw**（内部代号"龙虾"）开启封测。产品直接集成于手机系统底层，可调用通信、日历、文件管理等 50 余项核心系统工具，定位为真正的移动端 AI Agent，而非普通应用插件。深圳市科技创新局局长表示："谁能抢占 AI 智能体的超级入口，谁就将在未来数十年的市场争夺中占据优势。"

---

## 🌐 MWC 2026：硬件与网络的 AI 化

### [MWC 2026 巴塞罗那：华为发布 Atlas 950 SuperPoD，荣耀"机器人手机"惊艳全场](https://www.huawei.com/cn/news/2026/3/mwc-superpod-ai)

**来源：华为 / 新华社｜3 月 2—5 日（大会闭幕后本周仍持续热议）**

华为首次在海外发布 **Atlas 950 SuperPoD**——通过"集群+超节点"架构将最多 **8192 个 NPU** 连接为单一计算单元，专为 Agentic AI 时代设计。荣耀同期在 MWC 展台展示全球首款"机器人手机"，将 AI Agent 深度嵌入手机系统底层，引发多名国际业界人士公开惊叹"中国 AI 应用发展之快超出预期"。三星与 AMD 则演示了 AI-RAN 多小区测试突破，5G 网络本身开始具备 AI 推理能力。

---

## 🛠️ 开发者与开源

### [Karpathy 开源 Autoresearch：630 行代码，让 AI Agent 整夜自主跑 100 个实验](https://venturebeat.com/technology/andrej-karpathys-new-open-source-autoresearch-lets-you-run-hundreds-of-ai)

**来源：VentureBeat / MarkTechPost｜3 月 7—8 日**

Andrej Karpathy 发布 Autoresearch：研究员只需写一份 Markdown 研究指令，AI Agent 即可在单块 GPU 上整夜完成约 100 个实验并自动汇总结果。48 小时内 GitHub 星标突破 **8700**，X 平台曝光量超 **860 万次**。VentureBeat 称其意义在于"第一次让个人研究者以接近零成本'雇用'了一支 AI 实验团队"。

---

### [GitHub Trending 被 AI Agent 项目屠榜，OpenClaw 60 天 18.8 万星创 GitHub 历史最快增长](https://trendshift.io/)

**来源：GitHub Trending｜本周持续**

本周 GitHub 热门榜前 20 中 AI Agent 相关项目占据 14 席，其中：
- **OpenClaw**（AI"小龙虾"自动养殖 Agent）：60 天内从 9000 星飙至 18.8 万星，创 GitHub 历史最快增长纪录，深圳甚至出台"龙虾十条"政策鼓励居民参与
- **agency-agents**：累计 18.4k 星
- **autoresearch**（Karpathy 新作）：新晋 8.7k 星

---

### [Claude Code 推出语音编程模式，语音 Token 完全免费](https://news.sina.com.cn/zx/ds/2026-03-03/doc-inhptein4611107.shtml)

**来源：新浪科技热点｜3 月 3 日**

Anthropic 为 Claude Code 新增语音编程模式：用户通过 `/voice` 命令长按空格说话即可实时转录代码，且语音 Token 完全不计费。该功能在调试和架构讨论时效率提升尤为显著，标志着编程交互向多模态演进。

---

### [Block（Square）因 AI 重组裁员 4000 人，CEO 杰克·多西：小团队加 AI 能胜过大团队](https://www.marketingprofs.com/opinions/2026/54379/ai-update-march-6-2026-ai-news-and-views-from-the-past-week)

**来源：MarketingProfs / Bloomberg｜3 月 5—6 日**

支付公司 Block 宣布裁员逾 **4000 人**（约占员工总数 40%），CEO 杰克·多西明确表示重组的核心逻辑是：配备 AI 工具的小规模团队可以超越更大规模的传统团队。这是 2026 年以来规模最大的 AI 相关裁员事件，也点燃了科技行业对 AI 取代就业的新一轮辩论。

---

## 🔭 下周预告：NVIDIA GTC 2026

### [GTC 2026 倒计时：黄仁勋预告 1nm Feynman 芯片与 Vera Rubin 平台](https://www.tipranks.com/news/nvidia-nvda-gtc-2026-is-coming-heres-what-to-expect-from-jensen-huangs-big-ai-event)

**来源：TipRanks / NVIDIA 官网｜3 月 9—10 日**

NVIDIA GTC 2026 将于 **3 月 16—19 日**在圣何塞召开，目前已确认的亮点包括：
- 基于台积电 **1nm** 工艺的下一代 Feynman 架构芯片
- Vera Rubin 平台（推理性能为 Blackwell Ultra 的 **3.3 倍**）正式展示
- 1000+ 场开发者技术 session

与此同时，GDC 2026（游戏开发者大会）本周已在旧金山开幕，NVIDIA 宣布届时发布 **DLSS 4.5** 动态多帧生成技术，三万余名开发者参会。

---

## 总结

这一周的 AI 新闻可以用两条轴来理解。

**纵轴是"钱与权"**：1100 亿美元的 OpenAI 融资和 AI 产业 10 万亿目标，显示资本对这场技术变革下注之深前所未有。与此同时，五角大楼、监管机构、工会、高校……各类权力主体本周都以自己的方式与 AI 正面交锋。Anthropic 被列"安全风险"这件事，是一个历史性时刻：这是第一次，一家主要 AI 公司因为"拒绝让 AI 用于军事而不设限制"，被自己国家的政府视为威胁。

**横轴是"应用与工具"**：Claude Cowork 进入企业、Copilot Cowork 覆盖 M365、Karpathy 的 Autoresearch 重新定义科研效率、OpenClaw 让普通人"养 AI 小龙虾"……AI 不再只是对话框，它开始在真实工作流和真实世界里跑起来。Block 裁员 4000 人是一个信号：企业已经开始用 AI 工具重新计算多少人才是"够用的"。

下周 NVIDIA GTC 若如期揭晓 Feynman 芯片，AI 算力天花板将再次被打破。这场加速，没有减速的迹象。

---

*资料来源：OpenAI、TechCrunch、VentureBeat、Fortune、MIT Technology Review、Axios、CNBC、Crunchbase、MarkTechPost、新华社、每日经济新闻、新浪财经、AITOP100、知乎等，整理截至 2026 年 3 月 10 日。*