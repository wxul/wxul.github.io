---
title: just-bash：用 TypeScript 为 AI Agent 重写 Bash
date: 2026-04-09
badge: AI
tags: ["AI", "Agent", "Vibe Coding"]
draft: false
---

**just-bash 是 Vercel Labs 开源的一款纯 TypeScript 实现的沙箱化 Bash 解释器**，它通过内存虚拟文件系统为 AI Agent 提供安全的 shell 执行环境。项目由 Vercel CTO Malte Ubl 于 2025 年 12 月 27 日发布，据其本人披露"几乎完全由 Claude Opus 4.5 编写"——package.json 的 author 字段直接标注为 **"Malte and Claude"**。截至 2026 年 4 月，项目已获得 **2,600+ GitHub 星标**、npm 周下载量约 **47,500 次**，版本迭代至 **v2.14.0**，成为 AI Agent 工具链中一个独特且快速增长的基础设施组件。

该项目的核心理念可以概括为一句话：**"Bash is all you need"**。Vercel 团队认为，大语言模型在训练过程中已经大量接触 Unix 工作流，因此文件系统加 Bash 是 AI Agent 与数据交互的最自然抽象。just-bash 的设计目标是提供一个零基础设施成本、亚毫秒级启动、可在浏览器中运行的 Bash 环境，同时兼顾安全性——让 Agent 能使用 `grep`、`sed`、`awk`、`jq` 等工具处理数据，却无法逃逸沙箱或破坏宿主系统。

---

## 纯 TypeScript 实现的递归下降解释器

just-bash 的技术架构遵循经典的编译器流水线设计。整条执行链路为 **输入脚本 → 词法分析（Lexer）→ 语法分析（Parser）→ AST → 解释器（Interpreter）→ 执行结果**，全程纯 TypeScript 实现，核心模块不依赖任何 WASM。

**词法分析器**（`lexer.ts`）负责将原始 Bash 脚本文本转换为 token 流，包含 Bash 特有的 heredoc、引号嵌套和扩展语法的处理。**语法分析器**采用递归下降架构，由三个专用子解析器协同工作：主解析器（`parser.ts`）负责协调整体流程，`expansion-parser.ts` 处理参数扩展和命令替换（如 `${VAR:-default}`、`$(command)`），`compound-parser.ts` 解析 if/for/while/case/function 等复合命令结构。解析结果输出为类型化的 AST 节点。

**解释器**采用访问者模式遍历 AST 并执行。一个关键的安全设计是：**每次 `exec()` 调用都会创建全新的 Interpreter 实例**，环境变量、函数定义和工作目录在调用间完全隔离，只有文件系统状态跨调用共享。算术运算限制为 **32 位有符号整数**，不支持作业控制（没有 `&`、`bg`、`fg`），所有命令通过解析而非 eval 执行，从根本上杜绝了 shell 注入攻击。

在源码组织上，70+ 个内置命令按类别分布在 `src/commands/` 目录下，每个命令导出一个带有 `execute()` 方法的 `Command` 对象。命令注册表采用**惰性加载**机制——命令仅在首次调用时动态导入，配合 esbuild 的代码分割实现按需加载，有效控制初始包体积。构建系统从单一 TypeScript 代码库产出五个目标：Node.js ESM/CJS 库、浏览器库、CLI 二进制文件和交互式 Shell。

---

## 四层文件系统与纵深安全模型

just-bash 提供四种可插拔的文件系统实现，从完全隔离到直接读写形成安全梯度：

- **InMemoryFs**（默认）：纯内存文件系统，零磁盘访问，支持浏览器。文件值可以是懒加载函数（同步或异步），首次读取时执行并缓存。默认目录结构模拟 Unix 布局：`/home/user`（HOME）、`/bin`、`/usr/bin`、`/tmp`。
- **OverlayFs**：写时复制层，读操作穿透到真实磁盘，写操作保留在内存中并在执行后丢弃。CLI 默认使用此模式。仅限 Node.js。
- **ReadWriteFs**：直接读写真实目录，适用于需要 Agent 修改磁盘的场景。官方强调安全警告——可写根目录必须与受信代码分离。仅限 Node.js。
- **MountableFs**：组合式文件系统，可在不同路径挂载多个文件系统，支持跨挂载点操作（如 `cp /mnt/knowledge/doc.txt ./`）。
    

