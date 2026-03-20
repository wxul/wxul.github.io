---
title: 只知道小龙虾 OpenClaw？其实还有这些迷你龙虾
date: 2026-03-12
badge: AI
tags: ["AI", "Agent", "OpenClaw"]
draft: false
---

# 只知道小龙虾 OpenClaw？其实还有这些迷你龙虾

> OpenClaw 火遍全球，28 万 GitHub Star，但它庞大的代码量和安全隐患也让不少开发者望而却步。于是，一批"迷你龙虾"悄然诞生——它们各有绝活，有的把整个 AI Agent 塞进 5 美元的单片机，有的把代码量压缩到 4000 行以内，有的编译出来只有 678 KB。本文以开发者视角，深度拆解三个不同定位的 Claw 替代项目。

---

## 背景：OpenClaw 的崛起与裂缝

OpenClaw 是 2026 年初最火的开源项目之一，没有之一。由前 PSPDFKit 创始人 Peter Steinberger 发起，短短数月从一个 WhatsApp 中转脚本成长为拥有 **~28 万 Star、900+ 贡献者、3.3 万 Fork** 的现象级项目，甚至惊动了深圳市龙岗区出台专项扶持政策，最高补贴 200 万元。

但盛名之下，裂缝也越来越明显：

- **代码臃肿**：43 万行代码、53 个配置文件、70+ 个依赖，安全审计几乎无从下手
- **安全事故频发**：ClawHavoc 供应链攻击污染了 341 个恶意 Skill，波及 9000+ 安装实例；CVE CVSS 8.8 级别的 WebSocket 劫持漏洞曾被公开披露；Palo Alto Networks 直接称其为"安全噩梦"
- **隔离层次太浅**：所有 Agent 共享同一个 Node.js 进程，安全边界依靠应用层 allowlist，而非 OS 级隔离
- **硬件门槛高**：最低也要一台 Mac Mini 或 VPS，功耗、成本都不低

正是这些裂缝，催生了三个截然不同的替代方向。

---

## 一、NanoClaw：用容器隔离重新定义安全边界

### 项目定位

**GitHub**：`qwibitai/nanoclaw`｜**Stars**：~2.1 万｜**语言**：TypeScript｜**协议**：MIT

NanoClaw 由以色列开发者 Gavriel Cohen（前 Wix 全栈工程师）创建，核心主张只有一句话：

> **"OS 级容器隔离，比应用层 allowlist 可靠一个数量级。"**

整个项目约 **3900 行 TypeScript，分布在 15 个文件**，只有 9 个生产依赖。Andrej Karpathy 在 Twitter 上专门点评：*"NanoClaw 的核心引擎约 4000 行代码，能放进我的脑子，也能放进 AI Agent 的上下文，感觉是可管理、可审计、可定制的。"*

### 核心架构：三区安全模型

NanoClaw 的安全架构分三层：

```
┌──────────────────────────────────────────┐
│  不可信区域（UNTRUSTED ZONE）             │
│  WhatsApp / Telegram 消息（可能含恶意指令）│
└────────────────────┬─────────────────────┘
                     ↓ 触发词检查 + 输入转义
┌──────────────────────────────────────────┐
│  宿主进程（HOST PROCESS，受信任）         │
│  • 消息路由  • IPC 授权                   │
│  • 挂载点校验  • 容器生命周期管理          │
│  • 凭证过滤（禁止泄露 API Key）           │
└────────────────────┬─────────────────────┘
                     ↓ 仅挂载明确声明的目录
┌──────────────────────────────────────────┐
│  容器（CONTAINER，完全隔离）              │
│  • Agent 执行  • Bash 命令                │
│  • 文件操作（限于挂载目录）               │
│  • 网络访问（不受限）                     │
└──────────────────────────────────────────┘
```

**关键安全细节：**

- 每个 WhatsApp / Telegram 群组拥有**独立容器**，独立文件系统、独立 IPC 命名空间
- 项目根目录以**只读方式**挂载进容器，Agent 无法修改宿主代码
- 以下路径**永远不会**被挂载进容器：`.ssh`、`.gnupg`、`.aws`、`.azure`、`.kube`、`id_rsa`、`private_key`、`.env`、`.npmrc` 等
- 挂载权限存储在 `~/.config/nanoclaw/mount-allowlist.json`，该文件本身永不进入容器（防止自改攻击）
- Agent 以**非 root 用户**运行

**容器后端支持两种：**

| 后端 | 适用平台 | 隔离强度 |
|------|---------|---------|
| Apple Container | macOS（Apple Silicon）| 独立内核的轻量 VM，原生级隔离 |
| Docker | macOS + Linux | 成熟生态，跨平台 |

### Claude Code 作为底层引擎

NanoClaw **仅支持 Anthropic Claude**，并且将 Claude Code（CLI）内置在每个容器中作为执行引擎。这不是一个设计缺陷，而是刻意为之的取舍：

> 与其兼容十几个模型，不如把一个模型的能力用到极致。

