# Scripts Reference · `scripts/`

> All Node.js scripts that build and maintain the `data/cards.json`
> encyclopedia + `public/cards/` image bundle. Run them from the
> project root with `node scripts/<name>.mjs [args]`.

## TL;DR

| 你想做什么 | 跑这个 |
|---|---|
| 想手工加新字段到几张卡 | `log-revision.mjs <slug> "summary"` |
| 想把所有卡的某个空字段批量补上 | 看 [§3 数据充实](#3-数据充实-data-enrichment) 里的对应脚本 |
| 想把所有图重新压成 3 层 (thumb/card/full) | `reencode-full-webp.mjs` (PNG → WebP, **慎跑**) |
| 想知道 prompt 怎么生成的 | `build-prompt.mjs` + 看 [§6 prompt-template 联动](#6-prompt-template-联动) |
| 想把卡片的 description 写得更自然 | `fix-descriptions.mjs` |
| 想把所有卡加上跨切标签 | `add-cross-tags.mjs` |
| 想知道哪些脚本不该跑 | 看 [§7 Legacy](#7-legacy--superseded) |

---

## 目录

1. [总览: 16 个脚本的分类](#1-总览)
2. [上手执行顺序 (新项目)](#2-上手执行顺序新项目)
3. [数据充实 (Data Enrichment)](#3-数据充实)
4. [修复类 (Repair / One-off Fix)](#4-修复类)
5. [资源处理 (Image Pipeline)](#5-资源处理)
6. [Prompt 生成](#6-prompt-生成)
7. [Legacy / Superseded](#7-legacy--superseded)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. 总览

`scripts/` 下 **16 个 .mjs 文件** 按职责分 5 类:

| 类别 | 数量 | 脚本 |
|---|---|---|
| 数据充实 (idempotent / re-runnable) | 6 | `add-cross-tags`, `add-coords`, `add-myth-fact`, `enrich-mentions`, `draft-extras`, `draft-history`, `draft-sources` |
| 修复类 (one-shot / destructive) | 2 | `fix-descriptions`, `handwrite-history` |
| 资源处理 (image pipeline) | 4 | `resize-cards` (DEPRECATED), `reencode-full-webp`, `restore-image-full`, `rewrite-image-full` |
| Prompt 生成 | 1 | `build-prompt` |
| 编辑辅助 | 1 | `log-revision` |
| 时间轴布局 | 1 | `backdate-timeline` |
| Legacy / Superseded | (resize-cards, restore-image-full, rewrite-image-full) |

⚠️ **运行规则**:
- 所有脚本都改 `data/cards.json` (除非注明只读)
- 数据充实类**幂等** (已填充的卡会跳过)
- 修复类 / 资源处理类 / 时间轴类**破坏性** (跑第二次会破坏状态), 通常带 idempotency guard 或 `--force`
- AI 调用 (`draft-*`, `fix-descriptions`) 走 `mmx text chat`, 需要 `C:\Users\zrb03\AppData\Roaming\npm\mmx.ps1` (Windows) 或 `mmx` (其他平台)

### 当前 cards.json 状态 (as of 2026-06-16)

```
total cards:        60
quote:            60/60   ← draft-extras.mjs
trivia:           60/60   ← draft-extras.mjs
history:          60/60   ← draft-history.mjs + handwrite-history.mjs (9 stubborn)
sources:          60/60   ← draft-sources.mjs
description:      60/60   ← fix-descriptions.mjs (7 originally empty)
coords:           12/60   ← add-coords.mjs (geo-located cards only)
myth/fact:        10/60   ← add-myth-fact.mjs (hand-written)
revisions:         3/60   ← log-revision.mjs (sample entries)
tags:             60/60   ← add-cross-tags.mjs (every card has 跨切分类标签)
cross-mentions:   50/60   ← enrich-mentions.mjs (was 11/60 before)
```

---

## 2. 上手执行顺序 (新项目)

如果你拿到一个空仓库, 想从 60 张纯 `image + tagline + title` 的占位卡走到完整图鉴:

```bash
# 1. 描述文本 (7 张原本空 description 的卡)
node scripts/fix-descriptions.mjs            # ~$0.10

# 2. 历史沿革 (AI 草稿, ~$0.30)
node scripts/draft-history.mjs               # 全 60 张; AI 报不出来的 9 张走下一步

# 3. 历史沿革 (手写 fallback)
node scripts/handwrite-history.mjs           # 覆盖 AI 失败的 9 张

# 4. 引文 + 趣事 (quote + trivia, ~$0.15)
node scripts/draft-extras.mjs

# 5. 参考来源 (~ $0.20)
node scripts/draft-sources.mjs

# 6. 跨切分类标签 (本地规则, 无 AI)
node scripts/add-cross-tags.mjs

# 7. 坐标 (本地规则, 12 张)
node scripts/add-coords.mjs

# 8. 误解-真相 配对 (10 张手写)
node scripts/add-myth-fact.mjs

# 9. 反向引用 / 知识图谱
node scripts/enrich-mentions.mjs

# 10. 时间轴回填 (创造历史感, 一次性)
node scripts/backdate-timeline.mjs           # 默认拒绝重跑, --force 才允许

# 11. 修订记录 (手写, 手动触发)
node scripts/log-revision.mjs <slug> "summary" [field1 field2 ...]

# 12. 资源压成 3 层 (只在最初跑一次)
node scripts/reencode-full-webp.mjs          # 一次性, 拒绝重跑
```

> **AI 调用总计**: ~$0.75 (基于 M2.7 `mmx text chat` 价格估算, 实际可能因
> 单卡失败而增加)。
>
> **破坏性脚本** (10, 11, 12) 不会自动跑, 也不会被错误地重新跑 — 它们
> 都有 idempotency guard, 重复跑会 **exit 1 + 解释错误**, 而不是默默改坏
> 数据。

---

## 3. 数据充实 (Data Enrichment)

### `add-cross-tags.mjs` (125 行)

**干什么**: 给每张卡追加 2-5 个跨切分类标签 (中国 / 古代 / 江南 / 哺乳 / 工艺 / 文化 / ...), 让 "你可能也会喜欢" 推荐算法有信号可用。

**为什么需要**: 单卡自带的 tags 是描述性的 (温顺 / 蓝眼 / 古蜀 / ...), 跨卡匹配率只有 ~1%。加上跨切分类标签后, 跨卡匹配率提升到 ~30%, 推荐结果才有意义。

**标签轴**:

| 轴 | 取值 |
|---|---|
| era | 古代, 近代, 现代 |
| region | 中国, 东亚, 全球, 北方, 江南, 西北, 西南, 高原 |
| theme | 自然, 城市, 工艺, 科技, 文化, 节日, 食物, 历史, 神话, 文学, 哲学, 物理, 数学 |
| subject | 哺乳, 鸟类, 爬行, 植物, 矿物, 器物, 建筑, 食物 |

**调用**:

```bash
node scripts/add-cross-tags.mjs
```

**幂等**: 是。已存在的标签自动跳过。

**输出**: 末尾打印 top-10 标签频率 (e.g. `中国: 44, 古代: 17, 全球: 15, 文化: 15, 江南: 7`)。

**和 enrich-mentions.mjs 联动**: enrich-mentions 用这里的跨切分类标签计算 shared score, 所以**必须先跑 add-cross-tags 再跑 enrich-mentions**。

---

### `add-coords.mjs` (51 行)

**干什么**: 给 12 张地理类卡片加 lat/lng, 让 `/map` 页面有 pin 可显示。

**为什么 12/60**: 不是所有卡都需要坐标。城市 (上海/杭州/苏州/西安/北京) 5 + 地标 (故宫/敦煌/苏州园林/三星堆) 4 + 物候/现象 (梅雨/钱塘江大潮) 2 + 名茶 (西湖龙井) 1 = 12。**极光故意不加** — 是全球现象, 单点坐标没意义。

**调用**:

```bash
node scripts/add-coords.mjs
```

**幂等**: 是 (直接赋值, 重复跑结果一致)。

**Drift 检测 (R23g)**: 如果 hard-coded slug 在 cards.json 里找不到 (e.g. 有人删了某张卡), 末尾会打印 `⚠️ N hard-coded coord slug(s) not found: ...`。**别忽略这个 warning** — 删了卡之后没删 COORDS map, 下次跑 silent skip, 看起来 OK 但其实有 dead entry。

---

### `add-myth-fact.mjs` (115 行)

**干什么**: 给 10 张最容易误解的卡片加 `myth` + `fact` 配对 (e.g. 端午 ≠ 屈原, 兵马俑 ≠ 真人, 算盘 ≠ 中国发明)。

**为什么不 AI**: Round 7 测试发现 M2.7 对 "myth + fact" 这种结构化 pair 输出不稳定, 经常漏字段或编造来源。10 张数量也少, 手写更可靠。

**10 张卡**:

| slug | myth |
|---|---|
| `qingming` | "清明节的前身是寒食节" |
| `longjing-tea` | "只要是龙井茶就是西湖龙井" |
| `forbidden-city` | "故宫就是紫禁城, 现在还在被皇室居住" |
| `sanxingdui` | "三星堆是夏商周的附属文化" |
| `xian` | "兵马俑是秦始皇用真人活埋陪葬" |
| `dragon-boat` | "端午节是纪念屈原的节日" |
| `abacus` | "算盘是中国发明的" |
| `suzhou-gardens` | "苏州园林是皇家园林" |
| `labrador-retriever` | "拉布拉多就是金毛, 毛短的就是拉布拉多" |
| `qiantang-tide` | "钱塘江大潮是月球引力造成的普通天文潮" |

**调用**:

```bash
node scripts/add-myth-fact.mjs
```

**幂等**: 是 (已有 myth/fact 的卡跳过, 打印 `SKIP` 行)。

**Drift 检测 (R23a)**: 同 add-coords.mjs。

---

### `enrich-mentions.mjs` (85 行)

**干什么**: 给 description 自动追加 `（参见：X、Y）` 反向引用, 让知识图谱有边可走。

**算法**:

1. 对每张卡, 找 1-2 张其他卡 (不同 series) 共享 ≥ 2 个跨切分类标签
2. 如果 description 已经提了那张卡的 title, 跳过 (不重复)
3. 末尾追加 `（参见：${titles}）`

**调用**:

```bash
node scripts/enrich-mentions.mjs
```

**幂等**: 是。重复跑检测 `text.includes(title)`, 不会重复添加。

**前置依赖**: **必须先跑 `add-cross-tags.mjs`** — 否则没有跨切分类标签可用, enrich-mentions 会给 0 张卡加东西。

**跳过某张卡**: 编辑 `SKIP_SLUGS = new Set([...])` (顶部)。

---

### `draft-extras.mjs` (103 行)

**干什么**: AI 草稿 `quote` (权威引文) + `trivia` (趣事小知识) 两个字段, 通过 `mmx text chat` 批量生成。

**调用**:

```bash
node scripts/draft-extras.mjs
# 调试模式: DEBUG_EXTRAS=1 node scripts/draft-extras.mjs
```

**幂等**: 是。已有 quote + trivia 的卡跳过。

**环境依赖**: `mmx text chat` 必须能用 (Windows 走 PowerShell shim, 详见 [§8 Troubleshooting](#8-troubleshooting))。

**cost**: ~$0.15 / 60 卡 (M2.7 价格估算)。

**容错**: 解析失败的卡打印 `FAIL: parse`, 跳过 (不写 cards.json)。失败的可以人工补, 或者重跑 (这次会再试一次)。

---

### `draft-history.mjs` (177 行)

**干什么**: AI 草稿每张卡的 `history` (5-8 个时间节点), `[{year, title, body}]` 数组。

**调用**:

```bash
node scripts/draft-history.mjs                  # 全部 missing 的卡
node scripts/draft-history.mjs --limit 5        # 只跑前 5 张 (调试用)
node scripts/draft-history.mjs --dry-run        # 不真调 AI, 只打印会跑哪几张
```

**幂等**: 是。已有 history 的卡跳过。

**参数验证 (R23b)**: `--limit` 必须是正整数, `0` 或 `-3` 会 `exit 1` + 解释错误 (原来 `parseInt("0", 10)` → 0 → `slice(0, 0)` → 静默空跑)。

**cost**: ~$0.30 / 60 卡。

**`handwrite-history.mjs` 配套**: AI 失败的 9 张卡 (longjing-tea / ginkgo / du-fu / qingming / reign-of-zhenguan / blue-white-porcelain / mogao-caves / three-body / sanxingdui) 走手写 fallback。**先跑 draft-history 再跑 handwrite-history** — handwrite 会**覆盖**已有 history (不像其他 draft 脚本是 skip)。

---

### `draft-sources.mjs` (102 行)

**干什么**: AI 草稿每张卡的 `sources` (2-4 个权威中文参考来源), `[{title, url, type}]` 数组。

**调用**:

```bash
node scripts/draft-sources.mjs
```

**幂等**: 是。已有 sources 的卡跳过。

**url 验证 (R23d)**: **只接受 `https://` 开头的 url**, 没有 url 或 url 不是 https 的 source 项会被丢弃 (避免 broken-link rows)。如果 AI 给的来源全是非 https, 整张卡会被标记 `FAIL: too few` 并跳过。

**cost**: ~$0.20 / 60 卡。

---

## 4. 修复类 (Repair / One-off Fix)

### `fix-descriptions.mjs` (67 行)

**干什么**: 给 7 张原本 description 为空 / 占位文字的卡重写 80-150 字中文百科概述。

**调用**:

```bash
node scripts/fix-descriptions.mjs
```

**幂等**: 是。已有 ≥ 20 字 description 的卡跳过。

**cost**: ~$0.10 / 7 卡。

**输出**: 末尾打印 `success=N fail=M`。

---

### `handwrite-history.mjs` (103 行)

**干什么**: 手写 9 张 AI 草稿失败的卡的 history 节点。

**调用**:

```bash
node scripts/handwrite-history.mjs
```

**幂等**: **否**。这个脚本会**覆盖**已有 history。如果想保留 AI 的草稿, **别跑**。要重跑可以先手动从 git reset cards.json。

**Drift 检测 (R22)**: hard-coded slug 不在 cards.json 里会打印 warning。

---

### `backdate-timeline.mjs` (63 行)

**干什么**: 把 30 张 createdAt 集中在 2026-06-11/13 的卡, **前 30 张**回填到 2026-05-01..2026-05-30, 让 `/timeline` 页面有 6 周的时间跨度而不是单点垂直瀑布。

**调用**:

```bash
node scripts/backdate-timeline.mjs           # 默认拒绝重跑
node scripts/backdate-timeline.mjs --force   # 强制重跑 (e.g. 你想要不同的分布)
```

**幂等性 guard (R23f)**: 如果 cards.json 里已有 May 2026 的 createdAt, 立刻 `exit 1` + 解释错误。`--force` 才允许覆盖。

**Why 30/60**: 只回填一半, 保留另一半的原始日期 (2026-06-11 + 2026-06-13 = 实际批次运行日), 这样 `/timeline` 既有时间跨度, 又能让真正"那天上线"的卡显示在那一天。

**排序保证**: `cards.sort((a, b) => a.createdAt.localeCompare(b.createdAt))`, 然后回填 `[0..29]`, 所以**哪 30 张被回填取决于原始日期排序**, 不是脚本内部的硬编码。

---

### `log-revision.mjs` (38 行)

**干什么**: 给单张卡追加一条修订记录, 用于 `修订记录` 折叠面板。

**调用**:

```bash
node scripts/log-revision.mjs <slug> "<summary>" [field1 field2 ...]

# 例:
node scripts/log-revision.mjs sanxingdui "添加历史沿革 5 节点" history
node scripts/log-revision.mjs beijing "调整描述语气" description tagline
```

**幂等**: 否 — 每次跑都追加新 entry。日期是 ISO `new Date().toISOString()`。

**字段名**: 最后一个参数起都是 field name (字符串)。如果不传, 默认 `["unspecified"]`, 但建议**始终显式传**。

**Schema**:

```ts
{
  date: ISO string,
  summary: string,
  fields: string[]   // e.g. ["description", "tags", "history"]
}
```

---

## 5. 资源处理 (Image Pipeline)

### `reencode-full-webp.mjs` (85 行)

**干什么**: 把 60 张 1536w `-full.png` (每张 ~5.5 MB, 共 334 MB) 重新压成 1024w WebP q90 (~310 KB 一张, ~19 MB 总), 让 `public/` 总包满足 Vercel Hobby 100 MB 上传上限。

**调用**:

```bash
node scripts/reencode-full-webp.mjs
```

**幂等性 guard (R23h)**: 如果 cards.json 里 `image_full` 已经指向 `.webp`, 立刻 `exit 1` + 解释错误。**这个 guard 是必须的** — 原 PNG 在脚本结束时已经被删掉, 重跑会找不到 source, 而且 cards.json 已经指向 .webp, 重跑会 silent no-op 然后你困惑"为什么我新加的卡没图"。

**前置**: 必须先有 `-full.png` 文件 (从 wizard 批量跑出来的, 或从 git history `24287a1~1` 恢复)。

**输出**: 每张卡的转换日志 + 总 bundle 大小 + 与 100 MB cap 的对比。

---

### `resize-cards.mjs` (100 行) — ⚠️ DEPRECATED

**干什么 (历史)**: 把单张 `-full.png` 拆成 3 层 (`-thumb.webp` 384w, `-card.png` 600w, `-full.png` 1024w)。

**为什么废弃 (R23h)**: 有个 silent bug — `withoutEnlargement: true` 在 `null` height + 1536w 源的情况下, sharp 有时候**不缩** (留下了 1536w), 跟 `reencode-full-webp.mjs` 的 1024w 目标对不上。

**正确替代**: 直接用 `reencode-full-webp.mjs` 把 `-full.png` 转成 `-full.webp` 1024w。thumb / card 层用 `sharp` 直接跑 (一次性命令):

```bash
node -e "
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const dir = 'public/cards';
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('-full.webp')) continue;
  const base = f.replace(/-full\.webp$/, '');
  sharp(path.join(dir, f)).resize(384).webp({quality:82}).toFile(path.join(dir, base + '-thumb.webp'));
  sharp(path.join(dir, f)).resize(600).png({quality:82}).toFile(path.join(dir, base + '-card.png'));
}
"
```

**Header 注释**: 文件开头就写了 DEPRECATED + 替代方案, 防止误跑。

---

### `restore-image-full.mjs` (24 行) — LEGACY

**干什么 (历史)**: 把 cards.json 里 `image_full` 从 `image` (600w) 改回 `/cards/<slug>-full.png` (1024w), 在 commit `22940ba` 删了 -full.png 之后用 git history 恢复。

**为什么现在不该跑**: 现在 `image_full` 已经指向 `-full.webp`, 这个脚本会**指向 -full.png 但那个文件不存在**, 导致 lightbox 404。

---

### `rewrite-image-full.mjs` (27 行) — LEGACY

**干什么 (历史)**: 把 `image_full` 改成 `= image` (600w), 当 -full.png 被删时做的 band-aid。

**为什么现在不该跑**: 跟 restore 相反, 但效果一样是破坏性 — 把已经修好的 `image_full → -full.webp` 改回 `= image` 600w, lightbox 又会模糊。

---

## 6. Prompt 生成

### `build-prompt.mjs` (734 行)

**干什么**: 给 wizard (`/create` → `/api/generate`) 和 CLI 用户**生成一模一样的图像生成 prompt**。

**为什么是 CLI 而不是 lib**: `src/app/api/generate/route.ts` 通过 `child_process.execFile` 调这个脚本, 而不是 import 一个共享 lib。这样:

- CLI 用户能直接跑 (`node scripts/build-prompt.mjs 三星堆 history > prompt.md`)
- wizard 跟 CLI 永远走同一份代码 (改一处生效两处)
- Next.js bundler 不需要把这个 734 行的字符串拼接逻辑塞进 route bundle

**两种模板**:

| 版本 | 来源 | 何时用 |
|---|---|---|
| `v1` (默认 `v2`, 备 `v1`) | 243 行 inline 字符串 (从老 `prompt-templates.ts` 搬过来) | 回滚 / A/B 测试 |
| `v2` (默认) | `prompt-template/main-template.md` + `prompt-template/categories/<kind>.md` | 生产 (curated source of truth) |

**调用**:

```bash
node scripts/build-prompt.mjs <topic> <kind> [options]

# 常用:
node scripts/build-prompt.mjs 拉布拉多 pet                              # 默认 v2, stdout
node scripts/build-prompt.mjs 三星堆 history --version v1               # 走老 inline 模板
node scripts/build-prompt.mjs 钱塘江大潮 natural-phenomenon --out /tmp/p.md
node scripts/build-prompt.mjs 三星堆 history --quiet                    # 不打印 stderr summary
```

**参数**:

| 参数 | 说明 |
|---|---|
| `<topic>` | 主题中文名 (e.g. `拉布拉多`, `三星堆`) |
| `<kind>` | `pet` / `animal` / `plant` / `city` / `festival` / `food` / `person` / `object` / `historical-event` (alias `history`) / `natural-phenomenon` (alias `phenomenon`) / `tech-concept` (alias `tech`) / `other` |
| `--version v1\|v2` | 选模板版本, 默认 `v2` |
| `--out <path>` | 写入文件而不是 stdout |
| `--quiet` | 不打印 stderr summary (wizard 用) |

**Wizard 集成**: `route.ts` 读 `PROMPT_VERSION` env (`v1` / 其他 / unset), 默认 `v2`, 跟脚本默认一致。`PROMPT_VERSION=v1` 在 `.env.local` 设了即可让 wizard 切回老模板。

**Prompt-template 联动**: 改 v2 模板 = 改 `prompt-template/main-template.md` 或 `prompt-template/categories/<kind>.md`, **不要改脚本本身**。脚本里有两个 `slot placeholder` 检测 (主题:【填写主题】 + 类型:【城市 / 动物 / ...】), 如果模板格式改了脚本会 `exit 1` 而不是静默发错 prompt。

**Drift 检测**: 模板里残留【填写主题】或【城市 / 动物】会立即 bail — 防止把 placeholder 字面量发给图像模型。

**A/B 测试操作**:

```bash
# 同一主题, 两份 prompt, 对比生成的图
PROMPT_VERSION=v2 node scripts/build-prompt.mjs 三星堆 history --out /tmp/v2.md
PROMPT_VERSION=v1 node scripts/build-prompt.mjs 三星堆 history --out /tmp/v1.md
diff /tmp/v1.md /tmp/v2.md

# 或 wizard 走两次, 第一次 PROMPT_VERSION=v1, 第二次 v2
```

---

## 7. Legacy / Superseded

**不该跑, 留着做参考**:

| 脚本 | 替代 | 为什么 |
|---|---|---|
| `resize-cards.mjs` | `reencode-full-webp.mjs` + 一行 `sharp` | `withoutEnlargement:true` 有 silent bug (R23h) |
| `restore-image-full.mjs` | (nothing — `-full.webp` 已经是终态) | 改 cards.json 让 `image_full → -full.png`, 但那个文件已经不存在, 会 404 |
| `rewrite-image-full.mjs` | (nothing) | 反向 — 把 `image_full` 改回 `= image` (600w), 会让 lightbox 模糊 |

**怎么识别**: 文件顶部有 `LEGACY` / `DEPRECATED` 注释块, 第一句就告诉你别跑。

---

## 8. Troubleshooting

### "mmx: command not found" / "mmx.ps1 not found"

Windows: `mmx` 是 PowerShell shim, Node `child_process.execFile` 不会自动通过 PATH 解析 `.ps1`。需要显式:

```js
execFileSync("powershell.exe", [
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-File", "C:\\Users\\zrb03\\AppData\\Roaming\\npm\\mmx.ps1",
  // ...args
], { timeout: 90_000 })
```

所有 `draft-*.mjs` / `fix-descriptions.mjs` 已经处理这个, 但**自定义脚本**里要记得。

参考 [MEMORY entry "TypeScript ESM imports: tsc vs tsx conflict"] 和
"MiniMax 官方 API image-01"。

### "AI 生成失败: HTTP 500 — output new_sensitive (1027)"

`mmx text chat` 的内容过滤拦截。某些话题 (e.g. 涉及政治敏感历史, 战争血腥描述) 会触发。

**绕开**: 调整 prompt, 或者手写该卡的字段。`draft-*.mjs` 会打印 `FAIL: parse` / `ERR: ...`, **没填上的卡需要手补** (用 `log-revision.mjs` 不行, 那个只能加修订记录, 不能加字段本身)。

### "Cannot find module 'sharp'"

`reencode-full-webp.mjs` / `resize-cards.mjs` 需要 `sharp` (Node 图像处理库)。装:

```bash
npm install sharp
```

### "build-prompt.mjs: prompt-template/main-template.md not found"

`prompt-template/` 目录没在项目根目录, 或被 `.gitignore` 排除。验证:

```bash
ls prompt-template/
# 应该看到: README.md  main-template.md  categories/
```

### "backdate-timeline.mjs: this script appears to have already been run"

故意设计的 guard。如果真的要重跑 (e.g. 你想换一种日期分布):

```bash
node scripts/backdate-timeline.mjs --force
```

### "reencode-full-webp.mjs: image_full already points to .webp"

跟 backdate 一样的 guard。如果你需要重新压 (e.g. 调 quality 参数), 必须先把 cards.json 里 `image_full` 改回 `-full.png`, 然后**恢复**源 PNG (从 git history 找, 或从 wizard 重新跑一遍)。

**正常情况**: 这个 guard 永远触发不到, 因为脚本本身就是一次性跑完的。

### "draft-history.mjs: Invalid --limit value"

`--limit` 必须是正整数, `0` / `-3` / `abc` 都拒绝 (R23b fix)。如果想跑全部, **不要传 `--limit`**。

### "Draft 脚本 fail 率 > 50%"

可能的原因:
1. `mmx` 进程 hang — 检查 `Get-Process mmx` (Windows) / `ps aux | grep mmx` (Linux), kill 之后重跑
2. 网络问题 — mmx API 慢或掉线, 重跑 (已成功的卡会被跳过)
3. Prompt 触发敏感词 — 找到具体哪几张, 跳过或者手写 (`handwrite-history.mjs` 的方式)

### "我想加新种类的卡 (e.g. 第 13 种 kind)"

需要改 3 个地方:

1. `src/lib/types.ts` — `CardKind` union 添加新成员
2. `prompt-template/categories/<new-kind>.md` — 写新分类模板
3. `scripts/build-prompt.mjs` — `KIND_ALIASES` (如果 slug 不一样) + `KIND_DISPLAY` 加新 key

**不需要** 改 16 个 scripts 里的任何一个 — 他们都用 `CardKind` 而非 hard-coded list。

---

## Appendix A: 脚本依赖图

```
                        ┌─────────────────────────────┐
                        │  data/cards.json (initial)  │
                        └──────────────┬──────────────┘
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            │                          │                          │
            ▼                          ▼                          ▼
   ┌────────────────┐         ┌─────────────────┐        ┌────────────────┐
   │ fix-descriptions│         │  draft-history   │        │ handwrite-history│
   │  (空 description)│         │  (AI 历史草稿)   │        │  (9 张手写覆盖) │
   └────────────────┘         └────────┬────────┘        └────────┬────────┘
                                       │                          │
                                       └─────────────┬────────────┘
                                                     │
                                                     ▼
                                          ┌─────────────────────┐
                                          │   draft-extras      │
                                          │  (quote + trivia)   │
                                          └──────────┬──────────┘
                                                     │
                                                     ▼
                                          ┌─────────────────────┐
                                          │   draft-sources     │
                                          │  (2-4 中文来源)     │
                                          └──────────┬──────────┘
                                                     │
                                                     ▼
                                          ┌─────────────────────┐
                                          │   add-cross-tags    │
                                          │  (跨切分类标签)      │
                                          └──────────┬──────────┘
                                                     │
                                                     ▼
                                          ┌─────────────────────┐
                                          │   add-coords        │
                                          │  (12 张 lat/lng)    │
                                          └──────────┬──────────┘
                                                     │
                                                     ▼
                                          ┌─────────────────────┐
                                          │   enrich-mentions   │
                                          │  (知识图谱交叉引用)   │
                                          └──────────┬──────────┘
                                                     │
                                                     ▼
                                          ┌─────────────────────┐
                                          │   add-myth-fact     │
                                          │  (10 张手写 myth+fact)│
                                          └──────────┬──────────┘
                                                     │
                                                     ▼
                                          ┌─────────────────────┐
                                          │  backdate-timeline  │  ← 一次性, 拒绝重跑
                                          └──────────┬──────────┘
                                                     │
                                                     ▼
                                          ┌─────────────────────┐
                                          │  reencode-full-webp │  ← 一次性, 拒绝重跑
                                          └─────────────────────┘

旁路:
  log-revision <slug> "summary" [fields]    ← 任意时候手工触发, 不在上面 pipeline 里
  build-prompt <topic> <kind> [--version]   ← 不改 cards.json, 只读 prompt-template
```

---

## Appendix B: 与 wizard 的关系

`scripts/build-prompt.mjs` 是 wizard 的**唯一 prompt 来源**:

```
用户 → /create wizard → POST /api/generate
                          ↓
                  route.ts: buildPromptViaScript(topic, kind)
                          ↓
                  child_process.execFile('node', ['scripts/build-prompt.mjs', topic, kind, '--version', PROMPT_VERSION, '--quiet'])
                          ↓
                  scripts/build-prompt.mjs reads prompt-template/*.md (or inline v1)
                          ↓
                  stdout → matrix_generate_image MCP call
```

`PROMPT_VERSION` env 控制 wizard 走哪个模板:
- 默认 / `v2`: file-archived (curated)
- `v1`: inline legacy

CLI 用户跟 wizard **共用同一条线** — `node build-prompt.mjs 三星堆 history > prompt.md` 出来的字符串跟 wizard 生成时用的字符串**逐字节相同**。

---

## Appendix C: Round 23 audit summary (历史背景)

2026-06-16 对 8 个脚本做了 audit, 加了 3 类保护:

| 类别 | 脚本 | 加了什么 |
|---|---|---|
| Drift detection | `add-myth-fact`, `add-coords`, `handwrite-history` | 末尾打印 hard-coded slug not found warning |
| Idempotency guard | `backdate-timeline`, `reencode-full-webp` | 已运行过 → exit 1, 不静默重跑 |
| Input validation | `draft-history --limit` | 拒绝 0 / 负数 / NaN |
| 其它质量 | `draft-sources` | 丢弃非 https url, 避免 broken-link |
| 其它质量 | `fix-descriptions` | 加 success/fail 计数器 |
| 其它质量 | `draft-extras` | header 注释修正 (是 2 fields, 不是 3) |
| Header | `resize-cards` | 加 DEPRECATED 注释 + 替代方案链接 |

这些 fix 的设计思路写进 [AGENTS.md §Round 23](../AGENTS.md#round-23-scripts-audit-pass-2026-06-16) 和 memory。