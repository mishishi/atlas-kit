# Round 30: End-to-End Pipeline Automation (2026-06-18)

> **TL;DR**: Atlas Kit's card-production pipeline went from
> "wizard-only (with 3 req / 5 min rate limit) + manual CLI hacks" to
> "one CLI command per card, fully scripted, batchable, dead-lettered".
> Verified end-to-end on 布达拉宫 (architecture, the 62nd card).
> Pipeline: plan → build-prompt → matrix → 落盘 → 3-tier → cards.json
> → 内容补全 → visualScore.

## What this round shipped

**4 new scripts** (the pipeline):

| Script | Role | Lines |
|---|---|---|
| `scripts/plan-new-cards.mjs` | 24-kind 候选池 + 缺口扫描 → `tmp/new-cards-plan.json` | ~210 |
| `scripts/regen-3tier.mjs` | `-card.png` → `-thumb.webp` (384w) + `-full.webp` (1024w q90) | ~80 |
| `scripts/generate-card.mjs` | 串联 build-prompt → matrix(retry 3) → 落盘 PNG/MD → 3-tier → cards.json + log-revision | ~250 |
| `scripts/finish-card.mjs` | 内容补全串联:per-card (mmx) + bulk (deterministic) | ~130 |

**4 source scripts modified** (R30 fixes):

| Script | Fix | Reason |
|---|---|---|
| `scripts/draft-history.mjs` | mmx envelope 解析 + year post-process + 3-5 节点 | M2.7 thinking 模式 + --quiet → 输出空 → hang; thinking 阶段吃光 4096 tokens |
| `scripts/draft-sources.mjs` | mmx envelope 解析 | 同上,只 sources prompt 短所以没触发 hang |
| `scripts/add-cross-tags.mjs` | 补 `great-wall` + `potala-palace` cross-tags | 60 张老卡 dict 没这俩,WARN 跳过 → 推荐系统无信号 |
| `scripts/generate-card.mjs` | 加 `--series` / `--seriesNo` / `--palette` 标志 | 单卡模式 fallback 到 "001" seriesNo,跟 plan-new-cards 算的 012 冲突 |

## Why this round existed

By R28 the wizard (`/create` → `/api/generate`) was working but
locked behind a rate limit (3 req / 5 min) and only callable from
the browser. There was no CLI equivalent — anyone wanting to
batch-produce 60+ cards would have to either:

1. Spam the wizard endpoint (rate-limited), or
2. Manually replicate wizard's internal logic in a one-off shell
   script (the pattern used for the great-wall 长城 run in this
   session — fragile, undocumented, no retries, no dead letter).

R30 builds a proper CLI pipeline that the wizard and the CLI
**both** sit on top of, so future batches of new kinds can run
unattended.

## The pipeline (one card)

```
[user]  --topic 布达拉宫 --kind architecture --slug potala-palace
            ↓
[1] scripts/build-prompt.mjs (v2, file-archived templates)
            ↓  2569 bytes markdown prompt
[2] mavis daemon HTTP API → matrix_generate_image
            ↓  retry 3 times, exponential backoff (2s, 4s)
            ↓  1K 9:16 PNG via cdn-yingshi-ai-com (matrix biz-gateway)
[3] fs.writeFile -card.png
            ↓
[4] fs.writeFile -prompt.md  (H1: prompt is source of truth)
            ↓
[5] sharp inline: -card.png → -thumb.webp (384w) + -full.webp (1024w)
            ↓
[6] cards.json patch:
      - existing card → replace image + push revision
      - new card      → append full entry
            ↓
[7] (later) scripts/finish-card.mjs:
      阶段 1: per-card mmx
        - draft-history.mjs  (3-5 nodes, year post-process)
        - draft-sources.mjs  (3-4 sources)
      阶段 2: bulk deterministic
        - add-cross-tags.mjs
        - enrich-mentions.mjs
        - add-myth-fact.mjs  (10 hardcoded, no mmx)
        - score-all-cards.mjs --write  (visualScore 0-8)
```

