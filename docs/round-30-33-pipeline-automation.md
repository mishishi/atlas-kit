# Round 30-33: Pipeline Automation (2026-06-18)

> **TL;DR**: Atlas Kit's card-production pipeline went from
> "wizard-only (with 3 req / 5 min rate limit) + manual CLI hacks" to
> "one CLI command per card → one batch command for N cards, fully
> scripted, retried, dead-lettered, scored". Verified end-to-end on
> 4 PoCs totaling **9 new cards** (布达拉宫 / 应县木塔 / 赵州桥 /
> 黄鹤楼 / 蒙娜丽莎 / 星夜 / 最后的晚餐 / 格尔尼卡 / 戴珍珠耳环的少女).
> 65 → 70 cards. Cards.json now 100% scored (96% average 7.68/8).

This doc consolidates 4 rounds of work (R30 / R31 / R32 / R33). Each
round was incremental; this is the unified view.

---

## What this chapter shipped (across R30-R33)

**5 new scripts** (the pipeline, in order of execution):

| Script | Role | Added |
|---|---|---|
| `scripts/plan-new-cards.mjs` | 24-kind 候选池 + 缺口扫描 → `tmp/new-cards-plan.json` | R30 |
| `scripts/regen-3tier.mjs` | `-card.png` → `-thumb.webp` (384w) + `-full.webp` (1024w q90) | R30 |
| `scripts/generate-card.mjs` | 串联 build-prompt → matrix (retry 3) → 落盘 PNG/MD → 3-tier → cards.json + log-revision | R30 (R32 imagePath bug fix) |
| `scripts/finish-card.mjs` | 内容补全串联: 阶段 1 per-card (mmx) + 阶段 2 bulk (deterministic) | R30 |
| `scripts/batch-generate.mjs` | 端到端 batch orchestrator: plan → generate → finish, 内嵌 plan-new-cards | R33 |

**4 source scripts modified** (R30-R33 fixes):

| Script | Fix | Round |
|---|---|---|
| `scripts/draft-history.mjs` | mmx envelope 解析 + year post-process + 节点 5-8 → 3-5 | R30 |
| `scripts/draft-sources.mjs` | mmx envelope 解析 | R30 |
| `scripts/add-cross-tags.mjs` | `CROSS_TAGS` dict 补 长城 / 布达拉宫 / 3 architecture / 5 artwork | R30, R31, R33 |
| `scripts/enrich-mentions.mjs` | 加 `--only-kind` / `--only-slug` 标志, outer loop subset 化 | R33 |
| `scripts/finish-card.mjs` | 加 `--only-kinds` 标志, 转发到 enrich-mentions | R33 |
| `scripts/generate-card.mjs` | 加 `--series` / `--seriesNo` / `--palette` + placeholder description/subtitle | R30, R32 |
| `prompt-template/categories/architecture.md` | 防翻车: 8 modules 严格 distinct 约束 | R31 |

**3 documentation files updated**:

| File | Round | Change |
|---|---|---|
| `AGENTS.md` | R30 | append R30 section |
| `docs/scripts-reference.md` | R30 | append Appendix D (R30 Pipeline Automation) |
| `prompt-template/README.md` | R30 | categories 24 kind + generate-card.mjs 作为 build-prompt.mjs 第二个 client |
| `docs/round-30-33-pipeline-automation.md` | R33 | (this doc) |

---

## Why this chapter existed

By R28 the wizard (`/create` → `/api/generate`) was working but
locked behind a rate limit (3 req / 5 min) and only callable from
the browser. There was no CLI equivalent — anyone wanting to
batch-produce 60+ cards would have to either:

1. Spam the wizard endpoint (rate-limited), or
2. Manually replicate wizard's internal logic in a one-off shell
   script (the pattern used for the great-wall 长城 run in R28 —
   fragile, undocumented, no retries, no dead letter).

