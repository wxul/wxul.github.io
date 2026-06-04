# 公众号文章同步 SOP

> 适用：把作者本人的微信公众号文章（`mp.weixin.qq.com/s/*`）同步到本仓库的 `src/content/posts/`。
> 受众：Claude Code。用户给定一个或多个 URL 并请求按本 SOP 执行。

## 触发

当用户给出公众号文章 URL 并要求"同步"、"按 SOP 同步"、"sync wx"等时，按本文步骤执行。

## 并发与批量

当用户一次性给出 **≥2 个** URL 时：

- 主 Claude **不要顺序处理**
- 用 Agent / Task 工具按 **3–5 个并发** 派 subagent
- 在单条消息里同时发起 3–5 个 agent 调用（独立并行）
- 每个 subagent 收到：本 SOP 路径 + 1 个 URL + "按 §1–§7 完整执行该 URL"
- subagent 完成后返回结构化结果：`{status, slug, title, date, tags, file_path}` 或失败原因
- 第一批结束后，再派下一批（每批 3–5），直至所有 URL 处理完毕
- 主 Claude 汇总所有结果，按 §7 输出最终摘要表

单 URL 时无需 subagent，主 Claude 直接执行 §1–§7。

## 执行步骤

### 1. 输入校验

- URL 必须匹配 `https://mp.weixin.qq.com/s/*`
- 不符合则跳过该 URL（不中断），记入最终摘要的 skipped 列表

### 2. 抓取（脚本）

在 shell 里运行：

```bash
node scripts/wx-fetch.mjs "<url>"
```

脚本会用真实浏览器 UA 请求公众号文章，绕过 `WebFetch` 默认 UA 触发的风控页；返回 stdout JSON：

```json
{
  "url": "...",
  "title": "原文标题（未去装饰）",
  "publishTime": "2026-01-15T04:00:00.000Z",
  "publishDate": "2026-01-15",
  "author": "公众号名（可空）",
  "contentMarkdown": "## ... 已由 turndown 转换好的干净 markdown"
}
```

退出码：

- `0`：成功
- `1`：HTTP 错误或字段抽取失败
- `2`：参数非 `mp.weixin.qq.com/s/*`
- `3`：返回的是风控/验证/删除页（详见 §异常处理）

退出码非 0 时按 §异常处理 处理（跳过该 URL，不中断后续）。

### 2.1 后处理（脚本之外）

脚本输出的 `contentMarkdown` 已是干净 markdown：

- `<h2>/<h3>` 已转为 `##/###`；一级标题 `#` 不保留
- `<img>` 已替换为 `<!-- image: <src> -->`，不下载图片
- 列表 / 代码块 / 引用 / 强调 / 链接 等结构都已正确转换
- `<span>` / WeChat 内联样式噪声已剥除

剩余的语义级清洗（footer 模板、callout 改写）在 §3 处理。

### 3. 正文清洗

对返回的 markdown：

- 移除公众号脚注模板（"扫码关注"、二维码块、"喜欢作者"、"点击查看历史消息"、"在看"、"分享"等）
- 将每个 `![](http...)` 替换为 `<!-- image: <原url> -->`，保留原位置（不论图片来自 `mmbiz.qpic.cn` 还是其他 CDN）
- 一级标题 `#` 不保留在正文（标题已进 frontmatter）
- 章节从 `##` 起
- 引用块改写规则：
  - 明显的提示语（"提示"、"注意"、"小贴士"等开头）→ `:::tip[...]`
  - 明显的警告（"警告"、"注意事项"、"⚠️" 等）→ `:::warning[...]`
  - 信息/注释类（"说明"、"备注"、"附"等）→ `:::info[...]`
  - 其余无明确语义信号的引用块 → 保留原 `>` 写法，不要强行转 callout

### 4. 元数据派生

#### 4.1 标题

- 去掉装饰性前后缀：「」【】▎｜ 及 "干货"、"原创"、"重磅" 等标签前缀
- 保留中文标点和破折号/冒号分隔的主副标题结构
- 不翻译、不改写语义

#### 4.2 日期

