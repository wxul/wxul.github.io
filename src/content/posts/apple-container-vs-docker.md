---
title: 苹果开源的 container 到底是什么？它会取代 Docker 吗？
date: 2026-06-12
badge: Apple
tags: ["Apple", "Docker", "container", "macOS", "WWDC", "DevTools"]
draft: false
---

2025 年 6 月的 WWDC 上，在被 Liquid Glass 设计语言和 Apple Intelligence 抢走全部聚光灯的同时，苹果悄悄地把一份礼物塞给了开发者群体——一个名为 `container` 的开源命令行工具，以及它底下的 Swift 框架 `Containerization`。代码当天就推到了 GitHub 上的 `apple/container` 仓库，采用 Apache 2.0 许可证。

一年之后的 2026 年 6 月 9 日，这个项目发布了 1.0.0 正式版，GitHub 星标超过 2.6 万，Fork 数突破 780。

对于长期在 Mac 上用 Docker 跑 Linux 容器的开发者来说，这件事的分量，可能比当晚发布会上任何一项 AI 功能都更值得关注。

## 这玩意儿到底是干嘛的

一句话：**在搭载 Apple Silicon 的 Mac 上，以"轻量级虚拟机"的方式运行 Linux 容器**。

听上去和 Docker Desktop 干的事情没什么两样，但魔鬼藏在"轻量级虚拟机"这五个字里。

要理解苹果为什么要做这个项目，得先回顾一个基本事实：**容器（container）在本质上是 Linux 内核的特性**——cgroups、namespaces 这些都是 Linux kernel 提供的。macOS 内核根本没有这些机制，所以 Mac 上跑 Linux 容器，从来都必须借助某种形式的虚拟化：在 macOS 上启一台 Linux 虚拟机，容器跑在虚拟机里。

Docker Desktop、Podman、Rancher Desktop、OrbStack、Colima、Lima……Mac 平台上所有的容器方案，无一例外都是这个思路。它们之间的区别只在于：这台 Linux 虚拟机用的是什么 hypervisor、用了哪种文件共享方式、UI 做得漂不漂亮。

苹果的 container 项目也没有跳出这个框架——它依然要起 Linux 虚拟机。**但它换了一种姿势。**

## 一个容器，一台虚拟机

传统的 Docker Desktop 是这样的：启动后，后台始终运行**一台**大的 Linux 虚拟机，你跑的所有容器全部挤在这台虚拟机里，共享同一个 Linux 内核。这个架构高效、简单，但代价是：

- 不管你有没有容器要跑，这台虚拟机都默默驻留在后台，占着内存、消耗电池；
- 所有容器共享内核，一旦某个容器爆出内核级漏洞，旁边的容器都跟着遭殃；
- 文件挂载、网络转发都要穿过这台共享虚拟机，性能会有损耗。

苹果的 container 反其道而行之，采用了 **"一个容器，一台轻量虚拟机"（one VM per container）** 的架构。每启动一个容器，苹果就单独为它拉起一台微型 Linux 虚拟机，容器跑完就销毁，虚拟机也跟着烟消云散。

这个思路本身不算新——AWS 的 Firecracker、Kata Containers 多年前就在云上这么干了。但把它做进消费级桌面操作系统，并且让用户体验依然像 Docker 一样轻便，苹果是头一个。

实现这件事的关键拼图有几块：

**Virtualization.framework**：macOS 自带的虚拟化框架，直接调用底层的 Hypervisor.framework，不需要第三方 hypervisor。这套东西从 macOS 11 就有了，但直到 macOS 26 "Tahoe" 才补齐了 container 项目所需的所有特性（尤其是网络这一块）。

**vminitd**：苹果用 Swift 写的极简 init 系统，跑在每台微型虚拟机里取代 systemd。它不包含任何标准 core utilities、动态库，甚至连 libc 都没有——用的是 musl 静态链接。攻击面被压到了极致。

**优化过的 Linux 内核**：基于 Kata Containers 项目的内核，做了精简和启动优化，可以做到**亚秒级冷启动**——苹果在 WWDC 现场演示时，从敲命令到拿到容器内的 shell，只用了"几百毫秒"。

**OCI 兼容**：这是最关键的一点。container 完全遵循 OCI（Open Container Initiative）镜像规范。也就是说，**你在 Docker Hub 上 pull 的任何镜像，在苹果的 container 里都能直接用**，你 build 出来的镜像也能推回 Docker Hub，在任何 OCI 兼容的运行时里跑。

