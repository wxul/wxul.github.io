---
title: Cloudflare 的 Agent Cloud 赌局正式摊牌
date: 2026-04-20
badge: AI
tags: ["AI", "Agent", "MCP", "Developer"]
draft: false
---

**Cloudflare 把 Developer Week 直接改名成 Agents Week，这本身就是比任何单个发布都值得读懂的信号。** 2026 年 4 月 13 日至 17 日，Cloudflare 在旧金山围绕"Agent Cloud"抛出了 50 余项公告，横跨计算、连接、安全、身份、经济、开发者体验六个维度，核心论点毫不含糊——**互联网不是为 AI 而建的，云也不是为 Agent 而建的，两者都要重做**。过去九年里，这家公司用 Workers、Durable Objects、R2 默默堆出的基座，如今被重新编排成一套专为"百万级并发、长时运行、一用户一 Agent"而设计的基础设施。**Matthew Prince 在新闻稿中把话说死**："Agent 需要一个默认安全、能瞬间扩容到百万、支持长时任务的家——我们花了九年打好地基。" 与此同时，AWS AgentCore、Google Vertex Agent Engine、Microsoft Foundry、OpenAI Responses API、Anthropic MCP 也在同一窗口里加码，这场押注的胜负远未落定，但行业范式已经分叉。

## 为什么非重做云不可：一对多到一对一

Cloudflare 开篇博客里有一段冷数据：**如果美国 1 亿知识工作者各配一个 Agent，以 15% 并发率计算，需要同时支撑约 2400 万会话；按每 CPU 服务 25–50 用户换算，仅美国一地就要 50 万到 100 万台服务器**。这个数字背后是一个被忽视的范式断裂——过去十年的云以"一个应用服务多个用户"为前提，Kubernetes 和容器是默认原语；而每个 Agent 是一个独立实例，为一个用户执行一个任务，LLM 动态决定代码路径，传统的容器经济学撑不起。**Cloudflare 的类比直白**：传统应用是餐厅（固定菜单、批量出菜），Agent 是私人厨师（每次食材和技法都不同）。这就是为什么 V8 isolate（Cloudflare）、Firecracker microVM（AWS）、WebAssembly 沙箱（Vercel）会成为 2026 年的核心战场。

Cloudflare 还抛出一个更尖锐的观察：当前行业处在"无马马车阶段"。给 Agent 用为人类设计的 headless 浏览器、让 MCP 服务器只是对 REST API 的薄封装、仍在问访客"你是不是人"而非"你是哪个 Agent、谁授权、能做什么"——这些都是过渡态。Agents Week 的全部产品，都在回答"如果一切从 Agent 出发重做一遍会是什么样"。

## 计算层：Dynamic Workers 与 Sandboxes 的双轨制

**Dynamic Workers 是整周最具争议也最具信号意义的发布**。它本质是"安全版 `eval()`"——Cloudflare Worker 可以在运行时把 LLM 生成的代码加载进一个独立 V8 isolate 执行，启动耗时几毫秒、内存几 MB，据称比典型容器**快约 100 倍、内存效率高 10–100 倍，没有并发上限、没有预热**。每个 isolate 默认 `globalOutbound: null`、零环境权限，开发者必须通过 bindings 按资源显式授权，反转了传统沙箱"先给全权再限制"的思路。定价为 **$0.002/独立 Worker/天**，Beta 期间免收。VentureBeat 把这一发布总结为"深度 vs 速度"的分水岭：microVM 给你更坚固的私密堡垒，isolate 给你启动速度、密度和互联网级成本——这将成为未来一年代理基础设施的主轴。

Dynamic Workers 最激进的衍生物是 **Code Mode**。传统 MCP 把几百个工具定义塞进上下文，每次调用都要 token；Code Mode 让 LLM 写一段 TypeScript 把多次 API 串起来，只把最终结果返回。**Cloudflare 官方 MCP 服务器把整条包含 2,500+ 端点的 Cloudflare API 压缩到 2 个工具 + 不到 1,000 个 token，token 用量降低 81%**，在企业 MCP Portal 版本中声称相同任务节省 99% token。TypeScript interface 相比 OpenAPI YAML 省 75% token（15 行 vs 60 行），这个数字本身重写了 Agent 经济学。

