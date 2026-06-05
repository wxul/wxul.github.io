---
title: AI工具链正在成为攻击者的"新金矿"
date: 2026-03-29
badge: AI
tags: ["AI", "Security", "MCP", "LLM"]
draft: false
---

**2026年3月，AI开发生态在一周内连续遭遇两起重大供应链攻击——LiteLLM的PyPI包被投毒、Apifox桌面客户端CDN被篡改——数百万开发者的凭证和密钥面临泄露风险。** 这并非孤立事件。过去18个月里，从MCP协议到AI IDE，从Hugging Face模型仓库到LangChain框架，AI工具链的每一个环节都在遭受前所未有的安全威胁。恶意软件包上传量同比激增**156%**，大型供应链攻击事件自2020年以来增长了**4倍**。AI开发者曾经引以为傲的高效协作生态，如今正被攻击者当作通往企业核心资产的高速公路。

## LiteLLM投毒事件：一次精密的级联供应链攻击

2026年3月24日，拥有**日均340万下载量**、覆盖**36%云环境**的LLM代理框架LiteLLM，其PyPI官方包被植入了多阶段恶意载荷。这不是一次简单的typosquatting，而是一场经过精心策划的级联攻击。

攻击组织TeamPCP首先在2月底利用Trivy（Aqua Security旗下的漏洞扫描器）GitHub仓库中一个配置错误的`pull_request_target`工作流，窃取了`aqua-bot`的Personal Access Token。3月19日，他们用这个凭证在`aquasecurity/trivy-action`的77个release标签中篡改了76个，并发布了含恶意代码的Trivy v0.69.4。关键的转折点在于——**LiteLLM的CI/CD流水线中使用了未锁定版本的Trivy Action**。3月24日，当LiteLLM的构建流程运行时，被篡改的Trivy Action从GitHub Actions runner环境中窃取了`PYPI_PUBLISH` token，攻击者随即用这个token直接向PyPI发布了恶意版本。

恶意包采用了两种投递机制。**版本1.82.7**在`litellm/proxy/proxy_server.py`中注入了base64编码的载荷，当任何代码导入`litellm.proxy`时触发执行。13分钟后发布的**版本1.82.8**则更为危险——它在`site-packages/`目录下写入了`litellm_init.pth`文件，利用Python的`.pth`自动执行机制，在**每次Python解释器启动时**都会触发，无需任何import操作，甚至运行`pip`或IDE的语言服务器都会中招。

载荷本身是一个三阶段攻击程序。第一阶段收集超过**50类敏感凭证**——AWS/GCP/Azure云凭证、SSH密钥、Kubernetes配置、数据库密码、加密货币钱包（覆盖Bitcoin到Solana等10余种）、CI/CD密钥、Slack和Discord的webhook。第二阶段用**AES-256-CBC加密**数据，再用硬编码的4096位RSA公钥加密会话密钥，通过HTTPS POST发送到`models.litellm[.]cloud`（攻击者注册的仿冒域名）。第三阶段在本地部署持久化后门`~/.config/sysmon/sysmon.py`，以systemd服务形式每50分钟向`checkmarx[.]zone`轮询后续指令，并在Kubernetes环境中尝试创建特权Pod进行横向移动。

值得注意的是，这一攻击最初被发现，恰恰是因为v1.82.8的`.pth`机制导致了递归派生（fork bomb），使受害者的机器崩溃——FutureSearch的研究员Callum McMahon在Cursor IDE中的MCP插件拉取到这个恶意依赖后，发现了异常。从恶意包发布到PyPI实施隔离，窗口期约为**3小时**。该事件被纳入**CVE-2026-33634**（CVSS 9.4），并于3月27日被CISA加入已知被利用漏洞目录。Mandiant估计已有超过1000个SaaS环境受到影响，下游依赖项目包括CrewAI、DSPy、Mem0、Browser-Use等众多知名AI框架。

## Apifox CDN投毒：18天潜伏的隐蔽攻击

