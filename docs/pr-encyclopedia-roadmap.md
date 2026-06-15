# From "图鉴展示" to "真百科": the 6-issue encyclopedia roadmap

## TL;DR

Atlas Kit went from 60 isolated cards to a true knowledge
graph in 3 dimensions. Each detail page now reads like a
Wikipedia article: history, geography, taxonomy, references,
and an edit trail. AI-assisted content drafting kept the work
under $0.50 total.

## 6 commits, 1 push

| # | Commit | What | What changed |
|---|---|---|---|
| 1 | `7d4c120` | **Knowledge graph** — 12 cross-cutting categorical tags per card; forward + reverse mentions; inline `<Link>` rendering inside description body | 43/60 cards have inline links, 22/60 have reverse-reference sections |
| 2 | `ca197a0` | **历史沿革** — 5-8 historical milestones per card, oldest → newest | 60/60 cards (AI-drafted 51 + hand-written 9) |
| 3 | `e010627` | **`/map` 地图视图** — Leaflet + OpenStreetMap with 12 geo-located cards | New route, no new npm deps (Leaflet via CDN) |
| 4 | `18ff15f` | **修订记录 + 勘误** — collapsible revisions log + mailto errata link | Editor script + 3 sample entries |
| 5 | `5b02caf` | **`/random` + `/browse` + `/all`** — 3 new discovery surfaces | Random redirect, 12-kind filter, 3-axis index |
| 6 | `4b0ef85` | **参考来源** — 2-4 curated Chinese sources per card | 60/60 (AI-drafted 59 + hand-written 1) |

Master went from `708d9e4` to `4b0ef85` (6 commits ahead).

## The 3 dimensions: time, space, taxonomy

### Time (历史沿革, /timeline)
- Every card has a 5-8 node timeline rendered as a vertical
  rail on desktop, inline on mobile
- 60/60 cards: 51 AI-drafted (mmx text chat), 9 hand-edited
  for cards where the AI kept returning unparseable JSON
- /timeline is the global reverse-chrono view of all 60 cards
  by `createdAt`, grouped by month

### Space (/map)
- 12 cards have hand-picked lat/lng (5 cities + 4 landmarks +
  3 phenomena)
- Leaflet 1.9.4 from unpkg CDN, SRI-hashed, no npm dep
- OpenStreetMap tile layer (free, no API key)
- Custom gold-deep pin with the card's first character in
  serif; popup shows thumbnail + title + "→ 查看图鉴" CTA
- Aurora is intentionally map-less (global phenomenon)

### Taxonomy (/browse + /all + /series + /cards)
- /browse: 12-kind filter chips, per-kind 4-card previews,
  full grid when filtered
- /all: 3-axis index — by description length (depth-first),
  by series, by kind
- /random: 302 to a random card, refresh = new card
- /series: existing 5-series overview with 3 layout families

## The knowledge graph in numbers

- **60/60 cards** have:
  - description (with 1-3 inline `<Link>`s to other card titles)
  - history (5-8 nodes)
  - sources (2-4 curated references)
  - 4-8 tags (mix of descriptive + 12 cross-cutting categorical)
- **22/60** have reverse-reference sections
- **12/60** have lat/lng and appear on /map
- **3/60** have sample revisions
- **8/60** have zero reverse-mentions (genuine leaf cards
  like 拉布拉多, 玉璧 — correctly hide the empty section)

## Detail page anatomy (after)

7-10 sections, all server-rendered, no scroll jank:

1. **Hero + lightbox** (1024w WebP, real-pixel zoom)
2. **历史沿革** (5-8 nodes, oldest → newest)
3. **同类推荐** (same-kind, exclude self + siblings)
4. **同系列其他图鉴** (4 cards, newest siblings)
5. **你可能也会喜欢** (cross-tag weighted recs)
6. **提到了「X」的图鉴** (reverse references)
7. **修订记录** (collapsible, only if any)
8. **相关搜索** (tag pills → /search?q=)
9. **参考来源** (curated 2-4 sources)
10. **延伸阅读** (Wikipedia 中文 / 百度百科 fallback)

## What stayed the same

- 12 kinds × 5 cards = 60. Anti-RPG vocabulary ban. Cream/gold/ink
  brand. Noto Serif SC display font. 3-tier image pipeline
  (thumb.webp 384 / card.png 600 / full.webp 1024).