**Sandboxes 同期 GA，是 Dynamic Workers 够不着的重型工作负载补位**：完整的 Linux 容器，shell、文件系统、背景进程齐全，闲置自动休眠，有请求立即唤醒，跨调用状态保留。从零启动加 `git clone axios` 加 `npm install` 要 30 秒，从 R2 快照恢复只要 2 秒；标准计划 lite 实例并发 15,000、basic 6,000，采用 **Active CPU 定价——Agent 等 LLM 响应的闲置时间不计费**。Figma 工程负责人 Alex Mullans 公开背书："Figma Make 让创作者从想法到生产更快，Cloudflare Containers 就是这个方案。"

配套的 **Outbound Workers for Sandboxes** 是更底层的治理原语——把 Sandbox 的所有出站流量交给一个可编程 Worker 代理。它支持三种拦截模式（全局、按 host、命名 handler），运行时可 `setOutboundHandler()` 动态切换策略（比如装依赖时只放行 npmjs，装完立即切到"完全禁网"）。更狠的是内建的 **TLS 拦截**：每个 Sandbox 生成专属 ephemeral CA，由 Cloudflare 的隔离进程完成 TLS 握手，私钥永不离开 sidecar——Agent 永远看不到原始 secret，却能透明使用。InfoQ 评论这是"从无环境权限起步、按资源显式授能力"的反向安全模型。

**Durable Object Facets** 把这一栈向有状态推了最后一步。原本 Durable Object 需要静态声明、预绑定命名空间，完全不适合"LLM 即兴生成应用"的场景；Facets 允许一个"主管 DO"内部动态加载另一个 `extends DurableObject` 的类，每个 facet 拥有独立 SQLite 数据库。主管做限流、审计、计量，facet 跑租户代码，物理同址但逻辑隔离——**这意味着 vibe-coded 小应用可以每个都有专属持久数据库，而平台方仍能按用户限额和计费**。

## 数据层三件套：Artifacts、AI Search、Agent Memory

**Artifacts 是最具野心的存储创新**。它把 Git 协议从头用 Zig 重写成一个 100 KB 的 WebAssembly 模块，每个仓库跑在一个 Durable Object 上，SQLite 存 Git 对象，R2 存快照。目标是把"传统 Git 为人类协作建模"的前提打破——支持**单账户千万级仓库、单次 1 万 fork、从任意 Git 源 bootstrap**。配套开源的 **ArtifactFS** 用 FUSE + 懒加载能把 2.4 GB 仓库的 clone 从 2 分钟压到 10–15 秒，因为它先拉目录树和 package.json 之类的关键文件，二进制按需加载。定价为 千次操作0.50/GB-月，首月 10k 操作与 1 GB 免费，Private Beta。Artifacts 瞄准的是即将到来的现实：**每个 Agent 会话都需要一个可抛弃的代码仓库，但传统 GitHub 面对这个规模会崩溃**。

**AI Search 是 AutoRAG 的重命名与重写**。它现在是一个"即插即用"的搜索原语——内置 R2 存储 + Vectorize 索引 + Web 爬虫，语义向量和 BM25 关键词并行检索并融合结果，提供 OpenAI 兼容的消息数组 API，每个实例自动暴露 MCP 端点。Cloudflare 的博客搜索本身已由 AI Search 驱动。这一重定位让它从"自动化 RAG 管线"升级为"Agent 级搜索即服务"，开发者无需再单独配置 chunking、向量索引、关键词引擎。

**Agent Memory 解决的是"context rot"——即使上下文窗口涨到 100 万 token，塞满仍会降级输出质量，而激进剪枝又会丢关键信息**。Agent Memory 在后台从对话里抽取事实，按需检索注入 prompt，API 围绕四个动词：`ingest`、`remember`、`recall`、`forget`。数据以 profile 为单位隔离、跨会话共享、客户完全拥有。Cloudflare 的内部 OpenCode 插件已把它嵌入日常编码 loop。Private Beta 阶段。

这三件套加上 **PlanetScale 集成**（Cloudflare Dashboard 直接创建 Postgres/MySQL，通过 Hyperdrive 连接池化，支持 placement hint 指向数据库附近数据中心），构成了 Agent 完整的数据层：关系库 + 版本化文件 + 语义检索 + 长期记忆，全部落在 Cloudflare 网络内。

## Project Think 和 Workflows V2：把 Agent 做成一等公民