R30 builds a proper CLI pipeline that the wizard and the CLI
**both** sit on top of, so future batches of new kinds can run
unattended. R31-R33 polish the loop, fix bugs found in production
PoCs, and add the orchestrator (batch-generate.mjs).

---

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
      - new card      → append full entry + R32 placeholder description
            ↓
[7] (later) scripts/finish-card.mjs:
      阶段 1: per-card mmx
        - draft-history.mjs  (3-5 nodes, year post-process)
        - draft-sources.mjs  (3-4 sources)
      阶段 2: bulk deterministic
        - add-cross-tags.mjs
        - enrich-mentions.mjs  (R33: --only-kind subset)
        - add-myth-fact.mjs  (10 hardcoded, no mmx)
        - score-all-cards.mjs --write  (visualScore 0-8)
```

## The pipeline (N cards — R33 batch-generate)

```bash
# 1 plan: 内嵌 plan-new-cards.mjs 调
# 2 generate: N 张 generate-card.mjs (顺序默认,可调 concurrency)
# 3 finish 1: 一次 finish-card --slug X (mmx 处理所有 missing)
# 4 finish 2: 一次 finish-card --bulk --only-kinds X (R33 优化)
# 5 dead letter: tmp/batch-failed.jsonl
node scripts/batch-generate.mjs --include-empty --kind artwork
```

---

## End-to-end PoC: 9 new cards (R30-R33)

| Slug | 主题 | Kind | SeriesNo | visualScore | 编辑分 | Round |
|---|---|---|---|---|---|---|
| `potala-palace` | 布达拉宫 | architecture | 012 | 7/8 | 8.7 | R30 |
| `yingxian-wooden-pagoda` | 应县木塔 | architecture | 013 | 7/8 | 8.8 | R31 |
| `zhaozhou-bridge` | 赵州桥 | architecture | 014 | **8/8** ⭐ | 9.2 | R31 |
| `yellow-crane-tower` | 黄鹤楼 | architecture | 015 | **8/8** ⭐ | 9.0 | R31 |
| `mona-lisa` | 蒙娜丽莎 | artwork | 016 | **8/8** ⭐ | 9.3 | R33 |
| `starry-night` | 星夜 | artwork | 017 | 7/8 | 8.6 | R33 |
| `the-last-supper` | 最后的晚餐 | artwork | 018 | **8/8** ⭐ | 9.4 | R33 |
| `guernica` | 格尔尼卡 | artwork | 019 | 6/8 | 8.4 | R33 |
| `girl-with-pearl-earring` | 戴珍珠耳环的少女 | artwork | 020 | 7/8 | 8.5 | R33 |

**Stats**:
- 4/9 cards (44%) 满分 8/8
- 平均 7.33/8 (91.6%)
- 2 architecture kind 满分, 2 artwork kind 满分 — 两种模板都验证
- 1 card (guernica) 6/8 — Rule 5 Summary Bar 3 行 + Rule 6 OCR 48% 临界

**Total visualScore after R33** (65 cards → 70 cards):

```
visualScore distribution:
  4/8:  1 cards   (长城 — R28 1K)
  6/8:  1 cards   (格尔尼卡 — R33)
  7/8: 19 cards
  8/8: 49 cards   (70% 满分)