Claude Code 赋予 Agent 能力包括：Shell 命令执行、文件读写、网页浏览（Chromium）、Web 搜索，以及最重要的——**Agent Swarms（多 Agent 协同）**。

### 用 Claude Code 安装和配置项目

这是 NanoClaw 最有趣的设计：**整个项目的安装、配置、扩展，全部通过 Claude Code 完成，零配置文件**。

```bash
# 第一步：Fork 并克隆
gh repo fork qwibitai/nanoclaw --clone
cd nanoclaw

# 第二步：启动 Claude Code CLI
claude

# 第三步：在 Claude Code 中执行 /setup 命令
# Claude 会自动完成：
#   - npm install
#   - 构建容器镜像（./container/build.sh）
#   - 引导配置 API Key
#   - 扫描 QR Code 接入 WhatsApp
#   - 注册系统服务（macOS launchd / Linux systemd）
```

`/setup` 本质上是一个存放在 `.claude/skills/setup/SKILL.md` 的 Markdown 指令文件，Claude Code 读取后按步骤执行。用自然语言描述需求，Claude Code 直接改源码——**没有配置文件，配置即代码**。

**常用 Skill 命令：**

```bash
/add-whatsapp        # 接入 WhatsApp（Baileys 库）
/add-telegram        # 接入 Telegram Bot
/add-discord         # 接入 Discord 服务器
/add-slack           # 接入 Slack 工作区
/add-gmail           # 接入 Gmail（Composio OAuth）
/convert-to-docker   # 切换到 Docker 后端
/convert-to-apple-container  # 切换到 Apple Container
/debug               # 诊断当前运行状态
/customize           # 自然语言描述需求，Claude 帮你改代码
```

### 开发运行命令

```bash
npm run dev      # 热重载开发模式
npm run build    # 编译 TypeScript
npm run start    # node dist/index.js（生产启动）
npm run test     # vitest 跑单元测试
npm run typecheck  # tsc --noEmit 类型检查
npm run format   # prettier 格式化

# 容器管理
./container/build.sh       # 重建 Agent 容器镜像

# 服务管理（macOS）
launchctl load ~/Library/LaunchAgents/com.nanoclaw.plist
launchctl unload ~/Library/LaunchAgents/com.nanoclaw.plist

# 服务管理（Linux）
systemctl --user start nanoclaw
systemctl --user enable nanoclaw
```

### 三层记忆系统

| 层级 | 存储介质 | 更新频率 | 说明 |
|------|---------|---------|------|
| 内存层 | Node.js 内存 | 每 2 秒同步 | lastTimestamp、会话游标 |
| SQLite 层 | better-sqlite3 | 事务写入 | router_state、registered_groups、sessions |
| 文件系统层 | Markdown 文件 | 按需写入 | CLAUDE.md（每群组记忆）、对话归档 |

SQLite 的引入保证了崩溃恢复能力——重启后通过游标机制从断点继续处理消息。

### Agent Swarms：个人 AI 助手中的首创

NanoClaw 是首个支持 **Agent Swarms（Agent 群体协作）** 的个人助手项目。基于 Claude Code 的 agent-teams 能力，一个任务可以拆分给多个专属 Sub-Agent 并行处理，每个 Sub-Agent 在独立上下文中运行。

例如：用户问"帮我分析最近三个月的竞争对手动态"，主 Agent 可以 spawn 出搜索 Agent、摘要 Agent、报告撰写 Agent，三者并行工作后汇总结果。

### 贡献模型：Skill 而非 PR

NanoClaw 的 Contributor 不提交代码 PR，而是提交 **Skill Markdown 文件**。Skill 是教 Claude Code 如何改造某个 NanoClaw 安装的说明文档。用户的 Fork 只包含他们真正需要的功能，不引入无关代码。

> "只接受安全修复、Bug 修复和明确的改进到基础配置。其他一切应作为 Skill 贡献。"—— README

### 优缺点分析

**✅ 优势**
- 代码量极小，可在一个下午完成全部安全审计
- OS 级容器隔离，彻底解决 OpenClaw 的共享进程安全问题
- 零配置文件，Claude Code 驱动的自然语言配置体验
- Agent Swarms 支持多 Agent 并行协作
- 9 个生产依赖，依赖链极短

**❌ 劣势**
- 仅支持 Claude（无多模型选择，Anthropic API 费用自担）
- WhatsApp 使用 Baileys（非官方协议库），Meta 随时可能封号
- 尚无正式 Release Tag，属于滚动开发
- 网络访问在容器内不受限（出站流量无沙箱）

### 落地预测与前景

NanoClaw 最适合的落地场景是**企业内部 AI 助手**。设想一个 20-50 人的技术团队：每个成员或部门拥有一个独立容器中的 AI Agent，读取各自的代码仓库、Slack 频道、文档库，互不干扰，数据不出沙箱。Claude Code 的 Agent 能力意味着它可以直接操作代码库，这是目前大多数个人助手做不到的。

