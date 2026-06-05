---
title: Impeccable：让 AI 不再生成千篇一律的 UI
date: 2026-04-07
badge: AI
tags: ["AI", "Claude Code", "Developer"]
draft: false
---

**Impeccable 是一个开源的 AI 设计技能框架**，由 Paul Bakaus 于 2026 年 2 月 28 日发布，它通过向 AI 编码工具注入设计词汇和反模式库，将 AI 生成界面的质量提升了 **59%**——而无需更换模型。这不是一个组件库或 CSS 主题，而是一个介于开发者意图和 AI 执行之间的**词汇层**。项目在不到一个月内从 v1.0 迭代到 v1.6，支持 Cursor、Claude Code、Gemini CLI、Codex CLI 等 9 种以上 AI 编码工具，在 GitHub 上获得了超过 **14,900 颗星**和 634 个 Fork。

---

## 为什么 AI 生成的 UI 都长一个样

每一个主流大语言模型都在相同的网页模板上训练。没有明确的设计指导时，它们的输出呈现出惊人的同质性：Inter 字体、紫蓝渐变、卡片嵌套卡片、灰色文字放在彩色背景上、居中的数字英雄区。开发者社区为这种现象创造了一个术语——**"AI slop"（AI 垃圾）**。

问题的根源不在于模型能力不足。Paul Bakaus 发现了一个关键洞察：**瓶颈在于词汇，而非能力**。"你无法要求'更好的垂直节奏'，如果你从未用过这些词。" 模型完全有能力执行精细的设计指令——比如 OKLCH 色彩空间、色调化的中性色、视觉层次和光学对齐——但开发者的提示词从来不够具体。Tessl 第三方基准测试证实了这一点：在三个测试场景（收入仪表板、落地页、任务管理器）中，Impeccable 将综合得分从基线提升到 **0.82/1.00**，OKLCH 色彩使用从 **0 直接跃升到 12/12**。

Impeccable 建立在 Anthropic 官方发布的 `frontend-design` 技能之上（该技能已有 277,000 次安装），但用更深的专业知识和更精确的控制进行了大幅扩展。

---

## 一个技能、二十条指令、一套反模式库

Impeccable 的架构由三个支柱构成：

**核心技能 `frontend-design`** 是整个系统的"主技能"，也是唯一一个**不可直接由用户调用**的技能。它定义了设计原则、美学指南和反模式规则，所有其他 20 条指令都从它继承原则。该技能包含 **7 个领域专用参考文件**：

| 参考文件 | 覆盖领域 |
| --- | --- |
| typography | 字体系统、字体配对、模块化比例尺、OpenType |
| color-and-contrast | OKLCH 色彩、色调化中性色、暗色模式、无障碍 |
| spatial-design | 间距系统、网格、视觉层次 |
| motion-design | 缓动曲线、交错动画、减少动效 |
| interaction-design | 表单、焦点状态、加载模式 |
| responsive-design | 移动优先、流式设计、容器查询 |
| ux-writing | 按钮标签、错误信息、空状态 |

**20 条斜杠指令** 构成了一套完整的设计语言，每条指令针对界面的一个特定维度，可以链式组合使用：

| 指令  | 功能  |
| --- | --- |
| `/teach-impeccable` | 一次性设置：收集项目设计上下文，保存到 `.impeccable.md` |
| `/audit` | 技术质量审计（无障碍、性能、响应式），输出 P0-P3 严重级别评分 |
| `/critique` | UX 设计评审：层次、清晰度、情感共鸣，对标 Nielsen 十大启发式 |
| `/normalize` | 对齐设计系统标准 |
| `/polish` | 发布前的最后一遍精修 |
| `/distill` | 去除不必要的复杂度 |
| `/clarify` | 改善不清晰的 UX 文案 |
| `/optimize` | 性能优化 |
| `/harden` | 错误处理、国际化、边缘情况 |
| `/animate` | 添加有目的性的动效 |
| `/colorize` | 为单色界面引入策略性色彩 |
| `/bolder` | 放大过于保守的设计 |
| `/quieter` | 收敛过于激进的设计 |
| `/delight` | 添加令人愉悦的体验时刻 |
| `/extract` | 提取为可复用组件 |
| `/adapt` | 适配不同设备和上下文 |
| `/onboard` | 设计引导流程和空状态 |
| `/typeset` | 修正字体选择、层次和缩放 |
| `/arrange` | 修正布局、间距和视觉节奏 |
| `/overdrive` | 技术极致效果：着色器、弹簧物理、滚动驱动动画 |