安全防护通过**可配置的执行限制**实现。默认配置包括：函数递归深度上限 **100 层**、总命令执行数上限 **10,000 条**、单循环迭代上限 **10,000 次**、字符串长度上限 **10MB**、数组元素上限 **100,000**、glob 操作上限 **100,000 次**。awk、sed、jq 各有独立的迭代限制。超限命令以退出码 **126** 终止。网络访问默认完全关闭，启用时支持 URL 前缀白名单、HTTP 方法限制、重定向保护和 header 注入变换——在 fetch 边界注入凭证而不暴露给沙箱内部。

代码层面使用 **null-prototype 对象**和安全的键检查来防御原型链污染攻击。Python 和 JavaScript 运行时默认关闭，作为额外安全面需显式启用。

---

## 70+ 内置命令覆盖主流 Unix 工具链

just-bash 实现了一套覆盖面广泛的内置命令集，无需真实二进制文件即可完成大多数文本处理和数据分析任务：

**文件操作**（14 个）：`cat`、`cp`、`ln`、`ls`、`mkdir`、`mv`、`rm`、`rmdir`、`touch`、`stat`、`tree`、`file`、`readlink`、`split`。**文本处理**（32 个）：`grep`（含 `egrep`/`fgrep`）、`sed`、`awk`、`sort`、`cut`、`tr`、`wc`、`head`、`tail`、`uniq`、`diff`、`xargs`、`column`、`fold`、`nl` 等。**数据格式处理**是一大亮点——`jq` 处理 JSON，`yq` 支持 YAML/XML/TOML/CSV/INI 及跨格式转换，`xan` 处理 CSV，`sqlite3` 提供 SQL 查询能力（基于 sql.js/WASM，运行在 worker 线程中）。

可选运行时方面，`js-exec` 通过 QuickJS WASM 沙箱执行 JavaScript/TypeScript（64MB 内存限制、10 秒超时），支持 ES 模块和 Node.js 兼容层（fs、path、process 等）。`python3` 通过 CPython 编译为 WASM 提供 Python 执行能力。两者均需在构造 Bash 实例时通过 `javascript: true` 或 `python: true` 显式启用。

Shell 语法支持方面覆盖全面：管道（`|`）、重定向（`>`、`>>`、`2>`、`<`）、命令链（`&&`、`||`、`;`）、变量扩展（`$VAR`、`${VAR:-default}`）、位置参数、glob 模式、if/elif/else、for/while/until 循环、函数定义、local 变量、算术运算（`$(())`）、条件测试（`[[ ]]`）。用户还可以通过 `defineCommand()` API 自定义 TypeScript 命令，自动与管道和重定向等 shell 特性集成。

---

## 从 CLI 到 AI SDK 的多层使用接口

just-bash 提供三层使用接口，覆盖从命令行到编程集成的不同场景。

**CLI 模式**通过 `npm install -g just-bash` 全局安装后使用。`just-bash -c 'ls -la && cat package.json | head -5'` 执行内联脚本，`--root` 指定项目根目录，`--json` 输出结构化 JSON（`{"stdout":"...","stderr":"...","exitCode":0}`），`-e` 启用 errexit 模式。CLI 默认使用 OverlayFs，项目根目录挂载到 `/home/user/project`。

**编程 API** 通过 `import { Bash } from "just-bash"` 引入。核心是 `Bash` 类的 `exec()` 方法，接受 `env`、`cwd`、`stdin`、`args`、`signal`（AbortSignal 协作取消）等选项。典型用法：

```typescript
const bash = new Bash({
  files: { "/data/input.txt": "content" },
  cwd: "/data",
  executionLimits: { maxCommandCount: 5000 }
});
const result = await bash.exec("cat input.txt | grep pattern");
```

**AI SDK 集成**通过独立的 `bash-tool` 包实现。`createBashTool()` 封装 just-bash 为 AI SDK 工具，自动提供 `bash`（执行命令）、`readFile`、`writeFile` 三个工具。配合 AI SDK v6 的 `ToolLoopAgent` 可直接构建自主 Agent。当未提供 sandbox 参数时自动创建 just-bash 实例；在生产环境中可零代码更改替换为 `@vercel/sandbox` 获得完整 VM 隔离。此外，`Sandbox` 类提供了与 `@vercel/sandbox` **完全相同的 API 接口**（`create()`、`writeFiles()`、`runCommand()`、`readFile()`），作为开发/测试阶段的直接替代品。