未来预测：随着 Anthropic Agent SDK 持续迭代，NanoClaw 很可能成为**企业级 Claude Code Agent 部署框架**的事实标准——尤其是在对安全合规有要求的金融、医疗、法律行业。Apple Container 的轻量 VM 隔离特性，也让它在 macOS 重度用户群体（大量开发者、设计师）中有独特竞争力。

---

## 二、MimiClaw：把 AI Agent 装进 5 美元的单片机

### 项目定位

**GitHub**：`memovai/mimiclaw`｜**Stars**：~1.7 万｜**语言**：C（99.2%）+ CMake｜**协议**：MIT

MimiClaw 的口号简单粗暴：

> **"No OS. No Node.js. No Mac mini. No Raspberry Pi. No VPS. 5 美元的芯片，跑完整的 AI Agent。"**

这不是噱头。MimiClaw 在 ESP32-S3 单片机上运行 FreeRTOS，实现完整的 ReAct（Reasoning and Acting）循环，接入 Claude 或 GPT API，通过 Telegram 与用户交互，具备持久记忆、定时任务、自主心跳检测，**整个系统功耗仅 0.5W**。

### 硬件规格：为什么选 ESP32-S3

**必须满足：16MB Flash + 8MB PSRAM**

| 规格项 | 参数 |
|-------|-----|
| CPU | 双核 Xtensa LX7，240 MHz/核 |
| PSRAM | 8 MB（关键！用于 LLM 流式缓冲区）|
| Flash | 16 MB（SPIFFS 分区 12 MB）|
| WiFi | 802.11 b/g/n 内置 |
| 功耗 | 约 0.5W（USB 供电）|
| 价格 | $5–$15 |

**推荐开发板：**
- Xiaozhi AI Board（~$10，中文社区首推）
- LILYGO T7-S3
- FireBeetle 2 ESP32-S3
- ESP32-S3-DevKitC-1-N16R8
- Seeed Studio XIAO ESP32S3 Plus

> ⚠️ 注意：大多数 ESP32-S3 开发板有两个 USB-C 口，烧录时必须用标注 "USB"（原生 USB Serial/JTAG）的那个，不能用 "COM"（外部 UART 桥接）。

**为什么 8MB PSRAM 是关键？**

LLM API 的流式响应、上下文构建（最大 16KB 系统提示）、TLS 握手缓冲区都需要大块连续内存。8MB PSRAM 通过 `MBEDTLS_EXTERNAL_MEM_ALLOC=y` 承载 MbedTLS 的全部堆分配，内部 SRAM 仅保留 96KB 给系统使用。

### 双核 FreeRTOS 架构

MimiClaw 将工作严格拆分到两个核心，防止网络 I/O 卡顿影响 AI 推理：

```
Core 0（I/O 核）                    Core 1（AI 核）
─────────────────────────────       ──────────────────────────────
tg_poll_task                        agent_loop_task
  └─ Telegram HTTPS 长轮询           └─ ReAct 循环（最多 10 次迭代）
outbound_dispatch_task                  ├─ 加载会话历史（SPIFFS JSONL）
  └─ 发送响应消息                       ├─ 构建系统提示（SOUL.md + USER.md + MEMORY.md）
ws_server（端口 18789，最多 4 客户端）  ├─ 构建 cJSON 消息数组
serial_cli                              ├─ HTTPS 调用 Claude/OpenAI API
                                        ├─ 解析 tool_use 块 → 执行工具
                                        └─ 写回会话文件（Ring Buffer 20 条）
```

两个核通过两个 FreeRTOS 队列通信：

```c
// 核心消息结构
typedef struct {
    char  channel[16];    // "telegram" / "websocket" / "cli"
    char  chat_id[32];    // Telegram 聊天 ID 或 WebSocket 客户端 ID
    char *content;        // 堆分配文本（所有权随 Push 转移，接收方负责 free()）
} mimi_msg_t;

// 两个队列
QueueHandle_t g_inbound_queue;   // I/O → AI
QueueHandle_t g_outbound_queue;  // AI → I/O
```

### ReAct 循环实现（纯 C）

MimiClaw 实现了完整的 ReAct 模式，最多 **10 次迭代**：

```c
// 伪代码展示 agent_loop 核心逻辑
void agent_loop_task(void *arg) {
    mimi_msg_t msg;
    while (1) {
        xQueueReceive(g_inbound_queue, &msg, portMAX_DELAY);

        // 1. 加载会话历史（SPIFFS JSONL，Ring Buffer 最多 20 条）
        session_load(msg.chat_id, &history);

        // 2. 构建系统提示（从 SPIFFS 文件组装）
        //    SOUL.md + USER.md + MEMORY.md + 当日日记 + 工具描述
        build_system_prompt(ctx_buf, sizeof(ctx_buf));

        // 3. ReAct 循环（最多 10 次）
        for (int iter = 0; iter < 10; iter++) {
            // 调用 Claude/OpenAI HTTPS API（阻塞，非流式）
            llm_call(messages, tools_schema, &response);

            if (response.stop_reason == STOP_TOOL_USE) {
                // 执行所有 tool_use 块，结果追加到消息数组
                for each tool_call in response.tool_calls:
                    tool_execute(tool_call.name, tool_call.input, &tool_result);
                    messages_append_tool_result(&tool_result);
                continue;  // 下一次迭代
            } else {
                // stop_reason == "end_turn"，得到最终响应
                break;
            }
        }

        // 4. 保存会话，推送响应到出站队列
        session_save(msg.chat_id, &messages);
        xQueueSend(g_outbound_queue, &response_msg, portMAX_DELAY);
        free(msg.content);
    }
}
```