**Agents SDK 从"轻量原语"升级为"电池全开"的平台**，代号 Project Think。它引入了六大新原语：带 checkpoint 和崩溃恢复的 **durable fibers**（长任务可持久化 job ID、休眠、回调唤醒），**sub-agents**（每个子 Agent 独立 SQLite 和类型化 RPC），**persistent sessions**（树状消息、forking、compaction、全文检索），**sandboxed code execution**（Dynamic Workers 驱动），**execution ladder**（workspace → isolate → npm → browser → sandbox 五级逐步升级），以及 **self-authored extensions**（Agent 运行时为自己写工具）。新的 `Think` 基类是 opinionated harness——模型选择、system prompt、工具、agentic loop 全内置，开发者只改配置。

配套的 **Voice Pipeline** 包 `@cloudflare/voice` 让既有 Agent 通过单个 WebSocket 加上实时语音能力，服务端约 30 行代码即可跑起来。默认用 Workers AI 在 Cloudflare 网络内完成 STT 和 TTS 以压低首音延迟，响应流按句切分边生成边合成，传输层可插 Twilio 或 WebRTC。

**Workflows 控制面做了彻底重构**。旧版用单个账户级 Durable Object 管理所有工作流，硬上限是 4,500 并发和每 10 秒 100 实例。V2 引入 **SousChef**（分担元数据和生命周期）和 **Gatekeeper**（并发槽位租赁），**上限提升到 50,000 并发（11 倍）和每秒 300 实例（3 倍），支持百万级排队**。这是为了承接 Project Think 时代"一个 Agent 会话触发数十个 workflow"的洪流。

## 网络与身份：Cloudflare Mesh 的 VPN 替代叙事

**Cloudflare Mesh 是全周最具结构性意义的公告**。Matthew Prince 的定调是："AI Agent 已经是现代开发者工作流的标准，但被一套完全为人类设计的网络模型卡着脖子——开发者要么花几天和 VPN 搏斗，要么走'把私有服务暴露到公网'的危险捷径。" Mesh 用一个轻量 connector 统一连通个人设备、服务器、用户终端、Agent 和 Workers：Mesh node 跑 headless Cloudflare One Client 并分到一个 Mesh IP，设备跑普通 Cloudflare One Client，**Workers 通过新的 VPC mesh binding 直接 `fetch()` 私有 IP**。全流量端到端加密且支持后量子算法，穿越 330+ 城市的边缘，沿用既有的 Gateway/DNS/DLP/设备姿态策略，免费层给 50 nodes 加 50 users。

身份层配套推出了 **Managed OAuth for Access**，实现 RFC 9728（OAuth Protected Resource Metadata）——Agent 拿到 `401 + WWW-Authenticate` 响应后，按 `.well-known/oauth-protected-resource` 动态注册客户端，打开终端用户浏览器完成登录，换 token 后用 Bearer 访问。**这从根上解决了"Agent 该不该共用 service account"的老问题**，MCP server portal 默认开启，Access 自托管应用一键 opt-in。同期发布的还有可扫描的 API tokens、resource-scoped permissions GA、增强的 OAuth 可观测性——全部指向"非人类身份的最小权限架构"。

MCP 治理侧推出了三件套：**Code Mode MCP Portal**（上游工具列表压缩到单一 code 工具，token 降 81–99%）、**MCP Server Portals**（Access + AI Gateway 前置，Open Beta）、**Shadow MCP 检测**（Gateway 识别员工私连未授权 MCP，类比 2025 年的 Shadow AI）。Cloudflare 把自家内部部署的参考架构公开——Access 做身份、AI Gateway 做观测和限流、Portal 做中心化发现、Code Mode 做成本、Gateway 做 Shadow 发现。

## 推理层：Kimi K2.5 打进前沿，Unweight 榨 GPU

**Workers AI 用 Kimi K2.5 正式进入前沿级开源模型俱乐部**。这个 Moonshot AI 的模型有 256k 上下文、多轮 tool calling、视觉输入、结构化输出，被放进 Agents SDK starter 作为默认模型。Cloudflare 的内部数据最有冲击力：**一个每天处理 70 亿 token 的安全审查 Agent 跨全量代码库，用中端专有模型跑年花约 240 万美元，切到 Kimi K2.5 后降本 77%**，同时在单代码库中抓到 15+ 个已验证安全问题。这个数字如果经第三方验证成立，将重塑"开源模型能不能服务生产级编码 Agent"的答案。

