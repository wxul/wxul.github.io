---
title: AI 时代 HTML 转 Markdown 方案对比
date: 2026-04-03
badge: AI
tags: ["AI", "LLM", "Developer"]
draft: false
---

**HTML 转 Markdown 已成为 AI 工程的基础设施级需求。** Cloudflare 实测数据显示，同一网页的 HTML 消耗 **16,180 tokens**，转为 Markdown 仅需 **3,150 tokens**，压缩率达 **80%**。在大规模 RAG 管道中，这意味着每月处理 10 万网页时，仅输入 token 一项即可节省 **$3,200–$4,800/月**（按 GPT-4o/Claude Sonnet 定价计算）。本文从 AI/LLM 开发者视角，系统梳理当前所有主流方案的特性、性能与适用场景。

---

## 为什么 AI 工作流必须做 HTML 转 Markdown

HTML 并非为 LLM 设计。一个简单的 `<h1>My Title</h1>` 消耗约 **23 tokens**，而等价的 `# My Title` 仅需 **3 tokens**——单个元素即减少 87%。在页面级别，token 浪费更为惊人：CSS 类名、`<script>` 标签、导航栏、广告代码等"信息噪声"通常占据原始 HTML **70-90%** 的 token 空间。

### 量化数据汇总

目前可获得的量化基准来自多个独立来源：**Cloudflare** 在其 "Markdown for Agents" 功能的官方博客中报告了单页 80% 的 token 压缩率；**HtmlRAG**（WWW 2025 论文）的实验显示 Markdown 转换可移除原始 HTML **90.32%** 的 tokens（而其 HTML-Clean 方案移除 94.07%）；SearchCans 在千万级网页的生产环境中声称达到 **70-90%** 的压缩率。综合来看，**50-80% 的 token 节省**是一个可靠的预期范围，具体取决于网页复杂度和转换工具的去噪能力。

### 对 RAG 管道的三重影响

**成本直降**是最直观的收益。以 Claude Sonnet（**$3/百万输入 token**）处理 **10 万页/月** 为例，从 **16 亿 token** 降至 **3.2 亿 token**，年节省约 **$46,000**。企业级百万页场景下，年节省可达 **$38 万以上**。

**上下文窗口利用率**同等重要。80% 的压缩意味着同一上下文窗口可容纳 **5 倍**内容，直接减少多轮调用需求。对于需要跨多个文档推理的 RAG 场景，这是质的提升。

**检索质量**常被忽视但影响深远。Markdown 天然支持按标题（`#`、`##`）进行语义分块（semantic chunking），而 HTML 容易在 `<div>` 标签中间被截断，产生无意义片段。Spider 的基准测试显示，使用高质量 Markdown 输出的 Crawl4AI 与其他工具在 recall@5 上存在 **7 个百分点**的差距。

### HtmlRAG 的反面论点值得关注

WWW 2025 论文 HtmlRAG 发现，经过清洗和剪枝的 HTML 在部分 QA 数据集上优于纯文本和 Markdown，因为 HTML 保留了更多结构语义（表格 `<table>`、代码 `<code>`、链接 `<a>` 等标签的显式语义）。但评审者指出该对比不够公平——HtmlRAG 使用了专门的 block-tree 剪枝器，而对照组未做等价处理。**实际上，高质量的语义 Markdown（保留表格结构、代码块、链接）与清洗后的 HTML 在效果上趋于收敛**。两者的共同敌人是未经处理的原始 HTML。

---

## URL → Markdown API 服务：四大平台横评

### Jina Reader——轻量级首选

Jina Reader 的使用极其简单：在任意 URL 前加上 `https://r.jina.ai/` 即可获得 Markdown 输出。底层采用 Puppeteer 无头浏览器渲染、Mozilla Readability 内容提取、Turndown + 正则进行转换。可选启用 **ReaderLM-v2** 引擎（1.5B 参数专用模型，消耗 3 倍 token）处理复杂页面。

免费额度为每个 API Key **1,000 万 tokens**，无需注册即可使用基础功能。付费后约 **$0.02/百万 token**（token 充值包形式），与 Jina 的 Embedding、Reranker 共享 token 池。速率限制分三档：免费 100 RPM / 2 并发，付费 500 RPM / 50 并发，高级 5,000 RPM / 500 并发。开源（Apache-2.0），**10.2K** GitHub Stars，SOC 2 合规。