### 工具系统

| 工具名 | 功能 | 实现文件 |
|-------|-----|---------|
| `web_search` | 通过 Brave Search 或 Tavily API 搜索 | `tools/tool_web_search.c` |
| `get_current_time` | 调用 worldtimeapi.org，同步系统时钟 | 内置 |
| `read_file` | 读取 SPIFFS 文件（路径须以 `/spiffs/` 开头）| `tools/` |
| `write_file` | 写入 SPIFFS 文件 | `tools/` |
| `edit_file` | 编辑 SPIFFS 文件 | `tools/` |
| `list_dir` | 列出目录内容 | `tools/` |
| `cron_add` | 添加定时任务（重复 / 单次）| cron 系统 |

工具注册系统（`tools/tool_registry.c`）负责注册管理、自动生成 Claude/OpenAI 格式的 JSON Schema，以及按名称分发工具调用。

### SPIFFS 文件系统：记忆的物理形态

所有数据以纯文本存储在 12MB SPIFFS 分区（挂载点 `/spiffs/`）：

```
/spiffs/
├── config/
│   ├── SOUL.md          ← AI 人格定义（可自定义）
│   └── USER.md          ← 用户信息与偏好
├── memory/
│   ├── MEMORY.md        ← 长期持久记忆
│   └── 2026-02-05.md    ← 当日日记（每天一个文件）
├── sessions/
│   └── tg_12345678.jsonl ← 每个 Telegram 会话的对话历史
├── cron.json            ← 持久化的定时任务配置
└── HEARTBEAT.md         ← 自主任务清单
```

**SOUL.md 默认人格示例：**

```markdown
I am MimiClaw, a personal AI assistant running on an ESP32-S3.
Personality: Helpful and friendly. Concise and to the point.
```

**HEARTBEAT.md 自主心跳机制：** 每 30 分钟检查一次。如果存在未完成的任务条目（非空行、非 `# 标题`、非 `- [x] 已完成` 项），会自动将其注入 Agent 循环，触发自主行动。

### 完整部署流程

**前置条件：** ESP-IDF v5.5+

```bash
# 1. 克隆项目
git clone https://github.com/memovai/mimiclaw.git
cd mimiclaw

# 2. 设置目标芯片
idf.py set-target esp32s3

# 3. 配置密钥（必须步骤）
cp main/mimi_secrets.h.example main/mimi_secrets.h
```

编辑 `mimi_secrets.h`：

```c
#define MIMI_SECRET_WIFI_SSID       "你的WiFi名称"
#define MIMI_SECRET_WIFI_PASS       "你的WiFi密码"
#define MIMI_SECRET_TG_TOKEN        "从 @BotFather 获取的 Bot Token"
#define MIMI_SECRET_API_KEY         "sk-ant-api03-xxxxx"    // Anthropic API Key
#define MIMI_SECRET_MODEL_PROVIDER  "anthropic"             // 或 "openai"
#define MIMI_SECRET_SEARCH_KEY      ""                      // Brave Search API Key
#define MIMI_SECRET_TAVILY_KEY      ""                      // Tavily Key（推荐）
// 国内用户必须配置代理：
#define MIMI_SECRET_PROXY_HOST      "10.0.0.1"              // 局域网代理 IP
#define MIMI_SECRET_PROXY_PORT      "7897"                  // Clash/V2Ray 端口
```

```bash
# 4. 编译并烧录
idf.py fullclean && idf.py build
idf.py -p /dev/ttyUSB0 flash monitor

# 一键脚本（Ubuntu）
./scripts/setup_idf_ubuntu.sh  # 首次安装 ESP-IDF
./scripts/build_ubuntu.sh      # 编译 + 烧录

# 一键脚本（macOS）
./scripts/setup_idf_macos.sh
./scripts/build_macos.sh

# 使用预编译固件（v0.1.0，最快速）
esptool.py --chip esp32s3 -b 460800 write_flash 0x0 mimiclaw-full-v0.1.0.bin
```

**烧录后串口 CLI 运行时配置（无需重新编译）：**

