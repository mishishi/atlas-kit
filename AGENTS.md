# Atlas Kit · 图鉴社 — Project Memory

> **TL;DR**: A 60-card visual encyclopedia in 3 dimensions (time, space,
> taxonomy). Editorially curated, AI-assisted content, ship-fast
> side-project cadence. Anti-RPG positioning — no rarity/levels/SSR,
> only "this card is referenced by these other cards."

## Production deploy checklist (must do before deploy)

- [x] **Rate limit**: `src/lib/rate-limit.ts` has `MAX_REQUESTS = 3`
      (restored 2026-06-15 in commit `756e534`). The previous value
      (9999) was for batch-running the 60 placeholder cards and
      must not ship to production.
- [x] **404 status**: `/cards/[slug]` and `/series/[slug]` have
      `export const dynamicParams = false` so unknown slugs return
      a real 404 (was 200 pre-`756e534`).
- [ ] **Env vars on Vercel** (see `docs/vercel-deploy.md` for full
      walkthrough):
      - `SITE_URL` = your production URL (e.g. `https://atlas-kit.vercel.app`)
      - `IMAGE_PROVIDER` = `matrix` (recommended) or `openai`
      - `MAVIS_DAEMON_URL` = daemon endpoint reachable from Vercel
        (Cloudflare Tunnel recommended for personal projects)
      - `NEXT_PUBLIC_SITE_URL` = same as `SITE_URL` but exposed to
        client (used by errata mailto link to include a permalink)
      - `NEXT_PUBLIC_SITE_AUTHOR_EMAIL` = author email shown in the
        "发现错误? 告诉我们" mailto link on every detail page
- [ ] **Post-deploy smoke test**: 10 routes, expect 8× 200 + 2× 404
      (the 2 unknowns at `/cards/this-does-not-exist` and
      `/series/this-does-not-exist`).

## Routes (13 page-level + 1 print namespace + 1 API)

| Route | Type | Purpose |
|---|---|---|
| `/` | Static | Home — hero collage + 5 series strip + 同类 + 热门 |
| `/series` | Static | 5 series overview with 3 layout families rotated |
| `/series/[slug]` | SSG (5) | Per-series hero + cards grid |
| `/cards` | Static | All 60 cards in a 5-col grid with kind filter |
| `/cards/[slug]` | SSG (60) | Detail page — 7+ sections, the encyclopedia entry |
| `/create` | Client | 4-step wizard (topic+kind → series → palette → generate) |
| `/timeline` | Static | Reverse-chrono timeline grouped by month |
| `/map` | Static | Leaflet+OSM with 12 geo-located cards |
| `/browse` | Server | 12-kind filter chips + per-kind preview grids |
| `/all` | Static | 3-axis index: by length / by series / by kind |
| `/random` | Dynamic | 302 redirect to a random card |
| `/search` | Server | Fuse.js fuzzy search + empty-state sections |
| `/about` | Static | Project narrative + contributor info |
| `/print/cards/[slug]` | SSG (60) | A4 print view; Cmd+P → "Save as PDF" |
| `/api/generate` | Dynamic | Wizard backend (matrix image gen via mavis daemon) |

**7 detail-page sections** (in order, all server-rendered):

1. **Hero + lightbox** (with 1024w WebP full image)
2. **历史沿革** (5-8 timeline nodes, oldest → newest)
3. **同类推荐** (same-kind, exclude self + siblings)
4. **同系列其他图鉴** (same-series, exclude self)
5. **你可能也会喜欢** (weighted score on cross-cutting tags)
6. **提到了「X」的图鉴** (reverse references, where text mentions this)
7. **修订记录** (collapsible revisions log) ← only if any revisions
8. **相关搜索** (tag pills)
9. **参考来源** (curated 2-4 sources per card)
10. **延伸阅读** (Wikipedia 中文 / 百度百科 fallback)

## Card schema (data/cards.json)