**优势**：零配置上手、支持 JS 渲染与代理、搜索模式（s.jina.ai）、图片描述、PDF 解析、Shadow DOM 提取。**劣势**：ReaderLM-v2 模式成本较高；大规模爬取场景下，依赖外部 API 增加延迟和成本。

### Firecrawl——企业级全功能平台

Firecrawl 是 Y Combinator 支持的创业公司（$14.5M A 轮融资），提供 Scrape（单页）、Crawl（递归爬取）、Map（URL 发现）、Search（搜索+提取）、Extract（LLM 结构化提取）、Browser Sandbox（Playwright 云端执行）等全套功能。SDK 覆盖 Python、Node.js、Go、Rust。

定价采用信用制（年付价格）：Hobby **$16/月**（3,000 credits），Standard **$83/月**（10 万 credits），Growth **$333/月**（50 万 credits），Scale **$599/月**（100 万 credits）。每次 Scrape/Crawl 消耗 1 credit，Search 消耗 2 credits/10 结果，AI Extract 消耗 5 credits。开源但采用 **AGPL-3.0** 许可证（分叉代码必须开源），GitHub Stars 约 **10 万**。SOC 2 Type 2 合规。

**优势**：功能最全面、企业合规、内置反爬/代理/CAPTCHA 处理、与 LangChain/LlamaIndex 有官方一等集成（`FireCrawlLoader`、`FirecrawlReader`）。**劣势**：AGPL 许可证对商业闭源产品有限制；自托管版本功能不完整；大规模使用成本较高。

### Crawl4AI——开源性价比之王

Crawl4AI 是纯开源（Apache-2.0）的 Python 爬虫框架，专为 LLM/AI Agent 设计，GitHub Stars 约 **61.6K**。核心特性包括：Playwright 无头浏览器、**Fit Markdown**（智能去噪）、BFS/DFS/BestFirst 深度爬取策略、Memory-Adaptive Dispatcher、LLM 结构化提取（支持本地和远程模型）、会话管理与反爬能力。

**完全免费，无 API Key 要求**。v0.8.5 引入了自动三层反爬检测与代理升级机制。官方基准测试显示其速度为 Firecrawl 的 **4-6 倍**（简单爬取 1.60s vs 7.02s）。与 LangChain/LlamaIndex 的正式集成仍在开发中，但输出可直接用于任何框架。

**优势**：完全免费、速度极快、本地优先（数据不离开你的服务器）、Fit Markdown 去噪、活跃社区。**劣势**：需自行部署和维护基础设施；LangChain/LlamaIndex 一等集成尚未完成；缺乏企业级 SLA 和合规认证。

### urltomarkdown——极简工具

基于 Node.js（Turndown + Readability + jsdom）的轻量服务，324 GitHub Stars。简单 GET 请求即可使用。**不支持 JS 渲染**，无反爬能力，无批量处理。适合快速原型验证和简单静态页面，不适合生产环境。

| 维度  | Jina Reader | Firecrawl | Crawl4AI | urltomarkdown |
| --- | --- | --- | --- | --- |
| **定价** | ~$0.02/百万token | $16–599+/月 | 完全免费 | 完全免费 |
| **许可证** | Apache-2.0 | AGPL-3.0 | Apache-2.0 | 宽松许可 |
| **GitHub Stars** | 10.2K | ~100K | 61.6K | 324 |
| **JS 渲染** | ✅ Puppeteer | ✅ 无头浏览器 | ✅ Playwright | ❌   |
| **反爬/代理** | ✅ 内置 | ✅ 旋转代理+CAPTCHA | ✅ 三层自动检测 | ❌   |
| **LangChain 集成** | HTTP 调用 | ✅ 官方 Loader | ⚠️ 开发中 | ❌   |
| **自托管** | ✅   | ✅(AGPL) | ✅   | ✅   |
| **最佳场景** | 轻量 URL→MD | 企业全功能爬取 | 自托管高性价比 | 简单原型 |

---

## Python 库：五大工具深度对比

### trafilatura——内容提取的黄金标准