典型工作流是：先运行 `/audit` 识别问题 → `/arrange` 修复布局 → `/typeset` 调整排版 → `/polish` 做最终精修。每条指令接受可选参数来聚焦特定区域，例如 `/audit header` 或 `/polish checkout-form`。

---

## "AI 垃圾检测"是设计方法论的核心

Impeccable 的设计哲学可以用一句话概括：**"如果你把这个界面展示给别人，说'这是 AI 做的'，他们会立刻相信吗？如果会，那就是问题所在。"** 这被称为 **"AI Slop Test"（AI 垃圾测试）**，嵌入在核心技能和每条诊断指令中。

技能文件中详细列出了必须避免的反模式，这些反模式是 2024-2025 年 AI 生成作品的"指纹"：

**色彩禁区**：不使用"AI 调色板"（深色背景上的青色、紫蓝渐变、霓虹高光）；不使用纯黑 `#000` 或纯白 `#fff`（自然界中不存在纯黑白）；不将灰色文字放在彩色背景上；不使用渐变文字制造"冲击力"。正确做法是使用 **OKLCH 色彩函数**和**色调化中性色**。

**布局禁区**：不将所有内容包裹在卡片中；不嵌套卡片；不使用千篇一律的卡片网格（相同尺寸 + 图标 + 标题 + 文本无限重复）；不使用"英雄数字"模板（大数字 + 小标签 + 渐变高光）。正确做法是拥抱**不对称布局**和**有意打破网格**。

**排版禁区**：不使用 Inter、Roboto、Arial 等被滥用的字体；不用等宽字体假装"技术感"。正确做法是选择有个性的展示字体配合精致的正文字体，使用 **`clamp()` 流式字体大小**和**模块化比例尺**。

**动效禁区**：不使用弹跳或弹性缓动（过时且廉价）；不动画化布局属性（width、height）。正确做法是使用**指数缓动**（ease-out-quart/quint/expo），只动画化 transform 和 opacity。

技能要求在编写任何代码之前先确立"**大胆的美学方向**"——极简主义、极繁主义、复古未来、有机自然、奢华精致、粗野主义等——关键是**意图性，而非强度**。"大胆的极繁主义和精致的极简主义都行得通——关键是刻意为之。"

---

## 仓库架构和技术实现

仓库采用"**单一真实来源**"架构：在 `source/skills/` 目录中维护包含完整 YAML 前置元数据的源文件，然后通过构建系统自动转换为 8 种以上 AI 工具的特定格式。这是一个关键的设计决策——不同工具的能力差异很大（Cursor 不支持前置元数据，Claude Code 支持完整参数定义），Impeccable 选择在源文件中维护最丰富的格式，按需向下降级，而不是限制所有工具使用最低公分母。

```text
impeccable/
├── source/                    # 编辑这里！唯一真实来源
│   └── skills/               # 技能定义（含 YAML 前置元数据）
│       ├── frontend-design/  # 核心技能
│       │   ├── SKILL.md      # 主技能文件
│       │   └── reference/    # 7 个领域参考文件
│       │       ├── typography.md
│       │       ├── color-and-contrast.md
│       │       ├── spatial-design.md
│       │       ├── motion-design.md
│       │       ├── interaction-design.md
│       │       ├── responsive-design.md
│       │       └── ux-writing.md
│       ├── audit/SKILL.md
│       ├── critique/SKILL.md
│       ├── polish/SKILL.md
│       ├── teach-impeccable/SKILL.md
│       └── ...（共 21 个技能目录）
├── dist/                      # 生成的输出（已提交，用户可直接复制）
│   ├── cursor/.cursor/       # Cursor 格式
│   ├── claude-code/.claude/  # Claude Code 格式（完整元数据）
│   ├── gemini/.gemini/       # Gemini CLI 格式（TOML 指令）
│   ├── codex/.codex/         # Codex CLI 格式
│   ├── agents/.agents/       # 通用 Agent 格式
│   ├── kiro/.kiro/           # Kiro 格式
│   ├── opencode/.opencode/   # OpenCode 格式
│   ├── pi/.pi/               # Pi 格式
│   └── universal/            # 通用包（包含所有格式）
├── scripts/build.js           # 构建入口
├── lib/transformers/          # 每个工具一个转换器（30-85 行）
├── api/                       # Vercel Functions（impeccable.style 的 API）
├── public/                    # impeccable.style 网站源码
├── AGENTS.md                  # 仓库架构文档
├── DEVELOP.md                 # 贡献者指南
└── CLAUDE.md                  # Claude Code 专用指令
```