**AI Gateway 升级为统一推理层**，一个端点、一套 credits 直通 14+ 提供商、70+ 模型——OpenAI（含 GPT-5.4 和 Codex）、Anthropic、Google、Groq、xAI、阿里云、字节、Moonshot、AssemblyAI、Runway、Vidu 等。同一个 `env.AI.run()` binding，切换供应商只改一行。**自动重试和续流是杀手级能力**——多供应商共通模型在一家宕机时自动 failover，流式响应在 Agent 断线重连后可续取不重新计费。2026 年 Cloudflare 已正式并入 Replicate，其 Cog 技术变成 BYO Model 能力——写 `cog.yaml` 和 `predict.py` 就能容器化自家模型推到 Workers AI。

**Unweight 是最硬核的基础设施创新**。H100 的 tensor core 比 HBM 带宽快近 600 倍，推理瓶颈在"搬字节"不在"算"。Cloudflare 团队发现 BF16 权重里 exponent 字段只携带约 2.6 bit 的熵却占 8 bit，于是对每张量用 16 值 palette 加 Huffman 编码 exponent，配合基于 ThunderKittens 的 reconstructive matmul 内核，**直接在 shared memory 里重建 BF16 tile 喂 WGMMA，省掉一次 HBM 往返**。Llama-3.1-8B 的 MLP 权重压缩约 30%，单模型节省约 3 GB VRAM，输出比特精确无损。开源了 GPU kernel，发表了学术论文。这让同块 GPU 装更多模型，推理更快更便宜。

## 给 Agent 的"手和嘴"：Browser Run、Email、Registrar、Agent Lee

**Browser Run 是 Browser Rendering 的重塑**——不只是改名，而是把浏览器做成 Agent 一级公民。新增 **Live View**（实时看 Agent 浏览）、**Human in the Loop**（遇 CAPTCHA/2FA 人类接手再交还）、直接暴露 **CDP 端点**（Claude Desktop、Cursor、Codex、OpenCode 可当远程浏览器用）、原生 **WebMCP 支持**（Chrome 146+ 的新 `navigator.modelContext` API）、**session recordings**（DOM 事件结构化 JSON 存盘可 rrweb 回放）、并发上限从 30 提到 120（4 倍）。`/crawl` 端点是"守规矩的爬虫"，遵守 robots.txt、AI Crawl Control、签名 bot 身份、固定 User-Agent、不绕 CAPTCHA——在 OpenAI Codex 桌面版、Anthropic Claude Computer Use（OSWorld 得分 72.5%）、开源 Browser Use 框架（8.12 万 GitHub stars）同场竞赛中，Cloudflare 选了"合规 + 可观测"的差异化路线。

**Cloudflare Email Service** Public Beta 把 Email Sending 和 Email Routing 合并，自动配置 SPF/DKIM/DMARC，Workers binding 无需管 API key，可以"收 → 处理 → 回"。**Registrar API** 让 Agent 从编辑器或终端直接按成本价查域名、查可用性、注册域名，Premium 域名需二次确认防止 Agent 误买。**cf CLI** 是重写的统一 CLI 覆盖近 3,000 个 API 操作，Local Explorer 则把 D1/R2/KV/DO 的本地模拟数据以与 Dashboard 一致的 UI 展示，同时暴露带 OpenAPI 的 HTTP 端点供 Agent 直接对话。

**Agent Lee 是 Cloudflare 仪表盘内嵌的 AI co-pilot**，用 Agents SDK + Dynamic Workers + Durable Objects 构建，沙箱中动态生成 TypeScript 查账户数据、生成图表，支持 generative UI（聊天内直接渲染数据可视化）和自适应网格（用户拖拽划区，Lee 即时生成 UI 块）。**写操作必须经用户 Confirm，是基础设施层强制而非 prompt 级约束**。对所有 Free 用户开放。

## 让 Web 本身对 Agent 友好：Readiness、Redirects、Shared Dictionaries

Cloudflare 不只在建 Agent 跑的基础设施，还在改造 Agent 要访问的 Web 本身。**isitagentready.com 是网站对 Agent 友好度的 Lighthouse**，四个维度打分：Discoverability（robots.txt、llms.txt）、Content（Markdown 协商）、Bot Access Control（Content Signals）、Capabilities（Agent Skills、API Catalog RFC 9727、OAuth discovery RFC 8414/9728、MCP Server Card）。Cloudflare Radar 扫了前 20 万域名，数据残酷——**78% 有 robots.txt 但多数写给传统爬虫，仅 4% 声明 AI 使用偏好，仅 3.9% 通过 markdown 协商，MCP Server Card 和 API Catalog 累计不到 15 个站点在用**。Cloudflare 自家开发者文档改造后，指向它的 Agent 平均**消耗 token 少 31%、答对时间快 66%**。