trafilatura 不仅仅是格式转换器，它是一个完整的 **Web 内容提取引擎**，结合 Readability、jusText 和自定义启发式算法，能自动去除导航栏、广告、页脚等噪声。在 ScrapingHub 基准测试中达到 **F1 = 0.945**（所有开源工具最高），被 HuggingFace、IBM、Microsoft Research、Stanford 等机构广泛使用。

Apache-2.0 许可证，**5,300** GitHub Stars，1,599 次提交，活跃维护中（最新版 2.0.0）。支持输出为 TXT、Markdown、CSV、JSON、XML 等多种格式。通过 `include_tables=True`、`include_links=True`、`include_images=True` 可控制表格、链接、图片的保留。LangChain 提供 `TrafilatureLoader`，LlamaIndex 同样有集成。

**最佳用途**：从 URL 直接获取干净的 Markdown 内容——一步完成抓取、提取、转换。是 RAG 管道中从 Web URL 到 LLM 输入的最优单一工具。

### markdownify——LangChain 官方之选

纯 Python 的 HTML→Markdown 转换器，基于 BeautifulSoup，MIT 许可证，**2,100** Stars。特点是**高保真逐标签转换**和极强的可定制性：支持标签白名单/黑名单、ATX/SETEXT 标题风格、代码块语言标注（`code_language_callback`）、GFM 表格（`table_infer_header`）、文本换行等。可通过子类化 `MarkdownConverter` 实现完全自定义。

**关键优势**：它是 LangChain 的**官方推荐** HTML→Markdown 转换器，通过 `MarkdownifyTransformer` 提供一等集成。**注意**：markdownify 不做内容提取——它会转换 HTML 中的一切（包括导航栏和广告），通常需要配合 readability-lxml 或其他提取器使用。

### html2text——元老级工具

由 Aaron Swartz 创建的经典工具，2004 年首发，目前由 Alir3z4 维护（最新版 2025.4.15）。轻量快速，**2,000** Stars。但有两个重大问题：**GPL-3.0 许可证**对商业闭源项目有严格限制；表格处理和代码块标记使用非标准格式（`[code]` 标签而非围栏代码块）。维护频率偏低。LangChain 提供 `Html2TextTransformer` 但 markdownify 已成为更推荐的替代品。

### html-to-markdown（Rust 加速版）——速度冠军

Kreuzberg 团队开发的高性能转换器，纯 Rust 核心 + PyO3 Python 绑定。V2 是完全的 Rust 重写，吞吐量达 **144–208 MB/s**，比 V1 Python 版快 **60-80 倍**，比同类 Python 库快 **19-30 倍**。MIT 许可证，607 Stars，CommonMark 兼容，支持 GFM 表格、围栏代码块、内联图片提取。提供 Python、Rust、Node.js、WASM、Ruby、CLI 多语言绑定。

**最佳用途**：需要处理海量 HTML 的批量转换管道。适合技术文档等结构良好的 HTML，但不具备内容提取能力（不会自动去除噪声）。推荐与 trafilatura 组合使用：trafilatura 提取内容 → html-to-markdown 精确转换结构。

### readability-lxml——提取预处理层

Arc90 Readability 算法的 Python 移植，输出**清洗后的 HTML**（非 Markdown），ScrapingHub F1 = 0.922。Apache-2.0 许可证，**2,600** Stars。通常与 markdownify 或 html2text 串联使用：`readability-lxml` 去噪 → `markdownify` 转格式。LlamaIndex 提供 `ReadabilityWebPageReader`。

| 库   | 许可证 | Stars | 速度  | 内容提取 | 表格  | 代码块 | LangChain |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **trafilatura** | Apache-2.0 | 5.3K | 中等  | ✅ F1=0.945 | ✅ 基础 | ⚠️ 基础 | ✅ Loader |
| **markdownify** | MIT | 2.1K | 中等  | ❌   | ✅ GFM | ✅ 围栏+语言 | ✅ 官方 Transformer |
| **html2text** | GPL-3.0 | 2.0K | 快   | ❌   | ⚠️ 基础 | ⚠️ 非标准 | ✅ Transformer |
| **html-to-markdown** | MIT | 607 | ⚡极快 | ❌   | ✅ GFM | ✅ 围栏+语言 | 通过 Kreuzberg |
| **readability-lxml** | Apache-2.0 | 2.6K | 中等  | ✅ F1=0.922 | 透传  | 透传  | ✅ Reader |