整套技术栈用 Swift 写成，深度绑定 Apple Silicon——这也是它的硬性门槛：**只能在 Apple Silicon 的 Mac 上用，Intel Mac 不支持**；并且推荐 macOS 26 Tahoe，旧版 macOS 15 Sequoia 虽然能跑但功能受限（尤其是容器间网络隔离）。

## 它和 Docker 到底是什么关系

这是被问得最多的问题，也是最容易被自媒体标题党带偏的问题。"苹果要干掉 Docker"这种说法，在技术上其实并不准确。

要厘清这个关系，得把 Docker 拆开来看。日常我们说的"Docker"，其实是三件事被打包到了一起：

1. **OCI 镜像规范**——容器镜像长什么样、怎么打包，这是个开放标准，Docker 推动制定，但已经不属于 Docker 公司；
2. **容器运行时**——把镜像跑起来的那个东西，Docker 用的是 containerd + runc，Podman 用 crun，苹果用自己的 Containerization；
3. **Docker Desktop**——Mac/Windows 上那个商业化的 GUI 桌面应用，以及它内置的 Linux 虚拟机、Docker Compose 集成、Kubernetes 单节点集群等等。

苹果的 container 与 Docker 的关系是这样的：

- **在镜像层完全兼容**：OCI 镜像格式两边通用，Docker Hub 照常用，镜像生态零迁移成本；
- **在运行时层是竞争关系**：container 取代了 Docker Engine，自己实现了一套从镜像拉取、解压到容器拉起的完整 runtime；
- **在桌面工具层是替代关系**：它瞄准的就是 Docker Desktop 的市场位置——同样是 Mac 上的容器入门工具，而且是免费且开源的。

CLI 命令的设计也几乎是照着 Docker 抄的——`container run`、`container build`、`container pull`、`container images ls`、`container ps`，几乎所有 Docker 用户都能无缝上手。这种刻意的"形似"，显示苹果非常清楚这个项目的真实目标：**降低 Docker 用户切换过来的心理摩擦**。

但要说"取代 Docker"，目前还远远谈不上。

## 那些它现在还做不到的事情

截至 1.0.0 版本，container 距离 Docker Desktop 的功能完备度，还隔着一段不算短的距离。最关键的几个短板：

**没有原生的 Docker Compose**。这是社区抱怨最多的一点。大多数实际项目都用 `docker-compose.yml` 编排多个服务（Web + 数据库 + 缓存），迁到 container 上就抓瞎。社区里冒出了 `Container-Compose` 这样的第三方项目试图填这个坑，但都还不成熟、不官方。

**Kubernetes 集成缺位**。Docker Desktop 内置了单节点 Kubernetes，点一下就能本地起一套 k8s 玩，container 目前没有对等能力。

**Dev Containers 支持不完整**。VS Code / Cursor 用户依赖的 devcontainer 工作流，在 container 上还无法顺畅运行。

**多容器网络在旧 macOS 上受限**。在 macOS 15 上，容器之间无法通过同一个 vmnet 接口直接通信，这是 Virtualization.framework 在旧系统上的能力边界——必须升到 macOS 26 才能享受完整网络栈。

**性能上互有胜负**。RepoFlow 在 2025 年底做的横向 benchmark 显示：CPU 和内存方面，container 已经做得相当不错；但在容器**启动延迟**上，Docker Desktop 依旧领先；而**文件系统 I/O 和小文件操作**，OrbStack 仍然是天花板。

**x86 镜像兼容性有保留**。container 可以借助 Rosetta 2 跑 x86_64 的 Linux 镜像，这是个加分项；但它不是"零成本透明翻译"，在虚拟化层有自己的限制，不要拿它跟原生 app 的 Rosetta 体验直接类比。

**对 Apple Silicon 和新 macOS 的强绑定**。Intel Mac 用户、还在用 macOS 14 之前版本的用户，与这个项目无缘。这一刀切得非常苹果。

## 横向比一比：OrbStack、Docker Desktop、Podman

如果你现在在 Mac 上做容器开发，大概在这几个工具之间选：

**Docker Desktop** 仍然是功能最全、生态最熟、文档最厚的那个。Compose、Kubernetes、镜像扫描、构建缓存、GUI 管理，一站式备齐。代价是资源消耗显著（空载状态 RAM 占用常年 3–4GB 起步），并且对超过 250 人或年营收超过 1000 万美元的商业用户已经收费——这一条让不少团队开始认真考虑替代方案。