Transform Pipeline API 允许在执行前对 Bash 脚本进行 AST 级别的变换。`BashTransformPipeline` 搭配 `TeePlugin`（捕获输出到文件）和 `CommandCollectorPlugin`（收集执行的命令名）等插件实现脚本检测与审计。

---

## Agent 文件系统交互与安全代码分析是核心场景

just-bash 的应用场景紧密围绕 AI Agent 的工作流需求。**最核心的场景是文件系统上下文检索**——Vercel 团队提出的 "filesystems and bash" 哲学认为，将数据组织为文件并给 Agent 提供 Bash 工具，优于传统 RAG 和向量搜索方案，因为 LLM 天然理解 Unix 管道操作。

**代码库分析**是另一个高频场景：Agent 可以通过 `grep -r "TODO" src/`、`find . -name "*.ts" | wc -l`、`jq '.dependencies' package.json` 等命令自主探索项目结构。Braintrust 与 Vercel 的联合评测显示，**纯 Bash Agent 在结构化数据查询上准确率仅 53%，但 Bash + SQLite 混合方案表现最佳**，超越了纯 SQL 方案的自验证能力。

已知的实际采用者包括 **Mintlify**（文档平台，使用 just-bash 配合自定义文件系统驱动其 AI 助手）和 **Turso/AgentFS**（将 just-bash 与 SQLite 数据库集成，在 AgentFS 0.4.1 中发布）。浏览器端应用也是独特优势——justbash.dev 官网本身就运行着基于 xterm.js 的浏览器内终端演示，展示了 just-bash 在前端应用中作为嵌入式 shell 的可能性。

---

## 在 AI 沙箱生态中占据独特的轻量级定位

just-bash 在 AI Agent 沙箱工具的版图中占据了一个独特的轻量级定位。与同赛道的方案对比如下：

| 方案  | 隔离级别 | 启动速度 | 能力边界 | 成本  |
| --- | --- | --- | --- | --- |
| **just-bash** | 进程内（虚拟 FS） | 亚毫秒 | 70+ 内置命令，无真实二进制 | 免费  |
| **@vercel/sandbox** | Firecracker MicroVM | 秒级  | 完整 Linux，任意二进制 | Vercel 计费 |
| **E2B** | Firecracker MicroVM | ~200ms | 完整沙箱 | $0.05/hr/vCPU |
| **WebContainers (StackBlitz)** | 浏览器 WASM | 即时  | 完整 Node.js，仅限浏览器 | 商业授权 |
| **Docker 容器** | 容器隔离 | 秒级  | 完整 OS，共享内核 | 基础设施成本 |
| **Daytona** | Docker 容器 | ~90ms | 有状态，可暂停/恢复 | 按用量计费 |

just-bash 的核心差异化在于：它是**唯一一个完全用 TypeScript 重新实现 Bash 的方案**——不是包装器，不是容器，不是 VM。这带来了三个独有优势：零基础设施成本、浏览器兼容性、以及与 `@vercel/sandbox` 的 API 级兼容形成无缝升级路径。劣势同样明显：无法执行真实二进制文件、能力受限于已实现的命令子集、没有真正的 VM 隔离。

值得一提的是，Cloudflare 曾将 just-bash 分叉并发布为 `@cloudflare/shell`，但此举引发争议。Malte Ubl 公开批评 Cloudflare 在分叉中**移除了 beta 声明、安全文档和原型链污染防护**，并将安全的 Python 实现替换为允许访问 JS 宿主环境的 pyodide。这一事件一方面验证了 just-bash 技术方案的吸引力，另一方面也凸显了其安全模型仍在快速演进中。

## 结论

just-bash 代表了一种值得关注的新范式：**在进程内用纯 TypeScript 重建 Unix shell 语义**，而非依赖容器或 VM 提供隔离。这一设计选择在 AI Agent 场景下展现出独特价值——亚毫秒启动、零运维成本、浏览器可运行——同时也携带明确的权衡：安全依赖代码层面的防御而非硬件隔离，能力边界受限于 TypeScript 重新实现的命令子集。Vercel 通过 `just-bash → bash-tool → @vercel/sandbox` 的产品梯度策略巧妙地将这些权衡转化为一条从开发到生产的渐进式升级路径。项目仍处于 beta 阶段且迭代极快（3.5 个月内 314 次提交），其"Malte and Claude"的署名方式本身也成为 AI 辅助开发的一个标志性案例。