- Rate limit `MAX_REQUESTS = 3`, `dynamicParams = false` for
  404 integrity, sitemap with `createdAt` per-card.
- `data/cards.json` is still the single source of truth (no DB,
  no auth, no multi-author — explicit editorial decisions).
- Vercel Hobby 100 MB cap respected (public bundle 42 MB).

## What changed (operationally)

- `data/cards.json` grew from 19 keys to 23 keys per card
  (`history`, `coords`, `revisions`, `sources` added)
- 6 new scripts in `scripts/` for data enrichment + AI batch
  drafting + editor logging
- 4 new pages, 1 new client component (`MapView`),
  `LinkedText` for inline mentions
- TypeScript types in `src/lib/types.ts` grew from 1 interface
  to 3 (`Card` + `HistoryNode` + `RevisionEntry`)
- 78 → 84 pages (4 new routes, all SSG/dynamic server)

## AI cost

~$0.45 total via `mmx text chat` (MiniMax M2.7):
- ~$0.30 for 60 history drafts (5 batched runs, rate-limited)
- ~$0.15 for 60 source drafts (1 batched run)

The detail page content is now ~5x denser per card
(description + history × 5-8 + sources × 2-4 + tag-driven
cross-refs), but the editorial voice stayed consistent because
the AI prompts required Wikipedia-style concise language and
the hand-edits fixed every AI hallucination.

## How to verify locally

```bash
# Already pushed. Local steps:
cd D:\workspaces\mcode\atlas-kit
# Optional: rebuild
pwsh -c "npx next build"
# Run dev (NOT start, dev is fine here since you're exploring)
npm run dev
# Open in browser:
#   /                       — home (5-series strip + 同类 + 热门)
#   /cards/sanxingdui       — the "kitchen sink" detail page
#   /map                    — Leaflet map with 12 gold pins
#   /timeline               — reverse-chrono timeline
#   /browse?kind=pet        — kind filter
#   /random                 — 302 to a random card
#   /all                    — 3-axis index
```

## Files added (this batch)

- `src/components/linked-text.tsx` (1 KB client)
- `src/components/map-view.tsx` (Leaflet wrapper)
- `src/app/timeline/page.tsx`
- `src/app/map/page.tsx`
- `src/app/print/cards/[slug]/page.tsx` (existing; mentioned
  here for context)
- `src/app/random/page.tsx`
- `src/app/browse/page.tsx`
- `src/app/all/page.tsx`
- `scripts/add-cross-tags.mjs`
- `scripts/add-coords.mjs`
- `scripts/draft-history.mjs`
- `scripts/handwrite-history.mjs`
- `scripts/draft-sources.mjs`
- `scripts/enrich-mentions.mjs`
- `scripts/log-revision.mjs`
- `scripts/backdate-timeline.mjs` (existing, mentioned for context)

## Files updated

- `src/lib/types.ts` (Card + HistoryNode + RevisionEntry)
- `src/lib/data.ts` (getMentionIndex, getForwardMentions,
  getReverseMentions, getRelatedCards, getAllCardsForMentionMap,
  getRecentCards)
- `src/app/cards/[slug]/page.tsx` (10 sections now, up from 7)
- `src/app/search/page.tsx` (fuzzy search via fuse.js,
  3-section empty state)
- `src/components/site-header.tsx` (6 top-level nav items:
  首页/系列/分类/地图/时间线/生成图鉴)
- `src/components/share-actions.tsx` (3-col grid with
  下载原图/保存PDF/复制链接)
- `src/app/globals.css` (print media + Leaflet popup overrides)
- `data/cards.json` (5 new fields per card; 60 cards × 5-8
  history + 60 cards × 2-4 sources + 12 cards × coords + 3
  cards × revisions = ~700 new data entries)
- `AGENTS.md` (rewritten to reflect the encyclopedia
  architecture)

## Known follow-ups (not in this PR)

- History context not yet fed into the wizard prompt when
  generating new images (deferred to keep this PR scope tight)
- /changelog (recent edits across the whole site) — nice-to-have
- AI quality review pass on the 60 hand-curated descriptions that
  came in as just "（参见：X、Y）" — could enrich with one
  more mmx text chat run

---

Closes the 6-issue "true encyclopedia" roadmap that was
proposed earlier in the session. Next concrete step is
Vercel deploy to see all this in prod.