构建系统使用 **Bun**（比 Node.js 快 2-4 倍），每个工具的转换器是独立的 30-85 行模块。关键转换包括：Claude Code 保留完整的 `args` 数组和 `allowed-tools`；Codex 将参数转为 `argument-hint` 格式并将 `{{arg}}` 替换为 `$ARGNAME`；Gemini 使用最小前置元数据并将单参数统一为 `{{args}}`；Cursor 仅保留基本的 name 和 description。

**`/teach-impeccable` 指令** 是整个系统的入口点。它先扫描项目代码库（README、package.json、CSS 变量、品牌资产），然后向用户提问（目标用户、品牌个性、美学偏好、无障碍需求），最后将收集到的设计上下文写入项目根目录的 `.impeccable.md` 文件。所有后续指令都自动读取此文件作为上下文。这个文件在更新 Impeccable 时**永远不会被覆盖**。

**`/audit` 指令** 从 5 个维度评分（0-4 分）：无障碍、性能、主题化、响应式设计、反模式检测，生成总分 0-20 的健康评分，并按 P0-P3 严重级别分类所有问题。每个问题都附带建议使用的修复指令。

**`/critique` 指令** 则从 10 个维度进行设计评审：视觉层次、信息架构、情感共鸣、可发现性、构图、排版、色彩策略、状态处理、微文案、操作引导。v1.6.0 起还对标 **Nielsen 十大可用性启发式**，并使用人物画像原型进行测试。

---

## 创作者背景和项目的更深层意义

Paul Bakaus 的职业轨迹解释了 Impeccable 的存在。他创建了 **jQuery UI**（曾驱动约 20% 的互联网界面）——这是在"开发者不懂设计"这个问题上的第一次桥梁构建。他在 Google 领导了 **Chrome DevTools** 的产品工作，发布了 **AMP** 和 **Web Stories**——每一个项目都是在技术转型中识别出新的鸿沟并建造桥梁。现在，AI 辅助编码创造了新的鸿沟：开发者想要什么和 AI 产出什么之间的差距。Impeccable 是他对这个鸿沟的回应。

项目的演进速度极快：从 2 月 28 日首发到 3 月 24 日的 v1.6.0，不到一个月内完成了 **6 个主要版本**、从 4 个工具扩展到 9 个以上、从 17 条指令增加到 20 条。社区反馈同样活跃：GitHub 上 43 个已关闭的 PR、7 个开放的 Issue。该项目已被其他技能集合（如 mxyhi/ok-skills 收录了 18 个 Impeccable 技能）集成和分发。

值得注意的局限性：多位分析者指出，Tessl 基准测试在一定程度上是"自我评测"——它衡量的正是 Impeccable 优化的指标。**词汇不等于品味**，知道"色调化中性色"这个概念不代表知道何时使用它。此外，Impeccable 的"禁止弹跳缓动"等规则实质上是 Bakaus 个人的审美偏好，而非普遍真理。七个参考文件也带来了不可忽视的 **token 成本开销**。

## 结论

Impeccable 揭示了一个被忽视的真相：AI 模型的设计能力远超我们的提示词水平。**59% 的质量提升不来自更强的模型，而来自更精确的词汇注入**。这个项目的真正贡献不仅是那 20 条指令本身，更是它证明了一种新的 AI 工具增强范式——不改变模型，只改变与模型对话的语言。Paul Bakaus 预言词汇层将在后端架构、API 设计、数据库模式、安全策略等每个领域涌现。如果这一预言成真，Impeccable 将不仅是一个设计工具，而是一个品类的开端。