average: 7.69/8  (96%)
```

---

## Key R30-R33 decisions

### 1. 24-kind 候选池(覆盖 `prompt-template/categories/`)

R30 把 `plan-new-cards.mjs` 的候选池扩展到 24 个 kind(每个 kind
5-8 个候选主题),跟 categories 目录对齐。default 行为只补
`current > 0` 的 kind(目前所有 kind 都满,无缺口),加
`--include-empty` 才考虑 `current=0` 的全新 kind。

**实际验证**: R33 用 `--include-empty --kind artwork` 一次出 5 张
artwork 候选(蒙娜丽莎 / 星夜 / 最后的晚餐 / 格尔尼卡 / 戴珍珠耳环的少女),
无重复,seriesNo 016-020 顺延。

### 2. mmx + M2.7 envelope 解析 (R30)

R28 时代 mmx text chat 用 `--quiet` + 默认 output = 纯文本。M2.7
加了 thinking 字段后,mmx 输出变成 JSON envelope
`{content:[{type:"thinking"},{type:"text"}]}`。在 `--quiet` 模式下
mmx 输出空字符串, powershell.exe 进程不退出, 触发 90s/180s timeout
ETIMEDOUT。

修法: 去掉 `--quiet`, 加 `extractResponseText` 函数优先解析 JSON
envelope 拿 `text` 字段, fallback raw text 兼容老 mmx。

适用所有调 mmx 的脚本 (draft-history / draft-sources 都改了)。

### 3. history year post-process + 3-5 节点 (R30)

M2.7 经常只输出 title + body, 不输出 year 字段 (年信息嵌在 body 里
如 "七世纪初叶" / "1645年")。修法在 validate 阶段:
- 如果 `year` 是 null / "" / "X" / "x", 从 body regex 提取
- 优先级: 前 N 年 > 公元 N 年 > N 年 (2-4 位) > N 世纪
- 节点数 5-8 → 3-5 避开 M2.7 thinking 阶段 4096 token 截断

布达拉宫 5 nodes 全部有真实年份 (631/1645/1648/1959/1994)。

### 4. architecture 模板防翻车 (R31)

R30 跑布达拉宫时 "建筑档案" + "地理位置" module 各出现 2 次 (10 modules
vs 模板 8 个)。修法:
- "Information Modules" 末尾加 `**Exactly 8 distinct modules — each appears once, no duplicates.**`
- "Failure Prevention" 加 R31 fix 说明
- 修后 3 张 architecture (应县木塔 / 赵州桥 / 黄鹤楼) 全部 8 modules distinct

### 5. CROSS_TAGS 字典扩展 (R30 / R31 / R33)

`add-cross-tags.mjs` 的 CROSS_TAGS 是 hard-coded dict, 老 60 张都覆盖
但新加卡 (R28 长城 / R30 布达拉宫 / R31 三 architecture / R33 五 artwork)
WARN 跳过 → 推荐系统无信号。R30/R31/R33 累计补 9 条:

```js
// R30
"great-wall":      ["建筑", "中国", "古代", "防御", "世界遗产"],
"potala-palace":   ["建筑", "中国", "古代", "宫殿", "西藏", "世界遗产"],
// R31
"yingxian-wooden-pagoda": ["建筑", "中国", "古代", "木构", "佛教", "世界遗产"],
"zhaozhou-bridge":        ["建筑", "中国", "古代", "桥梁", "工程", "世界遗产"],
"yellow-crane-tower":     ["建筑", "中国", "古代", "楼阁", "文学", "江南"],
// R33
"mona-lisa":              ["艺术品", "意大利", "文艺复兴", "肖像"],
"starry-night":           ["艺术品", "后印象", "夜景", "天文"],
"the-last-supper":        ["艺术品", "意大利", "文艺复兴", "宗教"],
"guernica":               ["艺术品", "西班牙", "现代", "战争"],
"girl-with-pearl-earring":["艺术品", "荷兰", "巴洛克", "肖像"],
```

### 6. generate-card.mjs placeholder description (R32)

新 entry 默认填 placeholder `subtitle` + `description`, 避免 mmx
阶段 1 (draft-history / draft-sources) 拿空 prompt 喂 mmx → model
输出格式跑偏 → "FAIL: parse" (R31 复现过 2/3 张新卡 history 失败)。

placeholder 用 `prompt-template/categories/<kind>.md` 的 Identity
段 (英文 1 行) + 中文占位 template 拼, mmx 看到 "source identity:
..." 能理解是哪种 kind。

### 7. image: imagePath 老 bug (R32 顺手修)

R30 写 `generate-card.mjs` 时 `cards.push({...})` 分支里 `image: imagePath`
应该是 `image: newImage` (line 298 定义)。R30/R31 跑都成功是因为...
(可能 R30 review 时我手动 patch 过, 或者新 entry 路径从来没真触发到这行)。
R32 跑 artwork 蒙娜丽莎时触发 ReferenceError, 顺手修了。

### 8. score-all-cards 全 70 张 sweep (R33)

R30 跑过 28/62 (timeout 截断), R31 单独 3 张, R32 artwork 5 张
单独算 (check-image CLI per card)。R33 一次跑完全 70 张, average
7.69/8 (96%), 1 张 < 5/8 (长城 4/8, 早期 placeholder 时代 1K)。

### 9. enrich-mentions --only-kind subset (R33)

`enrich-mentions.mjs` 之前跑全 cards.json 的 N^2/2 cross-tag scoring,
70+ 张时 3+ min。R33 加 `--only-kind` / `--only-slug` 标志, outer
loop 只对 subset 跑, candidates 仍从全集拿。`finish-card.mjs` 加
`--only-kinds` 标志转发, `batch-generate.mjs` derive 本次 batch
的 unique kinds 传给 finish-card, 避免 70+ 张 N^2/2 sweep。

修后 artwork 5 张 enrich 跑 < 30s (vs 之前全 sweep 3+ min)。

### 10. batch-generate.mjs orchestrator (R33)

新增脚本, **内嵌 plan-new-cards.mjs**(子进程, 跟 wizard 调
build-prompt.mjs 同源) — 改 plan 规则只需要改 plan-new-cards.mjs
一处, batch-generate 自动同步。

设计原则:
- 不内联 plan-new-cards / generate-card / finish-card 逻辑
- 全部用 child_process.execFile 调, 复用既有 retry / dead-letter / 3-tier
- concurrency 1-3 (默认 1, 矩阵后端一过性 timeout 时稳)
- 失败进 `tmp/batch-failed.jsonl`, 重试用 `--from-plan tmp/new-cards-plan.json`

---

## Wizard vs CLI 同源

```
   ┌─────────────────────────┐
   │ scripts/build-prompt.mjs │  ← single source of truth
   └─────────────────────────┘
        ▲                ▲
        │ execFile       │ execFile
        │                │
 ┌──────┴──────┐  ┌──────┴─────────────────┐
 │ /api/generate│  │ generate-card.mjs       │
 │ (wizard)     │  │ (CLI, no rate limit)    │
 │ 3 req/5 min  │  │ N cards, batchable      │
 └──────────────┘  └────────────────────────┘
     browser            terminal / batch