```bash
# 打开串口监视器后输入命令：
mimi> wifi_set MySSID MyPassword       # 修改 WiFi
mimi> set_api_key sk-ant-api03-...     # 更新 API Key
mimi> set_model_provider openai        # 切换到 OpenAI
mimi> set_model gpt-4o                 # 更换模型
mimi> set_proxy 127.0.0.1 7897        # 设置代理（国内必备）
mimi> clear_proxy                      # 清除代理
mimi> memory_read                      # 查看 AI 的长期记忆
mimi> memory_write "用户喜欢简短的回答"  # 手动写入记忆
mimi> session_list                     # 列出所有会话
mimi> session_clear 12345678           # 清除某个会话
mimi> heap_info                        # 查看剩余 RAM
mimi> restart                          # 重启设备
```

所有运行时配置存储在 NVS Flash，断电保留。

### OTA 空中升级

烧录一次 USB 后，后续固件更新完全通过 WiFi 完成。Flash 分区表采用双 OTA 布局：

```
# partitions.csv
nvs,      data, nvs,    0x9000,  0x5000,
otadata,  data, ota,    0xe000,  0x2000,
app0,     app,  ota_0,  0x10000, 0x300000,   ← 主分区（~3MB）
app1,     app,  ota_1,  0x310000,0x300000,   ← OTA 分区（~3MB）
spiffs,   data, spiffs, 0x610000,0xBF0000,   ← 数据分区（12MB）
```

OTA 逻辑在 `ota/ota_manager.c` 中实现，支持从 HTTPS URL 拉取固件。

### 内存优化策略

ESP32-S3 的内存管理是整个项目最精细的部分：

```
内存分层策略：
  内部 SRAM（~512KB）── 任务栈、WiFi 驱动缓冲区
       ↓ SPIRAM_MALLOC_ALWAYSINTERNAL=2048
  外部 PSRAM（8MB） ── LLM 流缓冲区、TLS 握手、上下文构建
       ↓ MBEDTLS_EXTERNAL_MEM_ALLOC=y
  SPIFFS Flash（12MB）── 会话历史、人格文件、记忆文件

WiFi 优化：
  静态 RX 缓冲区：3（从默认 10 降低）
  动态 RX 缓冲区：6
  BA Window：3
```

### 优缺点分析

**✅ 优势**
- 极致低成本：$5–$15 硬件，0.5W 功耗，7×24 不间断
- 数据主权：所有记忆、会话完全本地存储，不经过任何云服务器
- 支持 Anthropic + OpenAI 双后端，可通过 OpenRouter 扩展
- 内置 HTTP 代理支持，国内开发者可直连使用
- MIT 协议，完全可以基于此构建商业产品

**❌ 劣势**
- 仅约 1.7K Star，社区规模较小，踩坑需要自己解决
- Telegram 无鉴权，任何知道 Bot Token 的人都能消耗你的 API 额度
- 不支持媒体消息（图片、语音、文件）
- 构建环境需要 ESP-IDF，上手曲线比 npm install 陡峭
- 受限于芯片算力，无法运行本地模型（必须调用云端 API）

### 落地预测与前景

MimiClaw 打开了一个此前完全没有人探索的方向：**嵌入式 AI Agent**。

**近期可落地场景：**

1. **智能家居控制节点**：挂在路由器旁，通过 Telegram 控制家中设备，记住主人的生活习惯，每天早上主动推送天气和日程提醒
2. **工厂/车间 AI 巡检员**：ESP32-S3 + 传感器，通过 ReAct 循环分析数据并主动上报异常，成本比工业 PLC 低 1–2 个数量级
3. **离网环境 AI 助手**：科考、野外探测等 WiFi 覆盖有限的场景，低功耗长续航的 AI 接入节点

**远期预测：** 随着模型蒸馏技术发展，未来 2–3 年内可能出现能在 ESP32-S3 上**本地运行**小型 LLM（<500MB 量化模型）的方案。届时 MimiClaw 这套架构将真正实现完全离网、零云依赖的 AI Agent。MimiClaw 现在的价值在于提前把架构跑通，等待那个时刻到来。

---

## 三、NullClaw：678 KB 的 Zig 二进制，2ms 启动，50+ 提供商

### 项目定位

**GitHub**：`nullclaw/nullclaw`｜**Stars**：~4.8 万｜**语言**：Zig（100%）｜**协议**：MIT

NullClaw 的口号：**"Null 开销。Null 妥协。随处部署。"**

这是三个替代项目里技术野心最大的一个——用 Zig 语言从零构建，编译产物是 **678 KB 的静态二进制文件**，零运行时依赖，在 Apple Silicon 上启动时间 **<2ms**，峰值内存占用约 **1 MB**，却支持 **50+ AI 提供商**、**19 个通信渠道**、**33 个工具**，以及 5100+ 单元测试。

### 为什么选择 Zig？

Zig 在国内开发者中知名度不高，但 NullClaw 的作者有充分的理由：