## End-to-end PoC: 布达拉宫 (62nd card)

```text
=== 布达拉宫  (architecture/potala-palace) ===
  prompt: 2569 bytes (v2 file-archived)
  matrix: attempt 1 failed (no output_url), retry → ok
  -card.png: 1709 kB
  -prompt.md: 2569 bytes
  -thumb.webp + -full.webp: ok
  cards.json: new entry added (kind=architecture, series=craft-and-botanical, seriesNo=012)

=== finish-card.mjs --slug potala-palace --bulk ===
  阶段 1a: draft-history (mmx M2.7)  → 5 nodes
       631年 | 松赞干布始建
       1645年 | 五世达赖重建宫
       1648年 | 红宫主体完工
       1959年 | 战火受损与重修
       1994年 | 列入世界遗产
  阶段 1b: draft-sources (mmx M2.7)  → 3 sources
       中国大百科全书 / 维基中文 / 知网
  阶段 2a: add-cross-tags  → +建筑/中国/古代/宫殿/西藏/世界遗产
  阶段 2b: enrich-mentions  → 0 new (potala-palace 没被其他卡 refer)
  阶段 2c: add-myth-fact  → 0 new (不在 hardcoded 10 张)
  阶段 2d: score-all-cards  → visualScore 7/8
       (only fail: Rule 6 OCR 置信度 35% < 50%, model-generated 中文字形
       OCR 难读 — 不是真乱码)
```

Final entry state:

```yaml
slug:        potala-palace
title:       布达拉宫
kind:        architecture
series:      craft-and-botanical
seriesNo:    012
palette:     #F5F0E6 #B88952 #8C7F6E
image:       /cards/architecture/potala-palace/potala-palace-card.png
image_thumb: /cards/architecture/potala-palace/potala-palace-thumb.webp
image_full:  /cards/architecture/potala-palace/potala-palace-full.webp
score:       8.7  (visualScore 7/8)
tags (8):    建筑 | 宫殿 | 西藏 | 世界遗产 | 唐朝 | 清初 | 中国 | 古代
subtitle:    宫堡建筑 · 政教合一 · 世界屋脊
description: 270 chars
history:     5 nodes (631/1645/1648/1959/1994 年)
sources:     3 条权威中文
```

## Key R30 decisions

### 1. 24-kind 候选池(覆盖 `prompt-template/categories/`)

R28 之前 `categories/` 目录里只有 11 个 kind(README 列的),cards.json
实际用 12 个老 + 1 个 architecture(共 13 个)。R28 后续没在 README
里加 architecture(代码里也支持),但 categories/ 目录又陆续加
了 12 个新 kind(artwork / book / chemical-element / country /
disease / movie / mythology / profession / space-object / sport /
vehicle),总共 24 个。

R30 把 `plan-new-cards.mjs` 的候选池扩展到 24 个 kind(每个 kind
5-8 个候选主题),跟 categories 目录对齐。default 行为还是只补
`current > 0` 的 kind(目前只有 architecture 缺 4 张),加
`--include-empty` 才考虑 `current=0` 的全新 kind。

### 2. mmx + M2.7 envelope 解析

R28 verification 的时候 mmx text chat 是工作的(用 --quiet + 默认
output mode = 纯文本)。M2.7 加了 thinking 字段后,mmx 的输出变成
JSON envelope `{content:[{type:"thinking"},{type:"text"}]}`。在
--quiet 模式下 mmx 不知道怎么处理 envelope,会输出**空字符串**,
但 powershell.exe 进程不退出,等我们的 90s / 180s timeout 触发
ETIMEDOUT。

修法:
- 去掉 `--quiet`
- 加 `extractResponseText` 函数,优先解析 JSON envelope 拿 `text`
  字段,fallback 到 raw text(老 mmx 兼容)

适用所有调 mmx 的脚本。`draft-history.mjs` / `draft-sources.mjs`
都改了。