几乎在同一时期，国内超百万开发者使用的API开发工具Apifox也遭遇了供应链攻击，但方式截然不同。攻击者篡改了Apifox官方CDN上的JavaScript文件`apifox-app-event-tracking.min.js`，将约**40KB恶意代码**附加到原本34KB的合法分析脚本之后。

这一攻击之所以能够成功，源于两个关键弱点。其一，Apifox的Electron桌面客户端**未严格启用沙箱安全参数**，且向渲染进程暴露了Node.js API，意味着任何运行在客户端上下文中的JavaScript都拥有完整的系统访问权限——文件系统、`child_process`、加密模块一应俱全。其二，应用在启动时从远程CDN动态加载分析脚本，**没有实施子资源完整性（SRI）校验**。

攻击链分为三个阶段。初始载荷使用了高度混淆的`javascript-obfuscator`（含RC4加密字符串数组和反调试陷阱），通过读取MAC地址、CPU型号、主机名等生成设备指纹SHA-256哈希，随后窃取Apifox的localStorage中的`common.accessToken`并调用Apifox API获取用户邮箱。第二阶段从C2服务器`apifox.it.com`获取344字节的RSA加密载荷，解密后动态注入第三阶段脚本。最终载荷读取`~/.ssh/`目录（递归）、`.zsh_history`、`.bash_history`、`.git-credentials`等敏感文件，在Windows上执行`tasklist`、在macOS/Linux上执行`ps aux`进行环境侦察，然后将数据经gzip压缩、以`scrypt("apifox", "foxapi", 32)`派生的密钥进行**AES-256-GCM加密**后外传。

C2基础设施全部部署在**东京AWS EC2**上，使用`.it.com`商业子域名服务（非意大利顶级域名），主域名为`apifox.it.com`，还关联了`upgrade.feishu.it.com`（FRP反向代理）和`cdn.openroute.dev`等多个辅助节点。攻击活跃窗口从**3月4日持续到3月22日，长达18天**。Apifox于3月23日发布v2.8.19将远程脚本改为本地打包，但**未同步发布安全公告**。直到3月25日安全社区开始公开披露，Apifox才正式确认此事。SlowMist、腾讯云安全中心、知名安全研究者phith0n等均发布了详细分析。目前该事件**尚未分配CVE编号**。

## MCP协议与AI IDE：新兴攻击面全面暴露

如果说LiteLLM和Apifox是"点"上的攻击，那么MCP（Model Context Protocol）生态的安全隐患则是一个"面"级别的系统性风险。Anthropic于2024年11月推出MCP以来，短短一年内已曝出**10余起重大安全事件**。

2025年4月，Invariant Labs演示了一个恶意MCP Server通过"工具投毒"（Tool Poisoning）手法，在一个看似正常的"每日趣闻"工具中植入隐蔽指令，成功劫持了与合法WhatsApp MCP Server的通信，将用户的全部聊天历史外传至攻击者手机号。5月，同一团队发现针对GitHub官方MCP Server的提示注入攻击——一个恶意的公开GitHub Issue就能劫持AI助手，从私有仓库中窃取代码并通过公开PR泄露。7月，`mcp-remote`库（43.7万+下载量）被披露存在严重的OS命令注入漏洞（**CVE-2025-6514，CVSS 9.6**），Cloudflare、Hugging Face、Auth0等均为其下游用户。9月，一个伪装成"Postmark MCP Server"的恶意包被发现在所有邮件通信中默默添加BCC抄送到攻击者服务器。10月，GitGuardian在MCP托管平台Smithery中发现路径遍历漏洞，通过泄露的Fly.io API Token可控制**3000+托管MCP Server应用**。

研究者使用STRIDE/DREAD模型对MCP架构进行威胁建模，共识别出**57种威胁**。实测显示**43%的公开MCP Server存在命令注入漏洞**，33%允许不受限制的网络访问。