| 特性 | NullClaw 的受益 |
|-----|---------------|
| 无垃圾回收，无运行时 | 678 KB 静态二进制，2ms 启动时间 |
| 显式内存管理（无借用检查器） | 比 Rust 更低的学习门槛，同样的内存安全 |
| 原生 C 互操作 | SQLite 作为 vendored C 库直接链接，无复杂绑定 |
| 一行交叉编译 | 同一 codebase 编译 Windows/macOS/Linux/ARM/RISC-V/嵌入式 |
| `comptime`（编译期求值）| 无运行时开销的泛型和元编程 |
| 无隐式分配 | 每次内存分配都是显式的，可审计 |

**构建命令（锁定 Zig 0.15.2）：**

```bash
# build.zig 关键配置（影响最终二进制大小）
if (optimize != .Debug) {
    exe.root_module.strip = true;           // 剥离调试符号
    exe.root_module.unwind_tables = .none;  // 移除展开表
    exe.root_module.omit_frame_pointer = true; // 省略帧指针
}
exe.dead_strip_dylibs = true;  // 删除未使用的动态库

# macOS 额外剥离本地符号
# strip -x nullclaw
```

### 安装与初始化

```bash
# 安装 Zig 0.15.2（Linux x86_64）
curl -L https://ziglang.org/download/0.15.2/zig-linux-x86_64-0.15.2.tar.xz | tar -xJ
sudo mv zig-linux-x86_64-0.15.2 /usr/local/zig
sudo ln -s /usr/local/zig/zig /usr/local/bin/zig

# 克隆并编译（ReleaseSmall = 最小体积）
git clone https://github.com/nullclaw/nullclaw.git
cd nullclaw
zig build -Doptimize=ReleaseSmall
sudo cp zig-out/bin/nullclaw /usr/local/bin/

# 验证
nullclaw --version   # 输出 v2026.3.5（CalVer）

# 交互式初始化向导
nullclaw onboard --interactive
# 或快速初始化
nullclaw onboard --api-key sk-... --provider openrouter
```

### 核心使用方式

```bash
# 单条消息
nullclaw agent -m "帮我查一下明天北京的天气"

# 交互式对话
nullclaw agent

# 启动 HTTP Gateway（默认绑定 127.0.0.1:3000）
nullclaw gateway
nullclaw gateway --port 8080

# 指定模型
nullclaw agent -m "你好" --provider anthropic --model claude-opus-4-5-20251101

# 通道管理
nullclaw channel status
nullclaw channel start telegram
nullclaw channel start discord
nullclaw channel start dingtalk    # 国内常用！

# 一键从 OpenClaw 迁移
nullclaw migrate openclaw --dry-run    # 预览迁移效果
nullclaw migrate openclaw              # 执行迁移

# 系统诊断
nullclaw status
nullclaw doctor

# 注册为系统服务
nullclaw service install
nullclaw service start
nullclaw service status

# 运行全部测试（5100+）
zig build test --summary all

# 查看硬件外设
nullclaw peripherals scan
```

### vtable 驱动架构：真正的可插拔设计

NullClaw 的核心设计模式是 **vtable 接口**——所有子系统都通过接口定义，实现可在配置中热替换，无需修改或重编译代码：

```zig
// 以 Provider（AI 提供商）为例
pub const Provider = struct {
    ptr: *anyopaque,
    vtable: *const VTable,

    pub const VTable = struct {
        complete: *const fn (ptr: *anyopaque, req: Request) Error!Response,
        stream:   *const fn (ptr: *anyopaque, req: Request, cb: StreamCallback) Error!void,
        models:   *const fn (ptr: *anyopaque) Error![]Model,
        deinit:   *const fn (ptr: *anyopaque) void,
    };
};
```

| 子系统 | 接口 | 可用实现数量 |
|-------|-----|------------|
| AI 模型 | `Provider` | 50+ 提供商 |
| 通信渠道 | `Channel` | 19 个 |
| 记忆后端 | `Memory` | 9 种 |
| 工具 | `Tool` | 33 个 |
| 沙箱 | `Sandbox` | Landlock / Firejail / Bubblewrap / Docker |
| 运行时 | `RuntimeAdapter` | Native / Docker / WASM |
| 隧道 | `Tunnel` | Cloudflare / ngrok / Tailscale / 自定义 |
| 外设 | `Peripheral` | Serial / Arduino / RPi GPIO / STM32 |

### 50+ AI 提供商支持

这是 NullClaw 相比其他替代项目最明显的优势。`src/providers/factory.zig` 中注册了：

- **一线国际**：Anthropic、OpenAI、Gemini/Vertex AI、Cohere、Mistral、xAI、DeepSeek
- **推理加速**：Groq、Together、Fireworks、Perplexity
- **路由聚合**：OpenRouter（一个 Key 访问 100+ 模型）
- **企业私有**：Amazon Bedrock、自定义 OpenAI 兼容端点（`custom:https://your-api.com`）
- **本地部署**：Ollama（完全离网运行）

### 19 个通信渠道（国内友好）