**Redirects for AI Training** 把 `<link rel="canonical">` 标签边缘实时转换成 301，只对已验证的 AI 训练爬虫（GPTBot、ClaudeBot、Bytespider）生效，不影响浏览器和 AI Search Bot。Cloudflare 自家文档开启后首 7 天 100% 命中——之前的数据显示 AI 爬虫 30 天访问 480 万次、消费弃用内容的速率与最新内容一样，软指令完全不起作用。**Shared Dictionaries** 把 CDN 缓存变成压缩字典，服务端只发 diff，500 KB 的 JS bundle 小改一行可以压到几 KB 上线——随 Agent 提升部署频率这一能力价值放大。

## 竞争格局：深度 vs 速度，以及"桥接 vs 锁定"

**AWS AgentCore** 2025 年底预览，AgentCore SDK 五个月下载 200 万次，PGA Tour 写作速度提升 10 倍、成本降 95%，基于 microVM + 容器提供 Runtime/Memory/Code Interpreter/Browser Tool/Identity/Gateway 全栈，按秒 CPU + 峰值内存 + 模型 token + S3 + Lambda 多层计费，被分析师 Scalevise 形容为"a stack, not a single SKU"——深度够但冷启动慢、区域有限、定价复杂。**Google Vertex Agent Engine** ADK 下载破 700 万次，2026-01-28 起 Sessions、Memory Bank、Code Execution 开始计费，与 Gemini Enterprise、BigQuery、Google Maps MCP 深度绑定；IDC 分析师点评"multi-cloud observability 不成熟"。**Microsoft Azure AI Foundry** 和 Copilot Studio 双栈并行，模型目录 11,000+，Agent Store 70+ 预制 Agent，通过 A2A 协议支持多 Agent 编排，与 M365、Security Copilot 深度集成。

**OpenAI 与 Cloudflare 的关系最微妙**——Responses API 成为官方推荐原语，Assistants API 2026-08-26 下线，但 OpenAI 自家 Agents SDK 更多在"模型 + SDK"这一层，Cloudflare 在"运行时 + 基础设施"。**OpenAI Codex 产品负责人 Rohan Varma 给 Agents Week 写了背书**："Cloudflare 让开发者部署由 GPT-5.4 和 Codex 驱动的生产级 Agent 跑真实企业负载。" AI Gateway 把 OpenAI 放进 14+ 供应商并列，挑战了开发者直接对接 OpenAI 的默认路径。**Anthropic MCP 已成事实标准**，OpenAI、Google DeepMind、Hugging Face、Microsoft、Cloudflare 全部采纳，黄仁勋称"MCP 彻底改变了 AI 的格局"。**LangChain 1.0 和 LangGraph 1.0 在 Agents Week 同期发布**，月下载 9,000 万，Uber、JPMorgan、Blackrock、Cisco 在用，是框架层；**Vercel AI SDK 6** 月下载 2,000 万，TypeScript 一级公民，DX 口碑最好——与 Cloudflare 的 Agents SDK 在开发者体验上正面相撞。

**Cloudflare 的独特身位**在三条线上：一是 330 城市边缘 + isolate 启动的"velocity"——V8 isolate 比 microVM 快两个数量级，对消费级 Agent 的单位经济学至关重要；二是"空闲零成本"——Active CPU 计费、Hibernation、DO 无请求零成本，TCO 模型与传统云差一个量级；三是中立的 AI Gateway——自己不做模型商，把 14+ 供应商统一成一个 API，同时与 MCP 深度绑定。Info-Tech 分析师 Shashi Bellamkonda 的点评一针见血："Cloudflare 同时做网络、计算、安全、推理、存储五层——这要么是一个一致的平台，要么是一个难以解绑的依赖。对 CIO 来说真正的问题不是技术是否领先，而是 18 个月后你能替换哪一层。"

## 战略拐点：从 AI Week 2025 到 Agents Week 2026

回看 Cloudflare 过去五年的 Innovation Week 节奏，Agents Week 2026 的战略转向极其清晰。**Developer Week 2024** 主题是"AI 平台通用化"——Workers AI、AI Gateway、Vectorize 三件套 GA。**Developer Week 2025** 是"Agent 开发元年"——Agents SDK 增强、远程 MCP + OAuth 首发、Workflows GA、Durable Objects 免费、Containers 预告。**AI Week 2025** 把重心彻底放在"企业 AI 安全与治理"——AI Prompt Protection、CASB、Firewall for AI、MCP Server Portals、Shadow AI 信心分，目标客户是 CISO/CIO。**Agents Week 2026** 把名字直接从 Developer Week 改掉，正式宣告从"守护企业用 AI"转向"为开发者提供构建 AI Agent 的基础设施"，官方措辞从"Developer Platform"换成 **"Agent Cloud"**。