AI IDE领域同样不容乐观。2025年12月，安全研究者Ari Marzouk历时6个月的"IDEsaster"研究项目发现，**100%被测试的AI IDE都存在可利用漏洞**——涵盖Cursor、Windsurf、GitHub Copilot、JetBrains Junie、Zed.dev、Roo Code等主流工具，共分配了**24个CVE**。攻击链通常遵循一个模式：提示注入→读取敏感文件→写入含远程schema的JSON→通过GET请求泄露数据。Cursor的CurXecute漏洞（**CVE-2025-54135，CVSS 8.5**）尤其值得关注——一条恶意Slack消息通过Cursor的摘要功能就能触发MCP配置文件改写，实现任意代码执行。Pillar Security在2025年3月发现的"Rules File Backdoor"技术利用零宽连接符等不可见Unicode字符在`.cursorrules`或`.github/copilot-instructions.md`中植入隐藏指令，使AI在生成看似正常代码的同时注入后门——**这一攻击在代码审查中几乎不可见**。

在LLM框架层面，LangChain的"LangGrinch"序列化注入漏洞（**CVE-2025-68664，CVSS 9.3**）允许攻击者通过LLM响应中的`additional_kwargs`字段注入恶意对象，实现环境变量窃取乃至远程代码执行。Ollama则在2025年曝出多个漏洞，包括**CVE-2025-63389**（认证绕过）和**CVE-2025-51471**（跨域Token泄露），后者可让攻击者窃取用户对registry.ollama.ai的认证令牌。

## "Slopsquatting"与模型投毒：AI创造自己的攻击面

AI工具链安全中最令人不安的趋势之一，是**AI本身正在创造新的攻击面**。2025年，Python软件基金会开发者Seth Larson提出了"Slopsquatting"概念——LLM在生成代码时会"幻觉"出看似合理但实际不存在的包名。攻击者只需在PyPI或npm上注册这些被"幻觉"出的名称并植入恶意代码，就能坐等开发者上钩。USENIX Security 2025的研究显示，在对16个模型、57.6万个代码样本的测试中，**约20%推荐的包名是虚构的**，其中43%的幻觉包名会在多次运行中稳定重复出现，开源模型的幻觉率（21.7%）远高于商业模型（5.2%）。

Hugging Face模型仓库同样面临严峻挑战。ReversingLabs在2025年2月发现了名为"nullifAI"的攻击技术——恶意模型使用7z压缩替代ZIP来绕过Picklescan安全扫描器，在Pickle文件的反序列化流开头插入反向Shell载荷，**在平台上潜伏超过8个月未被发现**。Palo Alto Unit 42在9月披露了模型命名空间重用攻击——当Hugging Face用户删除账户后，攻击者可注册相同的命名空间并发布恶意模型，研究者在Google Vertex AI和Microsoft Azure AI Foundry中均发现了可被利用的孤立模型引用。截至2025年4月，Protect AI的扫描数据显示，Hugging Face上有**51,700+个模型存在352,000+个不安全或可疑问题**。

## 为什么AI工具链成为攻击热点

AI工具链之所以成为攻击焦点，根源在于三个结构性因素。

**第一，信任模型严重失衡。** AI开发生态高度依赖第三方组件——预训练模型、开源库、云API、模型仓库——但目前**不存在标准化的模型签名和完整性验证机制**。开发者习惯性地信任来自知名仓库的包和模型，一旦源头被污染，恶意代码就能沿着依赖关系自动传播到数千个下游项目。LiteLLM事件完美诠释了这一逻辑：Trivy（安全扫描器）→ LiteLLM（AI框架）→ CrewAI/DSPy等（AI应用），一个安全工具的沦陷最终颠覆了它本应守护的整个生态。

**第二，AI加速了攻击的规模化。** TeamPCP使用了名为"hackerbot-claw"的AI代理进行自动化攻击目标筛选，其"CanisterWorm"蠕虫利用Internet Computer Protocol区块链作为C2通道——这是供应链攻击中首次记录的去中心化C2技术。攻击者甚至利用AI生成恶意脚本（Palo Alto Unit 42以"中等置信度"判断部分攻击载荷具有AI代码生成特征）。IBM X-Force报告指出，AI正在加速攻击者的整个作战流程。