```
CLI            - 命令行直接交互
Telegram       - Bot API
Signal         - Signal Private Messenger
Discord        - Gateway
Slack          - Events API
iMessage       - macOS 原生（Apple Script）
Matrix         - 去中心化协议
WhatsApp       - 非官方协议
Email          - IMAP/SMTP
IRC            - 经典协议
Webhook        - 通用 HTTP 回调
Lark/飞书      - ✅ 国内常用
DingTalk/钉钉  - ✅ 国内常用
OneBot         - QQ 协议框架
QQ             - ✅ 国内常用
Line           - 亚太市场
Nostr          - 去中心化社交
MaixCam        - 嵌入式摄像头板
Mattermost     - 开源企业 IM
```

国内用户通过钉钉、飞书、QQ 三个渠道可以零成本接入 NullClaw，这是其他项目都没有的原生支持。

### 混合向量 + 关键词记忆系统

NullClaw 的记忆系统是同类项目中最完善的，完全基于 SQLite（无外部向量数据库依赖）：

```
记忆架构：
┌─────────────────────────────────────────────┐
│                  SQLite DB                   │
├───────────────────┬─────────────────────────┤
│  向量子系统        │  关键词子系统            │
│  ─────────────── │  ──────────────────────  │
│  嵌入向量 BLOB    │  FTS5 全文搜索            │
│  余弦相似度计算    │  BM25 评分               │
│  （进程内计算）    │  精确关键词匹配           │
└───────────────────┴─────────────────────────┘
         ↓ 混合融合（默认 0.7 向量 + 0.3 关键词）
         ↓ 归一化评分 → 最优上下文窗口
```

嵌入向量由配置的 Provider 计算（OpenAI embeddings 或本地 Ollama），存储为压缩 BLOB。检索时同时跑向量相似度搜索和 BM25 关键词搜索，按权重融合排序后返回最相关记忆。

### 11 层安全体系

| 安全层 | 机制 |
|-------|-----|
| 网关绑定 | 默认 `127.0.0.1`，不允许 `0.0.0.0` 直接暴露 |
| 配对认证 | 6 位一次性配对码 → POST /pair → Bearer Token |
| 文件系统隔离 | `workspace_only=true`，检测 Null 字节注入和符号链接逃逸 |
| 隧道强制 | 不允许无隧道的公网绑定（Tailscale / Cloudflare / ngrok）|
| **沙箱隔离** | 自动检测最优后端：Landlock（Linux 内核）> Firejail > Bubblewrap > Docker |
| **密钥加密** | API Key 用 **ChaCha20-Poly1305**（AEAD）加密存储 |
| 资源限制 | 可配置内存、CPU、磁盘、子进程上限 |
| 审计日志 | 带签名的事件链，可配置保留期 |
| 渠道白名单 | 空列表 = 拒绝全部；`"*"` = 允许全部；否则精确匹配 |
| 命令白名单 | 工具执行仅限显式允许的命令 |
| E2E 加密 | Relay 支持 X25519 密钥交换 + 加密 payload |

**ChaCha20-Poly1305** 被选中的原因：在没有硬件 AES 加速的移动端和嵌入式 CPU 上，它的性能是 AES-GCM 的 3 倍以上。

### 配置文件格式（OpenClaw 兼容）

配置文件：`~/.nullclaw/config.json`，`onboard` 命令自动生成。

```json
{
  "default_temperature": 0.7,
  "models": {
    "providers": {
      "openrouter": {
        "api_key": "sk-or-v1-xxxxxxxx"
      },
      "anthropic": {
        "api_key": "sk-ant-api03-xxxxxxxx",
        "base_url": "https://api.anthropic.com"
      },
      "ollama": {
        "base_url": "http://localhost:11434"
      }
    }
  },
  "channels": {
    "telegram": {
      "accounts": {
        "main": {
          "bot_token": "123456:ABC-DEF1234",
          "allow_from": ["your_username"],
          "proxy": "socks5://127.0.0.1:7897"
        }
      }
    },
    "dingtalk": {
      "accounts": {
        "work": {
          "webhook_token": "xxxxxxxx"
        }
      }
    }
  },
  "memory": {
    "backend": "sqlite",
    "auto_save": true,
    "embedding_provider": "openai",
    "vector_weight": 0.7,
    "keyword_weight": 0.3,
    "hygiene": {
      "enabled": true,
      "max_age_days": 90
    }
  },
  "security": {
    "sandbox": "auto",
    "workspace_only": true,
    "audit_log": true
  }
}
```

### 硬件外设支持

NullClaw 是目前唯一支持硬件外设的 AI Agent 框架。通过 `Peripheral` vtable 接口：

```bash
# 扫描可用外设
nullclaw peripherals scan

# 连接 Arduino（JSON 串行协议）
nullclaw peripherals connect arduino --port /dev/ttyACM0

# Raspberry Pi GPIO 直接访问
nullclaw peripherals connect rpi-gpio

# STM32/Nucleo（通过 probe-rs 烧录）
nullclaw peripherals connect stm32 --chip STM32F401RE
```

Agent 可通过工具调用直接操控这些外设，实现 LLM 控制实体硬件的完整闭环。