---

## JavaScript 库与通用工具

### Turndown——JS 生态的事实标准

Turndown 是 JavaScript 世界最主流的 HTML→Markdown 库，**10,500** GitHub Stars，MIT 许可证，支持浏览器和 Node.js 双环境。通过 `turndown-plugin-gfm` 插件支持 GFM 表格、任务列表、删除线。强大的 `.addRule()` 自定义规则系统和 `.keep()` / `.remove()` API 使其高度可扩展。它是 MarkDownload 浏览器扩展、众多 MCP 服务器和 Jina Reader 底层的转换引擎。

**node-html-markdown** 是性能替代品（MIT，251 Stars），基准测试显示比 Turndown 快约 **1.57 倍**（50MB HTML：8.8s vs 14s），适合大批量处理场景，但生态和插件系统远不如 Turndown 丰富。

### Readability + Turndown——黄金组合模式

这是 JS 生态中内容提取 + Markdown 转换的**标准范式**：Mozilla Readability（Apache-2.0，~10K Stars，Firefox 阅读模式同款算法）负责从 DOM 中提取主体内容并去除噪声，Turndown 负责将清洁 HTML 转为 Markdown。代码模式极其简洁：

```javascript
const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');
const TurndownService = require('turndown');
const { gfm } = require('turndown-plugin-gfm');

const dom = new JSDOM(html, { url: pageUrl });
const article = new Readability(dom.window.document).parse();
const turndown = new TurndownService();
turndown.use(gfm);
const markdown = turndown.turndown(article.content);
```

MarkDownload 浏览器扩展、多个 MCP 服务器以及大量 RAG 工具链都采用这一模式。局限性在于 Readability 对非文章类页面（仪表盘、表单页）的识别较差。

### Pandoc——万能转换器的 AI 局限

Pandoc（GPL v2+，**42,700** Stars）是文档格式转换领域的瑞士军刀，支持数十种格式互转，Markdown 输出可选 pandoc、commonmark、gfm、strict 等多种风格。通过 Lua Filter 可修改内部 AST，实现高度定制。**表格处理**支持管线表、多行表、网格表等多种形式，质量在所有工具中最高。

然而，Pandoc 对 AI 工作流有明显局限：不做内容提取（转换全部 HTML 包括噪声）；Haskell 运行时启动较慢；复杂表格（`<td>` 内嵌 `<p>` 等块级元素）可能回退为原始 HTML。**最适合批量处理结构良好的文档**（技术文档、论文），不适合实时 Web 抓取场景。

---

## LLM 框架如何内置处理 HTML

### LangChain 的两步管道

LangChain 的标准模式是 **Loader → Transformer**。`AsyncHtmlLoader` 通过 aiohttp 并发加载原始 HTML，然后通过 `MarkdownifyTransformer`（基于 markdownify）或 `Html2TextTransformer`（基于 html2text）转换为 Markdown。此外，`FireCrawlLoader` 和 `SpiderLoader` 直接返回 Markdown 输出，跳过中间步骤。

```python
from langchain_community.document_loaders import AsyncHtmlLoader
from langchain_community.document_transformers import MarkdownifyTransformer

docs = AsyncHtmlLoader(["https://example.com"]).load()
md_docs = MarkdownifyTransformer().transform_documents(docs)
```

LangChain 推荐 **MarkdownifyTransformer** 作为首选方案，其可配置性（`strip`、`convert`、`heading_style` 等参数）优于 Html2TextTransformer。

### LlamaIndex 更依赖外部服务

LlamaIndex 没有等价于 LangChain Transformer 的内置 HTML→Markdown 转换器。它提供 `HTMLNodeParser`（基于 BeautifulSoup 提取文本）和 `MarkdownNodeParser`（按标题分块），但 HTML→Markdown 的转换主要依赖外部服务：`FireCrawlWebReader`、`SpiderWebReader`、`ScrapflyReader`、`OxylabsWebReader` 等。本地方案需用户自行组合 readability-lxml + markdownify 或 trafilatura。

---

## Jina ReaderLM-v2：AI 模型做格式转换的新范式

ReaderLM-v2 是 Jina AI 发布的 **1.5B 参数小模型**，专门训练用于 HTML→Markdown 和 HTML→JSON 转换。基于 Qwen2.5-1.5B-Instruction 架构，通过 ring-zag attention + RoPE 支持 **512K tokens** 的超长上下文，覆盖 29 种语言。