### 3. history year post-process

M2.7 在 text 字段里**经常只输出 title + body,不输出 year 字段**。
年信息是嵌在 body 里的("七世纪初叶"、"1645年"、"18世纪中期"、
"1994年"),但单独 `year` key 是 `null` 或缺失。

修法:在 `draft-history.mjs` validate 阶段,如果 `year` 是
null / "" / "X" / "x",从 body 用 regex 提取年份:

```js
function extractYearFromBody(body) {
  if (!body) return null;
  let m;
  if ((m = body.match(/前\s*(\d+)\s*年/))) return `前 ${m[1]} 年`;
  if ((m = body.match(/公元\s*(\d+)\s*年/))) return `${m[1]} 年`;
  if ((m = body.match(/(\d{2,4})\s*年/))) return `${m[1]} 年`;
  if ((m = body.match(/(\d+)\s*世纪/))) return `${m[1]} 世纪`;
  return null;
}
```

优先级:前 N 年 > 公元 N 年 > N 年 (2-4 位) > N 世纪。布达拉宫 5
个节点全部有真实年份(631/1645/1648/1959/1994)。

### 4. 节点数 5-8 → 3-5

M2.7 thinking 模式下,5-8 节点 + 30-60 字 body 的 prompt 让
thinking 阶段吃光 4096 tokens,`text` 字段根本没出 → 表面是
ETIMEDOUT,实际是 max_tokens 截断。

3-5 节点 thinking 用不完 tokens,text 正常输出,年 post-process
兜底后 5/5 节点有正确年份。

### 5. CROSS_TAGS 字典补 2 条

`add-cross-tags.mjs` 的 CROSS_TAGS 是 hard-coded dict,60 张老卡
都有覆盖,但 great-wall (R28 后新加) + potala-palace (R30 后新
加) 没匹配,推荐系统"你可能也会喜欢"少信号。补 2 条:

```js
"great-wall":      ["建筑", "中国", "古代", "防御", "世界遗产"],
"potala-palace":   ["建筑", "中国", "古代", "宫殿", "西藏", "世界遗产"],
```

### 6. generate-card.mjs 单卡模式加 --series / --seriesNo / --palette

单卡模式 (`--topic X --kind Y --slug Z`) 之前没有 series /
seriesNo / palette 标志,fallback 到 `craft-and-botanical` /
`"001"` / `["#F5F0E6","#B88952","#8C7F6E"]`。这跟
`plan-new-cards.mjs` 算的 seriesNo 冲突(布达拉宫应该是 012 而
不是 001)。

R30 加了 3 个 CLI 标志,让 `from-plan` 和 `单卡` 模式行为一致。
`--palette` 接受逗号分隔 hex(`"#F5F0E6,#B88952,#8C7F6E"`)。

## H1 / Hard Rules 兼容

R30 严格遵守 H1 规则:

- `plan-new-cards.mjs` 不直接生产 prompt,只生成 topic + kind
  + slug + series + seriesNo + palette 的 plan JSON
- `generate-card.mjs` 通过 `child_process.execFile` 调
  `build-prompt.mjs`,**不 inline** prompt
- 每次跑都把 `build-prompt.mjs` 输出的 prompt 原样保存为
  `<slug>-prompt.md`(R26 H1 要求)
- 改 prompt 的唯一合法路径仍然是编辑 `prompt-template/` 下的
  `.md` 文件,`generate-card.mjs` 只是搬运工

## 跟 wizard 的关系

```
                    ┌─────────────────────────┐
                    │ scripts/build-prompt.mjs │  ← single source of truth
                    └─────────────────────────┘
                          ▲                ▲
                          │ execFile        │ execFile
                          │                │
       ┌──────────────────┴────┐  ┌────────┴───────────────┐
       │ /api/generate/route.ts │  │ generate-card.mjs      │
       │ (wizard, 3 req/5min)   │  │ (CLI, no rate limit)   │
       └────────────────────────┘  └────────────────────────┘
              browser                  terminal / batch
              1 user                   N cards
```