### CalVer 发布节奏

NullClaw 采用日历版本（YYYY.M.D），截至 2026 年 3 月已发布 9 个版本，最新为 **v2026.3.5**。项目明确声明 pre-1.0，不保证配置和 CLI 接口稳定性。已有 **5100+ 测试**，是本文三个项目中测试覆盖率最高的。

### 优缺点分析

**✅ 优势**
- 678 KB 静态二进制，2ms 启动，可在 $5 Raspberry Pi Zero 上流畅运行
- 50+ AI 提供商，真正的模型无关性
- 原生支持国内通讯平台（钉钉、飞书、QQ）
- 内置 OpenClaw 配置迁移工具
- 最完善的安全层次（11 层）
- 硬件外设支持（Arduino、RPi GPIO、STM32）
- 5100+ 测试，覆盖率最高

**❌ 劣势**
- Zig 语言小众，定制插件需要学习 Zig
- pre-1.0 阶段，配置和 CLI 接口不稳定
- 社区规模相比 OpenClaw 仍小（4.8K vs 28 万 Star）
- 文档相对不足，部分高级功能需要读源码

### 落地预测与前景

NullClaw 的定位是**系统级 AI 基础设施**，而非面向最终用户的产品。

**近期可落地场景：**

1. **边缘计算节点**：CDN 边缘服务器、物联网网关运行 NullClaw daemon，本地处理简单 AI 推理请求，复杂任务再转发云端。678KB 二进制意味着可以随 OTA 推送到任何嵌入式 Linux 设备
2. **企业多渠道 AI 网关**：一个 NullClaw 实例同时监听钉钉、飞书、企业微信，统一接入多个 AI 提供商，按成本/延迟动态路由
3. **Serverless AI Agent**：2ms 启动时间使其成为按需唤醒场景的理想选择，冷启动代价几乎可以忽略

**远期预测：** NullClaw 最有可能演进为 AI Agent 领域的 **Nginx**——基础设施级别的小型高效中间件，大量现有平台会基于它构建上层产品。Zig 语言对嵌入式的支持，加上 WASM 运行时适配层，让它有望成为首个能在浏览器、服务器、边缘节点、单片机**同一套代码库**运行的 AI Agent 框架。

---

## 汇总对比：四只龙虾，各有绝活

| 维度 | OpenClaw | NanoClaw | MimiClaw | NullClaw |
|-----|---------|---------|---------|---------|
| **GitHub Stars** | ~28 万 | ~2.1 万 | ~1.7 万 | ~4.8 万 |
| **语言** | TypeScript | TypeScript | C | Zig |
| **代码量** | ~43 万行 | ~3900 行 | ~适中 | ~4.5 万行 |
| **二进制/分发大小** | ~28 MB + deps | npm install | 固件（~1MB）| **678 KB** |
| **启动时间** | 数秒 | 数秒 | 上电即运行 | **<2ms** |
| **最低硬件成本** | VPS | VPS | **$5** | **$5（RPi Zero）**|
| **内存占用** | ~300MB–500MB | 数百 MB | 8MB PSRAM | **~1 MB** |
| **AI 提供商** | 10+ | **仅 Claude** | Claude + OpenAI | **50+** |
| **通信渠道** | 22+ | 5+ | 3（Telegram/WS/CLI）| 19 |
| **安全隔离** | 应用层 allowlist | **OS 级容器** | 无（开放）| 多层沙箱 |
| **国内友好** | 较好（原生飞书，有中文文档社区） | 有中文 README | **内置代理支持** | **原生钉钉/飞书/QQ**|
| **项目成熟度** | 生产可用 | 早期迭代 | 原型阶段 | Pre-1.0 |
| **适合人群** | 所有人 | 安全敏感开发者 | 嵌入式/IoT 爱好者 | 系统工程师 |

### 选型建议

- **安全合规要求高（金融/医疗/法律）** → **NanoClaw**：代码量小可以审计，OS 级容器隔离是真命题
- **极低成本 + 数据本地化 + IoT 场景** → **MimiClaw**：5 美元入场，0.5W 全天运行，数据不出设备
- **模型无关 + 边缘/嵌入式部署 + 企业多渠道** → **NullClaw**：678KB 可以塞进任何设备，50+ 提供商灵活切换
- **功能最全 + 最大社区 + 快速上手** → **OpenClaw**：28 万 Star 的生态在那，缺点都是已知的，踩坑有人陪

这四个项目并非竞争关系，更像是 AI Agent 基础设施从"云端大一统"向"端云分布式"演进过程中的四个探针——每一个都在测试不同方向的边界，而这些边界，正是下一代 AI 应用的轮廓。

---

*项目地址：*
- *NanoClaw：https://github.com/qwibitai/nanoclaw*
- *MimiClaw：https://github.com/memovai/mimiclaw*
- *NullClaw：https://github.com/nullclaw/nullclaw*
- *OpenClaw：https://github.com/openclaw/openclaw*