**OrbStack** 是这两年 Mac 用户口碑最好的 Docker Desktop 替代品。它由 Danny Lin 一人主导开发，同样基于 Virtualization.framework，但在文件系统（自研 VirtioFS 优化）、动态内存管理（空闲时自动释放）、x86 模拟（用 Rosetta 而不是 QEMU）上下了重本。第三方 benchmark 普遍显示它在文件 I/O、内存效率、能耗上明显胜过 Docker Desktop——但它是闭源商业软件，而且只有 Mac 版。

**Podman** 来自 Red Hat 阵营，无守护进程（daemonless）架构、原生支持 rootless 容器，是 Linux 服务器侧很受欢迎的选择。在 Mac 上通过 Podman Desktop 也能用，但体验上不如 OrbStack 顺滑。

**苹果的 container** 在这个矩阵里的定位很清晰：**它是一个由操作系统厂商背书的、原生集成、完全开源、专为 Apple Silicon 优化的容器方案**，在隔离性和理论安全上做到了上述方案都不曾达到的高度（每容器独立内核），但在生态完备度上是其中最稚嫩的。

## 苹果为什么要做这件事

苹果不是一家轻易"造轮子"的公司，WWDC 上专门开一场讲容器，说明这件事在它的战略里份量不轻。可以看到几层动因：

**第一层是开发者关系**。Mac 在专业开发者群体里的份额一直很高，但 Mac 跑 Linux 容器的体验，长期以来都是一个公开的痛点——风扇狂转、电池速降、内存吃紧。这个痛点的存在，客观上削弱了 Mac 作为后端开发主力机的吸引力。苹果亲自下场把这件事做好，是在保护自己最核心的高端用户群。

**第二层是安全模型**。每容器独立内核的设计，与苹果在 iOS、macOS 上长年坚持的"沙箱化、最小权限"哲学一脉相承。这种隔离强度对企业级用户、对那些用 AI agent 自动执行不可信代码的场景（MCP、Claude Code 之类），会非常有吸引力。

**第三层是基础设施话语权**。容器是云原生时代的基本单位，把这一层抓在自己手里，意味着未来 macOS 上跑 AI 工作负载、跑开发环境、跑各种本地服务的入口，都由苹果自己定义，而不是被 Docker、OrbStack 这些第三方拿捏。

## 该不该现在就切过去

我的判断：**很值得装一个试试，但暂时还别拿来跑生产或团队主力工作流。**

适合现在就用 container 的场景：

- 你只是想在 Mac 上偶尔起一两个轻量容器跑个 Redis、Postgres、Nginx 试一试；
- 你对 Docker Desktop 的资源占用深恶痛绝，又因为某些原因不想用 OrbStack；
- 你的工作流本来就是单容器为主，不依赖 Compose 编排；
- 你愿意为更强的隔离性付出一点功能完备度；
- 你想给开源项目贡献代码，或者只是单纯地想知道苹果是怎么用 Swift 写底层系统软件的。

暂时还不建议切换的场景：

- 团队工作流强依赖 docker compose；
- 你的项目要求 devcontainer + VS Code 闭环；
- 你需要在本地起 Kubernetes 测试 manifest；
- 你还在用 Intel Mac 或 macOS 15。

## 一年之后再看

从 2025 年 6 月的 0.1.0 到 2026 年 6 月的 1.0.0，苹果用一年时间完成了从"概念演示"到"稳定 API"的跃迁。BuildKit 已经支持了，镜像构建、push/pull、基本网络都已就位，社区也长出了 Container-Compose 等生态项目。

但 1.0 不是终点。Docker Desktop 用了十年才长成今天的样子，container 还有 docker compose 兼容、Kubernetes 集成、VS Code devcontainer 支持、GUI 管理等很多硬骨头要啃。它真正成为"Mac 上的默认容器工具"的那天——如果会到来的话——大概率不是靠功能堆得比 Docker 多，而是靠它跟 macOS 越来越深的耦合：开机即用、零配置、跟 Spotlight / 系统设置 / 钥匙串无缝集成的体验。

那才是属于操作系统厂商的杀手锏。

对 Docker 而言，这件事的真正威胁也不在"功能竞争"上——Docker 公司的护城河是 Docker Hub、是 BuildKit、是企业级的供应链安全产品，这些苹果短期内动不了。但 Docker Desktop 作为 Mac 用户接触 Docker 生态的**第一入口**这个位置，正在被慢慢侵蚀：OrbStack 抢走了一批追求性能的用户，苹果 container 又会抢走一批追求"原生"和"开源"的用户。

至于普通开发者，你只需要记住一句话：**镜像还是那个镜像，Docker Hub 还是那个 Docker Hub，工具可以慢慢挑。**

容器世界的好处就在这里——感谢 OCI 标准的存在，运行时之争永远不会变成生态绑架战。