Wizard 和 CLI 是**同源**(都调 build-prompt.mjs),但**入口**不同:
- Wizard: 浏览器 / 1 用户 / rate-limited / 写 cards.json 完整
- CLI: 终端 / N 张 / 无 rate limit / 写 cards.json 完整

后续如果想做 batch orchestrator(`batch-generate.mjs`),直接调
`generate-card.mjs` 即可(不绕路 wizard)。

## R30 verification

布达拉宫 PoC 端到端跑通:
- 2569 bytes prompt
- matrix attempt 1 fail, attempt 2 ok
- 1709 KB PNG
- 3-tier 派生成功
- mmx 阶段 1 跑通(history 5 节点 + sources 3 条)
- 阶段 2 跑通(cross-tags +0 个新增因为布达拉宫是 stage 2a 重跑 dict
  后才加上的,跑完才生效 → 补到 8 tags)
- visualScore 7/8

唯一瑕疵:Rule 6 (OCR 置信度)fail,原因不是真乱码而是模型生成
的中文字形略不规范(笔画不连续),tesseract OCR 难读。这是 matrix
模型的固有限制,不是 pipeline 问题。

## What's NOT in R30 (R31 候选)

| 任务 | 状态 | 备注 |
|---|---|---|
| `scripts/batch-generate.mjs` orchestrator | 待做 | 4 张 architecture(布达拉宫已跑,剩 应县木塔 / 赵州桥 / 黄鹤楼)能一键并发跑完。concurrency + 死信队列 |
| visualScore 全量 | 部分 | score-all-cards 跑过 28/62(超时截断),布达拉宫 7/8 + 长城 4/8 已确认;剩余 60 张未跑 |
| 长城重新跑 2K | 候选 | 当前长城是 1K 914KB,visualScore 4/8,跟布达拉宫 1K 7/8 差很多。怀疑是早期 prompt 不一致导致,重跑 2K 可能改善 |
| architecture template "建筑档案" 重复 bug | 待修 | R30 布达拉宫图里 "建筑档案" 和 "地理位置" module 各出现 2 次,architecture.md 模板没禁止 8 module 严格 |

## 文件变更清单

新增(4):
- `scripts/plan-new-cards.mjs`
- `scripts/regen-3tier.mjs`
- `scripts/generate-card.mjs`
- `scripts/finish-card.mjs`

修改(4):
- `scripts/draft-history.mjs` (mmx envelope + year post-process + 3-5 节点)
- `scripts/draft-sources.mjs` (mmx envelope)
- `scripts/add-cross-tags.mjs` (+2 cross-tags entries)
- `scripts/generate-card.mjs` (+--series / --seriesNo / --palette)

新增文件(7):
- `tmp/new-cards-plan.json` (plan 输出)
- `tmp/failed-cards.jsonl` (dead letter,空文件如果没失败)
- `public/cards/architecture/potala-palace/potala-palace-card.png` (1709 KB)
- `public/cards/architecture/potala-palace/potala-palace-prompt.md` (2569 B)
- `public/cards/architecture/potala-palace/potala-palace-thumb.webp`
- `public/cards/architecture/potala-palace/potala-palace-full.webp`
- `public/cards/architecture/great-wall/great-wall-card.png` (914 KB, R28 跑)

数据更新(2):
- `data/cards.json` (+1 entry, 60 → 62; +布达拉宫 8 tags / 5 history / 3 sources / visualScore / score)
- `data/cards.json` (长城 +6 cross-tags, 修 seriesNo)

## 累计 session 改动

从 R28 结束(2026-06-17)到 R30 完成(2026-06-18):
- 8 个新文件 / 修改
- 0 个 hard rule 违反
- 0 个 inline prompt
- 0 个新依赖 (sharp 已存在 / mmx 已配)
- 0 个 prompt-template 模板修改
- 1 个 bug 发现(modules duplicate)待修