### 性能超越远大于己的模型

在 HTML→Markdown 基准测试中，ReaderLM-v2 的 **ROUGE-L 达到 0.84**，比 GPT-4o（~0.68）和 Qwen2.5-32B（~0.69）高出 **15-20 个百分点**。这是"专精小模型胜过通用大模型"的典型案例。训练采用独特的 **Draft-Refine-Critique** 流水线（由 Qwen2.5-32B 提供教师信号），结合 DPO 和自博弈强化调优，突破了传统规则引擎转换质量的天花板。

### 规则引擎 vs AI 模型的选择框架

**规则引擎**（Turndown、markdownify、trafilatura）在处理结构良好的标准 HTML 时快速、确定性、零成本。但遇到格式混乱的 HTML、复杂嵌套表格、LaTeX 数学公式、深层嵌套列表时，规则引擎往往产出垃圾或丢失结构。**ReaderLM-v2** 将格式转换视为"翻译"而非"选择性复制"，在这些边缘场景中表现显著更优。

推荐的**混合策略**：95% 的页面用规则引擎快速处理（trafilatura + markdownify），对检测到的复杂页面（表格密集、数学公式、格式异常）降级到 ReaderLM-v2。这兼顾了速度、成本与质量。

**硬件需求**：T4 GPU 上可运行（67 tokens/s 输入，36 tokens/s 输出），生产环境推荐 RTX 3090/4090。也可通过 Ollama 本地部署或通过 Jina API 使用（消耗 3 倍 token）。**许可证为 CC BY-NC 4.0**（非商业），商业使用需向 Jina 获取许可。

---

## Fit Markdown 与内容去噪策略

**Fit Markdown** 是 Crawl4AI 提出的核心概念：先将 HTML 转为完整 `raw_markdown`，再通过内容过滤算法生成精简的 `fit_markdown`。提供两种过滤器：

**PruningContentFilter**（无监督）基于文本密度、链接密度和标签权重评分每个 HTML 节点，丢弃低于阈值的节点（如侧边栏、重复内容），额外处理时间仅 **~50ms**。**BM25ContentFilter**（有监督）根据用户查询的 BM25 相关性排序内容片段，适合搜索导向的应用。在 RAG 管道中，`fit_markdown` 可直接送入向量数据库，显著减少噪声 token。

Jina Reader 的等价概念是"LLM-friendly Markdown"——通过 Mozilla Readability 去除页头、页脚、导航、侧边栏后输出干净内容。Microsoft 的 **MarkItDown**（MIT 许可证）则提供统一接口，将 Office 文档、HTML、PDF 统一转为 Markdown，已被 AutoGen 多智能体框架采用。

---

## 动态内容与大规模管道的工程实践

### 处理 JavaScript 渲染页面

SPA（React/Vue/Angular）和动态加载内容是 HTML 转 Markdown 的主要技术挑战。核心方案是**无头浏览器**（Playwright 或 Puppeteer）先完成 JS 渲染，再提取 HTML。Crawl4AI 和 Firecrawl 均内置此能力。实用技巧包括：使用 `wait_for` 等待特定 CSS 选择器出现、执行自定义 JS 点击"加载更多"按钮、检查 `window.__NEXT_DATA__`（Next.js）或 `__INITIAL_STATE__`（Vue/Nuxt）直接获取数据（比渲染更高效）。

**混合策略**（Zyte 模式）在大规模场景下更经济：仅用浏览器完成初始 JS 挑战和 Cookie 获取，后续页面切换为轻量 HTTP 客户端。Cloudflare 的 "Markdown for Agents" 从服务端直接提供 Markdown（请求头 `Accept: text/markdown`），完全免除客户端渲染。

### 生产级爬取管道参考架构

大规模 Web→Markdown 管道通常采用三层架构。**Bronze 层**（原始存储）：URL 调度器 → 爬虫工作池（HTTP + 无头浏览器混合）→ 代理池 + 限速器 → 原始 HTML 存入 S3/GCS。**Silver 层**（清洗转换）：HTML 清洗 → 内容提取（trafilatura）→ Markdown 转换 → 结构化数据提取。**Gold 层**（消费就绪）：质量校验 → 去重（SimHash/MinHash）→ 入库（向量数据库/Elasticsearch）。