这次转型有三层递进：运行时从"一种 Worker"扩到"Worker + Dynamic Worker + Sandbox + Container"四种执行环境；数据层从"散装 KV/D1/R2/Vectorize"重新编排成"Agent Memory + AI Search + Artifacts"三件套；网络层从"Zero Trust for humans"扩到"Zero Trust for agents"——Mesh + Outbound Workers + Workers VPC + Managed OAuth 让 Agent 成为一等网络公民。

## 八条行业趋势读出的未来

第一，**云的单元从"应用"变成"会话"**。Agents Week 把"一用户一 Agent 一任务"正式拍成产品前提。第二，**边缘计算成为 Agent 默认部署位置**，不只因为延迟，更因为 isolate 能做到"请求落哪台机器，沙箱就在那里启动"——AWS 仍集中在少数区域，Cloudflare 的 330 城市是结构性优势。第三，**AI 计费走向多维分层**——按调用、按运行时长、按状态存储、按数据出站、按模型 token 各自独立，"a stack, not a single SKU"成为常态，Cloudflare 的"闲置零成本"重构了 make-vs-buy 决策。第四，**开发者生态出现 SDK / 协议 / 运行时三层分化**——LangChain + Vercel AI SDK + Cloudflare Think 在上层竞争，MCP + A2A + WebMCP 在中层竞合，各家云的运行时在下层比性能比价格。

第五，**Long-running Agent 的状态持久化成为平台级能力**——AWS Step Functions、Temporal、Cloudflare Workflows + DO fibers、OpenAI Conversations API、Google Vertex Sessions 各有方案，Cloudflare 的 DO + fibers 把"崩溃恢复 + sub-agents + tree-structured sessions"做成第一类对象。第六，**Computer Use / Browser Use 从研究走进生产**——Anthropic Claude Computer Use、OpenAI Operator/Codex 桌面版、Cloudflare Browser Run、开源 Browser Use 框架（8.12 万 stars），Fordel Studios 估算生产流量中已有 25–35% 由浏览器 Agent 驱动。第七，**企业级治理成为刚需**——Shadow MCP、Agent Identity、Agent Card 加密证明、可观测性、RFC 9728 OAuth 必须原生内建；McKinsey 识别出 Agent 独有的五大风险，PwC 调研中 28% 高管把"对 Agent 的信任不足"列入前三挑战。第八，**Agent 经济正在重构支付层**——Cloudflare 与 Coinbase 共建 **x402 Foundation** 复活 HTTP 402 状态码，让 Agent 原生支付，因为 Agent 不看广告、不点 cookie 同意、没有注意力。

## 结语：不是升级，是换地基

**Agents Week 2026 真正的断言不是"我们发了 50 个产品"，而是"从 Web 应用到自主 Agent 的迁移不是增量升级，而是一次基础设施换代"**。Cloudflare 押注的是三件事：一、isolate 模式能在容器主导的行业赢下"一对一 Agent"这条新赛道；二、MCP 能顶住 A2A 和厂商自有协议的分化威胁，保持开放标准地位；三、边缘计算 + 零信任 + 统一推理 + 状态持久化这套组合，能比任何单一超大规模云厂商更贴合 Agent 的经济模型。从 Kimi K2.5 降本 77%、Code Mode 省 81% token、Unweight 压缩 22%、Dynamic Workers 快 100 倍这些具体数字看，技术底座已经成立；从 OpenAI Codex 团队背书、Figma 客户引用、MCP 生态渗透率看，商业势能正在积累。

但真正的悬念仍然在企业采购决策上。当 Cloudflare 同时占据网络、计算、安全、推理、存储五层，每一层都号称 10 倍优势时，"平台"和"锁定"之间只隔一层时间。**Agent 时代的第一轮基础设施战争已经打响，Cloudflare 已经把自己的筹码全部推上桌**——它赌的不是某个产品会赢，而是 Agent 数量会在未来三年从百万涨到百亿；只要这个规模假设成立，isolate 的单位经济学就会把容器模式挤下去。这是一个需要用年而不是季度验证的赌局，但方向已经不再需要争论。