- 用 step 2 返回的发布时间，归一化为 `YYYY-MM-DD`
- 解析失败时用今天日期兜底，并在文末追加：`<!-- TODO: 日期解析失败，请人工核对原文 -->`

#### 4.3 Slug（用作文件名，不写入 frontmatter）

- 英文 kebab-case，5–6 词以内
- 提炼标题语义重点，非逐字翻译
- 优先复用标题或正文小标题里出现过的英文专有名词（产品名、人名、术语）
- 不用 stop words（the、a、of）
- 范例：
  - 「焦虑买不来未来：从OpenClaw爆火看AI时代的生存逻辑」→ `anxiety-wont-buy-future-ai-survival`
  - 「Claude Code 接入第三方模型指南」→ `claude-code-third-party-models-guide`

#### 4.4 Tags（写入 frontmatter）

- 执行前先用 `Bash` 收集现有 tag 池：

  ```bash
  grep -h "^tags:" src/content/posts/*.md | sort -u
  ```

- 若 `src/content/posts/` 为空或 `grep` 无输出，跳过复用步骤，直接派生 2–4 个新 tag
- 优先从池中复用（保持归类一致性）；池里没合适项再新增
- 数量：2–4 个
- 结构惯例：1 个大类（如 `"AI"`、`"Vibe Coding"`、`"Weekly"`）+ 1–3 个具体主题
- 大小写沿用池中既有写法

### 5. 重名顺延

如 `src/content/posts/<slug>.md` 已存在：

- 第一次冲突：在 slug 尾部追加 1–2 词语义后缀（如 `claude-code-models` → `claude-code-models-guide`）
- 第二次起：追加数字 `-2`、`-3`、…
- 始终保持 kebab-case，**不中断流程**

### 6. 写入文件

用 `Write` 写到 `src/content/posts/<slug>.md`，结构：

```yaml
---
title: <清洗后标题>
date: <YYYY-MM-DD>
tags: ["<tag1>", "<tag2>"]  # 实际填 2–4 个具体值
draft: false
---

<正文 markdown>
```

不写 `slug`、`badge`、`archive` 字段。

### 7. 输出摘要

每个 URL 处理完后输出一行：

```
[ok] <文件路径> | title=<title> | date=<date> | tags=<tags>
```

跳过/失败的 URL：

```
[skip] <url> | 非公众号链接
[fail] <url> | <失败原因>
```

批量处理（≥2 URL）时，所有 URL 处理完毕后追加一份汇总表（`ok / skip / fail` 三段）。

## 异常处理

| 情况 | 处置 |
|---|---|
| URL 非 `mp.weixin.qq.com/s/*` | 脚本 exit 2，跳过，记 `[skip]` |
| 脚本 exit 1（HTTP 错误 / 字段抽取失败 / 正文过短） | 跳过，记 `[fail] (原因)` |
| 脚本 exit 3（公众号风控/验证/删除页） | 视同抓取失败，按 `[fail]` 处理 |
| 日期解析失败（脚本输出 `publishDate: null`） | 用今天日期兜底 + 文末 TODO 注释 |

**风控/验证页识别由脚本完成**——当返回正文包含下列任一句段时，脚本以 exit 3 + `{url, error: "risk_control", marker}` JSON 退出：

- `环境异常`
- `请完成验证`
- `此内容因违规无法查看`
- `此内容已被发布者删除`
- `此账号已自主注销`
- `已被原作者删除`

**所有异常一律：显式报告 + 不中断后续 URL。**

## Frontmatter 模板

```yaml
---
title: <清洗后的标题>
date: <YYYY-MM-DD>
tags: ["<tag1>", "<tag2>"]
draft: false
---
```

## 未来扩展（占位，本期不实现）

- **图片回填子流程**：从 `<!-- image: <url> -->` 占位还原图片（含水印判断、`src/assets/posts/<slug>/` 存放、Markdown 引用替换）
- **其他来源 SOP**：知乎、Substack、自建 RSS 等，沿用 `docs/sop/<source>-sync.md` 命名
- **批量入口脚本**：若需求增大可加 `npm run sync:wx` 串联本地操作