```ts
interface Card {
  slug: string;          // English kebab-case (labrador-retriever)
  title: string;         // Chinese display name
  kind: CardKind;        // pet / animal / plant / city / person / festival
                         //   / food / phenomenon / history / object / tech / other
  series: string;        // pet-breed-guide / wild-fauna-atlas /
                         //   city-encyclopedia / festival-almanac / atlas-miscellany
  seriesNo: string;      // "001" - "999" within the series
  palette: [bg, accent, secondary];  // hex strings
  image: string;         // /cards/<slug>-card.png (600w)
  image_thumb?: string;  // /cards/<slug>-thumb.webp (384w)
  image_full?: string;   // /cards/<slug>-full.webp (1024w, lightbox)
  score: number;         // 0-10 editorial rating
  tags: string[];        // 4-8 tags; cross-cutting categorical ones
                         //   (中国 / 古代 / 江南 / 哺乳 / ...) are AI-added
  tagline: string;       // short Chinese hook
  subtitle: string;      // comma-separated theme phrases
  description: string;   // 1-3 sentence description, with inline <Link>s
                         //   to other card titles that appear in the text
  createdAt: string;     // ISO date
  history?: HistoryNode[];  // 5-8 entries: {year, title, body}
  coords?: { lat: number; lng: number };  // 12/60 cards
  revisions?: RevisionEntry[];           // 3/60 cards (sample entries)
  sources?: Array<{title, url, type}>;   // 2-4 per card
}
```

## Image tier conventions (3 tiers, 60/60 cards)

| Field | Source | Size | Use |
|---|---|---|---|
| `image_thumb` | `<slug>-thumb.webp` | 384w WebP | Card grid + list views (~50 KB) |
| `image` | `<slug>-card.png` | 600w PNG | Detail hero + series cover (mid-quality, ~350 KB) |
| `image_full` | `<slug>-full.webp` | 1024w WebP | Lightbox modal + download (pixel-real zoom, ~310 KB) |

**Total public bundle: 42 MB** (well under Vercel Hobby 100 MB cap).

**History**: The original `resize-cards.mjs` had a bug
(`withoutEnlargement: true` skipped the 1536→1024 downsize), so
-full.png ended up 1536w @ 5.5 MB each. `reencode-full-webp.mjs`
(2026-06-16) is the real fix: re-encoded 60 -full.png → 1024w WebP
q90 → 19 MB total.

## Knowledge graph (issue 1/6 — 知识图谱)

The site is no longer 60 isolated cards — it's a graph.

- **Cross-cutting tags**: 12 categorical axes (中国 / 古代 / 江南 /
  哺乳 / 植物 / ...) added to every card by
  `scripts/add-cross-tags.mjs`. Top frequencies: 中国 44,
  古代 17, 全球 15, 文化 15, 江南 7.
- **Forward mentions**: every card's `description` / `tagline` /
  `subtitle` text is scanned at request time for other card titles
  (`getMentionIndex()` in `src/lib/data.ts`). 43/60 cards have ≥1
  forward mention, 22/60 have ≥1 reverse.
- **Inline links**: `LinkedText` client component wraps matches
  in `<Link>` to the other card's detail page.
- **Reverse references**: "提到了「X」的图鉴" section on the
  detail page, capped at 8 cards, newest first.
- **Enrichment**: `scripts/enrich-mentions.mjs` adds
  "（参见：X、Y）" cross-refs to 42/60 card descriptions that
  lacked organic cross-references.

## History / map / revisions / sources (the 6-issue roadmap)

| Issue | Commit | What |
|---|---|---|
| 1. 反向引用 + 内链 | `7d4c120` | Knowledge graph (above) |
| 2. 历史沿革 | `ca197a0` | 5-8 history nodes per card, AI-drafted + hand-edited |
| 3. /map 地图视图 | `e010627` | 12 geo-located cards, Leaflet+OSM |
| 4. 修订历史 + 勘误 | `18ff15f` | Collapsible revisions log + mailto errata link |
| 5. /random + /browse + /all | `5b02caf` | 3 new discovery routes |
| 6. 参考来源 | `4b0ef85` | 2-4 curated Chinese sources per card |

AI drafting cost: **~$0.45 total** via `mmx text chat` (MiniMax M2.7).

## Image AI prompt conventions

- `src/app/api/generate/route.ts` calls matrix_generate_image via
  the mavis daemon (skips mavis CLI, calls daemon HTTP directly —
  see MEMORY entry for the full lesson).
- Prompt template uses the title + kind + series + palette.
  History context is NOT yet fed into the prompt (deferred to a
  future issue).
- All output files use `<slug>.png` (English slug, not Chinese
  topic). Wizard upsert is by English slug.

## Wizard filename convention

- Output files written to `public/cards/<slug>.png` (English slug).
- The 60 placeholder cards.json entries all use English slugs
  (labrador-retriever, hangzhou, peking-duck, ...).