关键工程要点：URL 去重采用归一化 + 内容哈希；遵守 robots.txt 和爬取间隔；请求间随机延迟 + 指数退避；代理轮换需匹配 User-Agent 地理位置；监控延迟、成功率、提取质量、队列深度。Zyte 等企业级平台每月处理 **90 亿页面**，证明此架构可扩展至极大规模。

---

## 按场景推荐最优方案

**个人开发者/原型验证**：直接使用 **Jina Reader API**（`r.jina.ai`），零配置、1,000 万免费 token、无需部署。Python 侧用 **trafilatura** 一行代码完成 URL→Markdown。

**初创公司（中等规模）**：**Crawl4AI** 自托管（完全免费、Apache-2.0、速度快）+ **markdownify** 做后处理。若需要 LangChain 生态深度集成且预算允许，选 **Firecrawl** Standard 方案（$83/月，10 万 credits）。

**企业级生产环境**：**Firecrawl** Growth/Scale 方案（SOC 2 合规、企业 SLA、全功能反爬），或 Crawl4AI 自托管 + 企业级代理服务（如 Oxylabs、Bright Data）。对格式转换质量有极高要求的场景，引入 **ReaderLM-v2** 作为降级处理层。

**RAG 管道最佳实践**：**trafilatura**（内容提取）→ **markdownify** 或 **html-to-markdown**（结构转换）→ LangChain `MarkdownTextSplitter`（语义分块）→ 向量数据库。这是成本、质量、速度的最优平衡。

**实时抓取/AI Agent**：**Jina Reader API**（低延迟、流式输出）或 **Crawl4AI**（本地部署、无 API 依赖）。Cloudflare 站点可直接请求 Markdown 格式。

---

## 快速上手代码示例

**Python——trafilatura 一步到位**：

```python
from trafilatura import fetch_url, extract

url = "https://example.com/article"
downloaded = fetch_url(url)
markdown = extract(downloaded, output_format="markdown",
                   include_links=True, include_tables=True)
print(markdown)
```

**Python——Jina Reader API 调用**：

```python
import requests

url = "https://r.jina.ai/https://news.ycombinator.com/"
headers = {"Accept": "application/json"}  # 可选加 Authorization: Bearer <key>
resp = requests.get(url, headers=headers, timeout=30)
print(resp.json()["data"]["content"][:500])
```

**JavaScript——Readability + Turndown 黄金组合**：

```javascript
const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');
const TurndownService = require('turndown');
const { gfm } = require('turndown-plugin-gfm');

async function urlToMarkdown(url) {
  const res = await fetch(url);
  const html = await res.text();
  const dom = new JSDOM(html, { url });
  const article = new Readability(dom.window.document).parse();
  const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
  turndown.use(gfm);
  return turndown.turndown(article.content);
}
```

---

## 结论：格式转换已成为 AI 基础设施的隐性瓶颈

HTML 转 Markdown 看似是简单的格式问题，实则是影响 AI 应用成本、质量和架构的**基础设施级决策**。核心洞察有三点。

第一，**没有单一"最佳"工具**——最优方案取决于你在"内容提取质量 vs 结构保真度 vs 处理速度 vs 部署成本"四个维度上的优先级。trafilatura 在提取质量上最优，html-to-markdown（Rust）在速度上碾压，Firecrawl 在企业功能上最全，Crawl4AI 在开源性价比上无出其右。

第二，**混合架构是现实中的最优解**。规则引擎处理 95% 的常规页面，ReaderLM-v2 等 AI 模型处理 5% 的复杂页面——这比纯规则或纯 AI 方案都更具经济性和鲁棒性。Fit Markdown / 内容去噪是从"能用"到"好用"的关键一步。

第三，**这个领域正在快速演进**。Cloudflare 的服务端 Markdown 输出、Jina ReaderLM-v2 的专用小模型范式、Crawl4AI 的 Fit Markdown 概念——这些都是 2024-2025 年涌现的创新。2026 年值得关注的趋势是：更多网站原生提供 Markdown 格式、专用转换模型与规则引擎的进一步融合、以及 HTML 结构信息在 RAG 中的选择性保留（而非一刀切转 Markdown）。