**第三，开发速度与安全审计之间的鸿沟持续扩大。** 据GitHub统计，**97%的开发者至少使用过一次AI编码工具**。DevOps团队面临快速交付AI应用的巨大压力，代码审计沦为"事后诸葛亮"。CrowdStrike在企业设备上检测到**1800+种AI应用**的"Shadow AI"使用，大量工具在安全团队的视野之外运行。

攻击者常用的TTP已形成清晰的模式。除了传统的依赖混淆和typosquatting之外，**工具投毒**（在MCP工具描述元数据中嵌入隐藏恶意指令操控LLM推理）、**Rug Pull攻击**（MCP Server在获得授权后悄悄修改工具定义）、**间接提示注入**（通过外部数据源向RAG知识库注入恶意提示）以及**CI/CD流水线劫持**（利用被污染的安全工具窃取发布凭证）正在成为主流攻击手法。MITRE ATLAS v5.4.0已将"Publish Poisoned AI Agent Tool"和"Escape to Host"纳入正式攻击技术目录。

## 防御实践：从开发者个人到企业体系

面对如此复杂的威胁态势，防御需要在多个层面同时展开。

**对于开发者个人**，最重要的行动是在依赖管理上回归严谨。永远使用lockfile并**锁定依赖到精确版本号**，在CI/CD中使用hash-pinned引用而非可变标签（LiteLLM事件的直接教训）。对AI编码助手推荐的每一个依赖，**手动在官方注册表中验证其存在性和作者身份**——slopsquatting攻击专门利用开发者对AI建议的盲目信任。在模型使用上，优先选择**SafeTensors或ONNX等安全序列化格式**，避免直接加载Pickle格式模型。使用MCP工具时，审查工具的元数据描述是否包含异常指令，在首次评估新模型或工具时使用沙箱隔离环境。

**对于企业安全团队**，建立**AI物料清单（AI-BOM）**是第一步——清点所有在用的AI模型、数据集、库、API和第三方服务。部署Shadow AI发现工具，识别未经审批的AI工具使用。在CI/CD流水线中实施行为分析监控，检测构建和推理过程中的异常API调用、文件访问和数据外传行为。对所有Agentic框架中的工具进行**版本锁定，禁止自动更新**。MCP Server通信应要求mTLS和证书固定。将AI威胁建模纳入每个AI项目的设计阶段——明确不可信数据的入口点，设定"绝不可为"的行为边界，为规模化失败设计检测机制。

**在标准框架层面**，OWASP LLM Top 10 2025版已将**供应链风险提升至第3位**，新增"系统提示泄露"（LLM07）和"向量与嵌入弱点"（LLM08）两个AI特有风险类别。NIST AI RMF 1.0及其配套的生成式AI概要（NIST AI 600-1）提供了Govern-Map-Measure-Manage四层风险管理框架。MITRE ATLAS v5.1.0现包含**16个战术、84个技术、56个子技术和42个案例研究**，是AI威胁建模的权威参考。Google的SAIF框架和Coalition for Secure AI（CoSAI）的6项关键控制措施则提供了更具操作性的安全实践指引。

## 结论：安全债务正在以AI速度累积

2026年3月的这一周，可能会被记住为AI安全的"分水岭时刻"。LiteLLM和Apifox事件表明，攻击者已经完全理解了AI工具链的信任拓扑——他们不需要直接攻击最终目标，只需要在开发者信任的某一个环节植入恶意代码，就能借助依赖关系和自动化流水线实现指数级扩散。TeamPCP的级联攻击从一个安全扫描器的CI配置错误开始，最终威胁到了覆盖36%云环境的AI框架及其所有下游项目，这是一个深刻的警示。

AI生态的安全问题不是某一个CVE能解决的。它需要从根本上重建信任模型——对模型实施密码学签名、对依赖实施严格的完整性验证、对Agent的工具调用实施最小权限原则、对CI/CD凭证实施零信任管理。当整个行业以前所未有的速度拥抱AI工具时，安全债务也在以同样的速度累积。每一个`pip install`、每一次MCP Server连接、每一个AI IDE的Tab补全，都可能是下一个攻击的入口点。清醒地认识这一点，是防御的起点。