- Wizard upsert is by English slug. Re-running the wizard for any
  existing card updates its image only; new topics fall back to a
  hash slug (card-xxxxxx) and are appended.
- SLUG_TABLE in `src/app/api/generate/route.ts` (60 entries) must
  stay in sync with the slugs in `data/cards.json`.

## 60-card plan (kind × 5)

12 kind × 5 cards. Series assignment:

- pet (5)         → pet-breed-guide
- animal (5)      → wild-fauna-atlas
- city (5)        → city-encyclopedia
- festival (5)    → festival-almanac
- everything else (35) → atlas-miscellany

## Dev server quirks

- `next build` overwrites `.next/` so dev server's HMR chunk cache
  becomes stale. After running `next build`, always restart dev:
  `Ctrl+C` + `npm run dev` + hard-refresh the browser. If you skip
  this, you get 6+ chunk 404s (`main-app.js`, `app-pages-internals.js`,
  `chunks/app/page.js`, etc.) and a blank page.
- `/opengraph-image` returns 502 in dev mode (edge runtime can't read
  filesystem in dev's data-collection phase). In `next build` +
  `next start` production mode it's fine.
- `app/api/*/route.ts` changes do NOT hot-reload. Always restart dev
  after editing API routes, even if the page HMR looks fine.
- `/cards/[slug]/page.tsx` changes do NOT auto-hotreload the data
  fields rendered in HTML (e.g. `description` rendering with new
  `LinkedText` markup). Always hard-refresh.
- mmx CLI on Windows is a `.ps1` shim, not an `.exe`. Node
  `child_process.execFile` must use `powershell.exe -File` to invoke
  it. Don't `spawn("mmx")` — it returns ENOENT.

## Design system references

- `docs/design-review-2026-06-14.md` — full taste-skill review with
  per-page findings and 12 fix commits (8 fix + 1 doc + 3 minor).
- `docs/vercel-deploy.md` — Vercel deploy walkthrough.
- Brand: warm cream + gold + ink + Noto Serif SC display (editorial
  override on the "no serif default" taste-skill rule).
- Anti-RPG: no 稀有/星级/史诗/SSR/雷达图 vocabulary anywhere in
  copy or visuals.
- 12 kinds × 5 cards = 60; 5 series (pet-breed-guide /
  wild-fauna-atlas / city-encyclopedia / festival-almanac /
  atlas-miscellany).
- Print styles (@media print in globals.css) flip to white bg +
  ink text so PDFs print cleanly on white paper. Site chrome
  (header/footer/nav) hidden in print.

## Scripts (in `scripts/`)

**Data enrichment (run once, idempotent)**:

- `add-cross-tags.mjs` — adds 跨切分类标签 (中国/古代/江南/...)
  to all 60 cards. Idempotent (dedup on insert).
- `add-coords.mjs` — hand-picked lat/lng for 12 geographic cards.
- `draft-history.mjs` — AI batch drafter for history nodes via
  `mmx text chat`. Skips cards that already have `history`.
  Persists after each success (timeout-safe).
- `handwrite-history.mjs` — curated backup for cards the AI
  couldn't draft (9 cards; 三星堆, 三体, 杜甫, 清明, etc.).
- `draft-sources.mjs` — AI batch drafter for sources via
  `mmx text chat`. 2-4 Chinese sources per card.
- `enrich-mentions.mjs` — appends "（参见：X、Y）" cross-refs
  to 42/60 card descriptions that lacked organic cross-mentions.
- `log-revision.mjs <slug> <summary> [fields]` — editor tool to
  append a revision entry to a card's `revisions` array. Run
  after any hand-edit to a card's text content.
- `reencode-full-webp.mjs` — sharp 1536w PNG → 1024w WebP q90
  re-encoder. Keeps the static bundle under the 100 MB Vercel
  Hobby cap.
- `resize-cards.mjs` — initial 3-tier sharp resize. Kept for
  reference; current files are re-encoded by reencode-full-webp.

**Backfill**:

- `backdate-timeline.mjs` — distributes 30 cards across May 2026
  so the /timeline page has visual variety. Run once.
- `restore-image-full.mjs` — inverse of rewrite-image-full.mjs.
  Re-points cards.json `image_full` to `-full.webp`.

**Legacy / superseded**:

- `rewrite-image-full.mjs` — set `image_full = image` (600w) as
  a band-aid when the 5.5 MB -full.pngs were deleted. Now
  superseded by `reencode-full-webp.mjs`. Kept for reference.
- ~~`run-60.mjs`~~ — one-off batch image generator (deleted).
- ~~`retry-4.mjs`~~ — one-off retry (deleted).
- ~~`sample-gen.mjs`~~ — one-off sample (deleted).

## Post-deploy: tell the user how to play with the new features

1. Open any `/cards/<slug>` (e.g. `/cards/sanxingdui`).
2. Hero image — click → lightbox with 1024w zoom, no browser scrollbar
3. Scroll down — find 历史沿革, 同类推荐, 同系列, 你可能也会喜欢,
   提到了「X」, 修订记录 (折叠), 相关搜索, 参考来源, 延伸阅读
4. Try `/map` (12 gold pins, client-side search, 0-coord fallback),
   `/timeline`, `/cards` (per-kind preview by default), `/all` (3
   distinct layout families), `/random`
5. Edit a card's description in data/cards.json, then
   `node scripts/log-revision.mjs <slug> "summary"` to record
   the change

## Round 13: /all view 2 polish (2026-06-16)

Commit `bcfa9cd`. 5 fixes from a single-page impeccable audit
(Health Score 14/20 → addressed 3 P1 + 2 minor):

- **A1 border-stripe ban**: removed `border-left: 3px` colored accent
  on series bento cards (impeccable: "never intentional on cards").
  Replaced with 8px accent dot + accent-colored h3 text.
- **A2 dark-mode palette hardcoding**: `bg = palette[0]` (#FAF3E9 cream)
  was invisible in dark mode. Now uses theme-aware `bg-muted` token;
  accent hex (#C97064 / #6B8294 / etc.) is mid-saturation so it reads
  in both modes.
- **A3 touch target**: View 1 list links went from ~32px to `min-h-[44px]`.
  Round 8 already fixed chip targets, but list-style links slipped.
- **B1 aria-label**: count badge now `aria-label="{n} 张图鉴"` so SR
  reads "3 张图鉴" instead of ambiguous "3 张".
- **C1 em-dash**: "按篇幅、按系列、按类型" replaced " — " with "：".

1 finding deferred (P2, mobile weight imbalance View 2 vs View 1+3 —
  cosmetic only, doesn't fail any audit dimension).

**Smoke-test note**: Windows Bash tool timeout kills backgrounded
`next start` (even with `Start-Process -WindowStyle Hidden` which
trips a permission gate on classifier unavailable). Build-pass +
manual diff read is the practical verification path.

## Round 8: design audit (2026-06-16)

`docs/design-audit-2026-06-16.md` is the full taste-skill +
ui-ux-pro-max review (5 critical + 8 important + 7 nice-to-have
findings, 4.0/5 overall). All 20 findings fixed in a single
commit `3bb29b6` (19 files, +989/-427 lines).

## Round 9: myth/fact (2026-06-16)

10 cards now have a hand-written `myth` + `fact` micro-block
sitting next to the 轶事 block in the detail page info panel.
M2.7 (mmx text chat) couldn't reliably return a structured
myth/fact pair in Round 7, so we hand-wrote these. See
`scripts/add-myth-fact.mjs` for the data + source notes.

The 10 cards: qingming, longjing-tea, forbidden-city, sanxingdui,
xian, dragon-boat, abacus, suzhou-gardens, labrador-retriever,
qiantang-tide.

## Current route inventory (post-Round 8 + 9)

- 14 page-level routes: `/`, `/series`, `/series/[slug]` (5),
  `/cards`, `/cards/[slug]` (60), `/create`, `/timeline`, `/map`,
  `/all`, `/random`, `/search`, `/about`, `/not-found`
- 1 print namespace: `/print/cards/[slug]` (60 SSG routes)
- 1 API: `/api/generate`
- 1 deprecated: `/browse` → 308 redirect to `/cards`
- 1 edge: `/opengraph-image`

## Card schema (post-Round 9)

```ts
interface Card {
  slug, title, kind, series, seriesNo, palette[3],
  image, image_thumb?, image_full?, score,
  tags[], tagline, subtitle, description, createdAt,
  history?: HistoryNode[],        // 60/60
  coords?: { lat, lng },          // 12/60
  revisions?: RevisionEntry[],    // 3/60 (samples)
  quote?: string,                 // 60/60
  trivia?: string,                // 60/60
  myth?: string,                  // 10/60 (hand-written)
  fact?: string,                  // 10/60 (hand-written)
  sources?: Array<{title, url, type}>,  // 60/60
}
```