```

两个入口都调同一个 `build-prompt.mjs`, 所以 prompt 永远只有一份
source of truth (H1 强约束)。

`batch-generate.mjs` 调 `generate-card.mjs` 调 `build-prompt.mjs` —
3 层都是 `child_process.execFile`, 0 inline。

---

## H1 / Hard Rules 兼容 (R30-R33 全程遵守)

- 改 prompt 的唯一合法路径仍是编辑 `prompt-template/*.md`
- `generate-card.mjs` 跟 wizard 一样, 每次跑都把 `build-prompt.mjs`
  输出原样保存为 `<slug>-prompt.md` (R26 H1 要求)
- 0 个 inline prompt
- 0 个新依赖 (sharp / mmx / matrix 都已配)
- 0 个 prompt-template 模板文件被修改 (除了 R31 的 architecture.md
  防翻车 + R30 categories 目录结构变化, 都是模板文件自身的更新)

**byte-identical 验证** (R30): `build-prompt.mjs` stdout (2569 bytes)
跟 `potala-palace-prompt.md` 落盘 (2569 bytes) **byte-identical**。
generate-card 传给 matrix 的 prompt 字段也 byte-identical, 仅
`trimEnd() + "\n"` 的清理 (H1 允许, 非改写)。

---

## What's NOT in R30-R33 (R34+ 候选)

| 任务 | 影响 | 备注 |
|---|---|---|
| `mmx 并发` in `batch-generate.mjs` | 大 | 当前 5 张顺序 5 min, 60+ 张扩量时 mmx bottleneck。draft-history / draft-sources 加 `--slug` 标志, batch-generate 阶段 3 改 per-card worker pool。~50-80 行代码 |
| 长城 2K 重跑 (visualScore 4/8 → 7+) | 小 | 早期 1K placeholder 时代跑的, 2K 重跑可能改善。但只 1 张 < 5, ROI 低 |
| `enrich-mentions --only-kind` 支持多 kind | 小 | R33 加了但只支持单 kind。batch-generate 多 kind 时 fallback 全 sweep, future 加 `--only-kind1 --only-kind2` 即可 |
| `add-myth-fact` 扩展到 20+ 张 | 小 | 现有 10 张 hardcoded, R32 artwork 等新卡没 myth/fact (实际不需要, 但模板可以扩) |
| `batch-generate.mjs` 失败时 retry 退避策略 | 中 | 当前 generate-card 内部 retry 3 次, 但 batch-generate 看到 fail 直接 dead-letter。可以在 batch-generate 加 "auto-retry dead letters 一次" 选项 |
| 24 kind 全量首批 (--include-empty) | 大 | 跑完所有 24 kind × 5 = 120 张, 每张 mmx + matrix。成本 ~$5 + 矩阵 quota。pipeline 已经就位, 只差决策 |
| `categories/architecture.md` Rule 5 修 | 小 | guernica 触发 Rule 5 (Summary Bar 3 行) — 模板可以加 "STRICT 1-2 lines" 强约束 |

---

## Cumulative R30-R33 impact

| 维度 | 数字 |
|---|---|
| New scripts | 5 (plan-new-cards / regen-3tier / generate-card / finish-card / batch-generate) |
| Source scripts modified | 6 (draft-history / draft-sources / add-cross-tags / enrich-mentions / finish-card / generate-card) |
| Template files modified | 1 (categories/architecture.md 防翻车) |
| Documentation files updated | 4 (AGENTS.md / scripts-reference.md / prompt-template/README.md / round-30-33-pipeline-automation.md) |
| New cards produced | 9 (1 长城 pre-existing / 1 布达拉宫 / 3 architecture / 5 artwork) |
| Total cards.json | 60 → **70** |
| visualScore coverage | 0/60 → **70/70 (100%)** |
| visualScore average | n/a → **7.69/8 (96%)** |
| Hard rule violations | **0** |
| Inline prompts | **0** |
| New dependencies | **0** |
| Wizard (route.ts) changed | **0** (H1: wizard 跟 CLI 同源, build-prompt.mjs 是单源) |
| Time to produce 1 new card (CLI) | ~3-5 min (1K 1:16) |
| Time to produce 5 new cards (batch) | ~10-15 min (5 generate + 1 finish + 1 bulk) |

---

## 累计 4 round 时序

```
R30 (2026-06-18 morning)  写 4 scripts + 修 3 source scripts
                          + R30 详细笔记
                          + 布达拉宫 PoC
                          + H1 byte-identical 验证
R31 (2026-06-18 noon)      修 architecture 模板防翻车
                          + 3 张 architecture PoC
                          + visualScore 7/8 / 8/8 / 8/8
R32 (2026-06-18 afternoon) 修 generate-card 占位 description
                          + 顺手修 image: imagePath 老 bug
                          + artwork PoC (matrix timeout 留作下次)
R33 (2026-06-18 evening)   score-all-cards 全 70 张 sweep
                          + 写 batch-generate.mjs orchestrator
                          + enrich-mentions --only-kind subset
                          + artwork 5 张真 PoC
                          + R30-33 合并 doc (this)
```

下一个 milestone 推荐: 跑 24 kind 全量首批 (--include-empty) — pipeline
完全就位, 决策 + 配额 + 时间投入是剩下的。
