# Atlas Kit · 图鉴社 — Project Memory

> **TL;DR**: A 60-card visual encyclopedia in 3 dimensions (time, space,
> taxonomy). Editorially curated, AI-assisted content, ship-fast
> side-project cadence. Anti-RPG positioning — no rarity/levels/SSR,
> only "this card is referenced by these other cards."

## Hard Rules · 不可违反

These rules are **non-negotiable**. Any AI assistant (including me)
working on this repo MUST follow them. They exist because the user
has editorial standards that, once violated, can't be undone by
saying sorry.

### H1. Prompt templates are read verbatim, never rewritten

**The rule** (also stated in `prompt-template/README.md`):

> 生成图片时必须直接使用归档 prompt 文件的完整原文。
> 不要压缩、摘要、删减、改写、重新组织或临时追加说明。
> 如果需要改 prompt, 先重新生成并覆盖归档文件, 再用新文件生成图片。

**What this means in practice**:

| Action | Allowed? |
|---|---|
| `node scripts/build-prompt.mjs <topic> <kind>` and send stdout to the model | ✅ |
| Reading `prompt-template/main-template.md` + `categories/<kind>.md` verbatim and concatenating | ✅ |
| Editing `prompt-template/main-template.md` or any `categories/*.md` to a new (better) version | ✅ (if you also commit the change) |
| Rewriting the prompt text in code (`buildPrompt()`, `composePrompt()`, etc.) to "improve" it | ❌ |
| Adding a prefix/suffix at call site (e.g. "请用 9:16 比例:" + the template) | ❌ |
| Stripping "redundant" sections (e.g. dropping the 防翻车 block) | ❌ |
| Compressing multiple bullet points into one sentence to save tokens | ❌ |
| Generating the prompt inline in a chat reply because it's "easier" than reading the file | ❌ |

**Why**: the user spent hours hand-curating these templates for
specific aesthetic output. A paraphrase might look equivalent but
produces visibly different images. The whole point of the
`prompt-template/` archive is that it is the **single source of
truth** — both the wizard (`/create` → `/api/generate`) and the
CLI user (`node scripts/build-prompt.mjs 三星堆 history`) read
from the same file, byte for byte.

**How to change a prompt**:

1. Edit `prompt-template/main-template.md` and/or
   `prompt-template/categories/<kind>.md` directly. Be deliberate;
   even a rephrased sentence can shift the image output.
2. Save the file. The change is now the new source of truth.
3. (Optional but recommended) Run the wizard or CLI on a sample
   topic and inspect the image to confirm the change has the
   intended effect.
4. Commit. The next wizard invocation picks up the new template
   automatically — no code change, no rebuild.

**If the script's slot-placeholder detection fires**: the template
format drifted from what `scripts/build-prompt.mjs` expects
(e.g. someone added a new `【slot】` placeholder). The script
**must bail out**, not silently send a half-filled prompt to the
model. Fix the template and/or the script — never disable the
guard.

See [§ Round 24](#round-24-build-promptmjs-as-single-source-of-truth-2026-06-16)
for the full rationale, the v1/v2 versioning, and the wizard
wiring details.

### H2. Anti-RPG positioning (already in TL;DR, restated for emphasis)

- Never use: 稀有 / 星级 / 史诗 / 传奇 / SSR / 战力 / HP / 攻击力 /
  防御力 / 雷达图 / 五维属性图
- Recommended: 高/中/低 labels, comparison bars, geographic
  distribution, historical timeline, factual quotes.
- Visual anti-pattern: "快速评分卡" panels, attribute grids, level
  badges. See `prompt-template/categories/*.md` "防翻车规则"
  sections for category-specific enforcement.

### H3. Card data is the canonical store of content

- All text (description / tagline / subtitle / quote / trivia /
  history / sources / myth / fact) lives in `data/cards.json`. Do
  NOT duplicate this text in components — read from `cards.json`
  via `src/lib/data.ts` helpers.
- Image paths (`image`, `image_thumb`, `image_full`) also live in
  `cards.json`. Components read the path; they do not hard-code
  filenames.
- Adding a new card field: update the `Card` interface in
  `src/lib/types.ts` FIRST, then add data, then update consumers.
  TypeScript will tell you what breaks.

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

## Round 14: /series tab + /about em-dash (2026-06-16)

Commit `cc921f4`. Two minor audits back-to-back:

- **`/series` tabs touch target**: `px-4 py-2` measured ~36px tall,
  below WCAG 2.5.5 44px minimum. Bumped to `min-h-[44px] py-3` in
  `series-detail-tabs.tsx`. Same a11y pattern as Round 8's chip fix.
- **`/about` em-dash**: line 17 "主视觉、…、健康风险 — 9 个模块"
  replaced " — " with comma + new sentence. Project's Round 8
  I1 fix already dropped the eyebrow, this just polishes the body.

No new audit findings beyond these two — `/series` and `/about`
both pass the 5-dimension scan (A11y / Theming / Responsive /
Anti-pattern / Performance).

## Round 17: CardPreview "新收录" hydration (2026-06-16)

Commit `c1267a4`. After all 14 page-level surfaces passed audit, I
started auditing the shared components (the 4 used in 60+ places:
`CardPreview`, `Lightbox`, `HeroWithLightbox`, `Tag`). First pass
on `CardPreview` caught one P3: the "新收录" badge uses
`Date.now() - new Date(card.createdAt).getTime() < 86400000`. This
runs once at SSR (server clock) and again at hydration (client
clock), and the two can drift — silently flipping the badge on/off
across the boundary, with no React warning to catch it.

Fix: `suppressHydrationWarning` on the badge span. We accept the
rare flash (when the boundary lands within the 24h window AND
server/client time has drifted) as the cost of keeping
`CardPreview` a server component. Moving the badge to a client
sub-component would re-hydrate all 60 cards on the grid pages,
which is a much bigger cost than a once-per-page badge flicker.

Verified: build clean, no size regression. Pushed to master.
PR #1 branch left stale (`1297617`) since the PR is already
MERGED — branch ref is informational only.

## Round 18: MapView popup theme + dead code (2026-06-16)

Commit `9a120e8`. Continuing the shared-component audit, second pass
on `MapView` (12 markers, Leaflet via CDN). Found:

- **P2 dark-mode popup text contrast**: `buildPopupNode` set
  inline `color: #2e2a24` / `#6f6a5e` / `#87603f` on the popup
  content. The popup wrapper bg uses `hsl(var(--background))` and
  flips on theme change (light cream ↔ deep charcoal), but the
  inner text stayed near-black, crashing contrast in dark mode.
  Fix: dropped inline colors, added className hooks
  (`atlas-popup-thumb` / `-title` / `-sub` / `-cta`), added CSS
  in `globals.css` that uses `--foreground` / `--muted-foreground`
  / `--gold-deep` so the popup text follows the theme.
- **P2 dead code `escapeAttr`**: always returned `true`, called in
  a single ternary in `buildPopupNode`. Deleted along with the
  dead `: transparent` branch.
- **P3 dead state `filteredIdsRef`**: assigned in two places, never
  read. Deleted.

This is the **third audit lens** I've used (impeccable 5-dim,
design-taste-frontend slop test, manual code review). Pattern:
each new lens catches what the others miss. The previous rounds
focused on UI/UX; this round's manual review caught a state-machine
dead code path. Lesson: when the visible polish looks done, switch
to a "code health" lens (dead code, unused state, type-narrowing,
etc.) — different category of issues.

## Round 19: Lightbox 44px touch + unmount guard (2026-06-16)

Commit `9961af0`. Third component audit pass on `Lightbox` (60
detail pages, every hero click). Found:

- **P2 mode-toggle buttons under 44px**: the 3 buttons in the
  显示模式 group (zoom-out / 重置 / zoom-in) were `min-h-[32px] /
  min-w-[32px]`, below WCAG 2.5.5 touch target. Bumped to 44px /
  44px (zoom-out/zoom-in) and 44px / 60px (reset button which
  carries the "适应" label). Same pattern as Round 14's series-tab
  fix — these slipped through that audit because the buttons are
  inside a lightbox, not a regular page.
- **P2 onLoad setState after unmount**: `Image.onLoad` calls
  `setNaturalDims` to read the real pixel dimensions for the
  'natural' zoom mode. Under React 18 strict mode (which the
  project uses in `next.config.mjs`) the component mounts /
  unmounts / mounts, and a fast unmount can fire onLoad on a
  dead instance. React 18 silently no-ops setState on unmounted
  components but logs a warning. Fix: added `openRef` tracking
  the latest `open` value, skip setState if we already closed.

The 44px fix is the third occurrence of this specific pattern
(Round 8 chips → Round 14 series tabs → Round 19 lightbox). The
lightbox one is the most subtle because the buttons look small
even at 44px due to their 1-line layout — easy to miss without a
deliberate scan.

## Round 20: SiteHeader / SiteFooter / OG sync (2026-06-16)

Commit `bd9963f`. Audit pass on the two site-wide chrome components
plus a stray bug from Round 12. Found:

- **P2 mobile nav active state weaker than desktop**: in
  `site-header.tsx` the desktop nav active item got `bg-muted`
  background but the mobile nav only got `text-foreground
  font-medium` — against 5 inactive siblings, mobile active
  barely stood out. Added the same `bg-muted` to mobile.
- **P2 footer GitHub link is a placeholder**: `href="https://github.com/"`
  pointed to the GitHub root instead of the actual repo. Fixed
  to `https://github.com/mishishi/atlas-kit`. (Vercel-deployed
  build had been serving the placeholder; confirmed by curl-ing
  /sitemap.xml earlier in this session.)
- **P2 footer mailto doesn't read env var**: hard-coded
  `hello@atlas-kit.example` (a `.example` reserved TLD that
  never delivers) and didn't match the per-card errata link
  which reads `NEXT_PUBLIC_SITE_AUTHOR_EMAIL`. Fixed to read the
  same env var with the same fallback (`atlas-kit@example.com`).
- **P2 tagline "模块信息" still in 2 places after Round 12 fix**:
  Round 12 changed "模块信息" → "信息归档" in `app/page.tsx`
  (home hero) but missed 2 stragglers:
  `components/site-footer.tsx:157` and `app/opengraph-image.tsx:86`.
  Both still said "模块信息". Fixed.

The 4th pattern: **stale values**. The codebase has accumulated
since Round 12 and 2 stragglers + a placeholder survived. The
"Vercel deploy shows placeholder" symptom earlier was the audit
trigger — without curling prod, these wouldn't have surfaced
in a code review alone.

## Round 21: ShareActions / SeriesDetailTabs (2026-06-16)

Commit `2779bd9`. Last 2 shared components on the audit list.
Found:

- **P2 ShareActions copy-link timer leak**: `handleCopyLink`
  fires `setTimeout(() => setCopied(false), 2000)`. If the user
  clicks copy then immediately navigates away (route change,
  back button), the 2s timer still fires setState on an
  unmounted component. React 18 silent no-op but logs a warning.
  Same pattern as Round 19 Lightbox onLoad guard. Fixed with
  a `mountedRef` set in `useEffect` and cleared in cleanup.
- **P2 ShareActions PDF link missing `noreferrer`**: outer-link
  to `/print/cards/[slug]` had `rel="noopener"` only; footer's
  outer-link uses `rel="noopener noreferrer"`. The `noreferrer`
  half suppresses the `Referer` header — for a same-origin link
  the practical impact is zero, but consistency matters and
  `noopener noreferrer` is the safer default. Fixed.
- **P3 SeriesDetailTabs dead `slug` prop + `displayLabel` import**:
  the `slug` prop was declared in the component interface but
  never used inside the component body. Parent
  (`app/series/[slug]/page.tsx`) was passing it nonetheless. Dropped
  the prop from both sides. The `displayLabel` import was also
  unused — dropped.

Round 21 closes the shared-component audit pass (R17 + R18 +
R19 + R20 + R21, 5 components). Every remaining component in
`src/components/` has now been reviewed on the same 5-dimension
+ manual code health + cross-round consistency lenses. The audit
list is now: 14 page surfaces ✓ · 1 API ✓ · 5 SSG families ✓ ·
9 shared components ✓.

## Round 22: handwrite-history.mjs drift detection (2026-06-16)

Commit `b68b901`. Started auditing the 15 `scripts/` files.
First pass on `handwrite-history.mjs` (10.9 KB, the largest script).
Found:

- **P3 no drift detection on hard-coded slugs**: the script
  hard-codes 9 card slugs and history nodes. If a slug is renamed
  or deleted from `data/cards.json`, the `for (const c of cards)`
  loop silently skips it — no warning. Fixed: track
  `writtenSlugs` Set and `console.warn` any hard-coded slug not
  found in cards.json.

This is a **7th audit lens**: drift detection on hard-coded
constants. The same pattern (Object.keys(map).filter not in seen
Set) is now applied to `add-myth-fact.mjs` (R23a),
`add-coords.mjs` (R23g), and the backdate-timeline idempotency
check (R23f) catches the inverse case (script already run).

## Round 23: scripts audit pass (2026-06-16)

8 commits covering 8 of 15 scripts. The remaining 7 are
either already audited (log-revision.mjs, enrich-mentions.mjs),
or are LEGACY / superseded per AGENTS.md (rewrite-image-full.mjs,
restore-image-full.mjs).

| Script | Sub-round | Fix |
|---|---|---|
| `add-myth-fact.mjs` | 23a | Drift detection (warn on missing slugs) + skip counter |
| `draft-history.mjs` | 23b | `--limit` arg validation (reject 0/negative) |
| `add-cross-tags.mjs` | — | already has drift detection, 0 changes |
| `draft-extras.mjs` | 23c | Header comment fix (was "3 fields, ~$0.50", actually 2 fields, ~$0.15; myth/fact is hand-written) |
| `enrich-mentions.mjs` | — | already idempotent via `text.includes` dedup, 0 changes |
| `draft-sources.mjs` | 23d | Drop sources with missing/non-https URL (avoid broken-link rows) |
| `fix-descriptions.mjs` | 23e | Add success/fail counters |
| `backdate-timeline.mjs` | 23f | Idempotency guard (refuse re-run without `--force`) |
| `add-coords.mjs` | 23g | Drift detection (12 hard-coded coords) |
| `log-revision.mjs` | — | simple CLI, 0 changes |
| `resize-cards.mjs` | 23h | Header comment DEPRECATED warning + link to `reencode-full-webp.mjs` |
| `reencode-full-webp.mjs` | 23h | Idempotency guard (refuse re-run when image_full already .webp) |

3 categories of fixes:

1. **Drift detection** (3 scripts): warn if hard-coded slugs
   not in cards.json. Catches future renames / deletions.
2. **Idempotency guards** (2 scripts): refuse to re-run if the
   output state already matches. Backdate and reencode-full-webp
   are both destructive (mutate dates / delete source files) so
   silent re-runs are worse than hard errors.
3. **Input validation** (1 script): `--limit` parse was loose
   (`parseInt("foo", 10)` → NaN → silently Infinity). Now
   validates and rejects with a clear error.

Plus minor: stale header comments (draft-extras, resize-cards),
broken-link prevention (draft-sources), success/fail counters
(fix-descriptions).

## Round 16: untested-pages audit (2026-06-16)

Commit `f75e2cb`. Audited the 4 page-level surfaces that earlier
rounds didn't touch: `/random`, `/` (home), `/search`, `/create`.
Scored each on the 5-dimension scan (A11y / Theming / Responsive /
Anti-pattern / Performance):

| Page | Score | Action |
|---|---|---|
| `/random` | n/a | skip (302 redirect only, no UI surface) |
| `/` (home) | 17/20 | 1 P2 fixed (hero collage a11y) |
| `/search` | 19/20 | clean |
| `/create` | 18/20 | clean |

**Home fix**: removed `aria-hidden="true"` from the hero collage
wrapping div and `alt=""` from each of the 5 collage Images. SR users
were previously unable to discover any of the 5 hero cards — the
collage is the home page's primary CTA for sighted users, so it
must be navigable by keyboard/SR. Each Link now carries
`aria-label="{title} · 精选"`; the inner Image stays decorative
(empty alt) because the parent Link already names the destination.

**Wins from this audit pass** (worth replicating in future pages):

- `/create` wizard's `aria-busy`, `aria-pressed`, `role="alert"` for
  generation errors, and `aria-labelledby` on step groups all work
  correctly — copy this pattern for any multi-step form.
- `/search` `aria-live="polite"` on result count keeps SR users in
  sync without announcing on every keystroke (it's only in the DOM
  when there's a query).

## Round 15: /changelog milestone entries (2026-06-16)

Commit `e8a2367`. The page used to only show per-card created /
revised events (63 total), which made the project look stagnant
between mass card days. Added 5 hand-curated site-wide milestones
to tell the project's actual story (5 days from MVP to polished
atlas):

- 2026-06-12: MVP 上线
- 2026-06-13: 图鉴扩到 60 张
- 2026-06-14: 首轮设计 review
- 2026-06-16: 百科化升级 (6 项 roadmap 完成)
- 2026-06-16: 连续 4 轮设计 audit

New `type: "milestone"` entry shape (in addition to "created" /
"revised"). Visual: gold-bordered card with `Sparkles` icon,
gradient `from-cream to-card` background, links to `/about` instead
of a card detail (milestones are project-level, not card-level).

Data lives in `SITE_MILESTONES` const at the top of the file.
Hardcoded because milestones are project-meta, not auto-derivable
from card data. Add more by appending to that array.

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

## Round 24: build-prompt.mjs as single source of truth (2026-06-16)

Goal: the wizard (`/create` → `/api/generate`) and the CLI
(`node scripts/build-prompt.mjs`) must read the **same** prompt
template. Otherwise the two surfaces drift (one gets edited, the
other doesn't), and a wizard A/B test against CLI output is
meaningless.

### What `scripts/build-prompt.mjs` now owns

The script is the single source of truth for prompt assembly.
It supports two versions via `--version v1|v2` (default `v2`):

- **v1** — inline 243-line hard-coded Chinese prompt, ported
  verbatim from `src/lib/prompt-templates.ts:buildPrompt()`
  (Round 24). Used for rollback and A/B comparison.
- **v2** — reads `prompt-template/main-template.md` +
  `prompt-template/categories/<kind>.md` verbatim (the curated,
  file-archived source of truth). Verifies both slot placeholders
  (`主题：【填写主题】` and the 类型 list) actually got replaced,
  bails if the template drifts from what the script expects.

### Wizard wiring

`src/app/api/generate/route.ts` now shells out to the script via
`child_process.execFile`. The `PROMPT_VERSION` env var selects
v1 vs v2:

- unset / `v2` (default) → file-archived templates
- `v1` → legacy inline template

The wizard passes `--quiet` so the script's stderr summary
doesn't leak into Next.js logs.

### Why child_process, not a shared lib

I considered putting `composePrompt(topic, kind)` into a shared
`src/lib/prompt-composer.mjs` and having both the script and
`route.ts` import it. Rejected: the script needs to be runnable
standalone (CLI users pipe it to `> prompt.md`), and Next.js's
bundler would compile any shared lib into the route bundle. With
`execFile`, the script stays a black box — `route.ts` only sees
`stdout`, and the script can be edited/replaced independently.

### `prompt-template/` archive

Added `prompt-template/main-template.md` (~8 KB) and
`prompt-template/categories/<kind>.md` × 11 files
(city/animal/pet/plant/person/festival/food/historical-event/
tech-concept/object/natural-phenomenon). Each category file is
~1.7-2.2 KB and follows a fixed 7-section shape (强调色 /
固定 8 模块 / 评分维度 / 观察区逻辑 / 可视化条带 /
一句话锚定 / 防翻车规则). `prompt-template/README.md` is the
usage rule: send file content verbatim, do not compress /
summarize / rewrite / restructure.

### `src/lib/prompt-templates.ts` after Round 24

The module still exports `getPaletteColors()` (used by
`route.ts` for `cards.json` palette writes). The `buildPrompt()`
function is **kept but @deprecated** — no longer called by the
wizard. Marked as reference only; if you edit v1, mirror the
change in `buildPromptV1()` inside `build-prompt.mjs`.

### Verification

- `node scripts/build-prompt.mjs 拉布拉多 pet` (default v2) →
  3821 bytes, main-template + pet category ✓
- `node scripts/build-prompt.mjs 拉布拉多 pet --version v1` →
  4336 bytes, legacy inline ✓
- `node scripts/build-prompt.mjs 三星堆 history` (alias
  resolution history → historical-event) → 3859 bytes ✓
- Bad kind / bad --version → exit 1 with clear error ✓
- `tsc --noEmit` clean ✓
- `child_process.execFile` smoke test (v1 + v2) → bytes match
  CLI direct invocation ✓

### How to A/B test

Set `PROMPT_VERSION=v1` in `.env.local`, run the wizard, save
the image. Set back to `v2`, run for the same topic, save the
image. Compare. The two prompts are intentionally different in
tone and detail — v1 is older and broader; v2 is the curated
"百科全书 + DK 百科全书 + 国家地理知识页" framing from the
archived files.

## Round 26: per-card directory layout (2026-06-17)

Goal: one folder per card → delete a card = delete one folder,
no orphan `-thumb.webp` left behind. New artifacts (e.g.
`<slug>-prompt.md`) live next to the generated image.

### Old vs new path shape

| | Old (flat) | New (per-card dir) |
|---|---|---|
| image | `/cards/labrador-card.png` | `/cards/pet/labrador-retriever/labrador-retriever-card.png` |
| image_thumb | `/cards/labrador-thumb.webp` | `/cards/pet/labrador-retriever/labrador-retriever-thumb.webp` |
| image_full | `/cards/labrador-full.webp` | `/cards/pet/labrador-retriever/labrador-retriever-full.webp` |
| prompt (new) | — | `/cards/pet/labrador-retriever/labrador-retriever-prompt.md` |

`{kind}` = the 12 CardKind short names (pet/animal/.../history/
tech), aligned with `cards.json`'s `kind` field directly. No
alias resolution needed.

### Migration script

`scripts/migrate-card-paths.mjs` (idempotent, dry-run by default):

```bash
node scripts/migrate-card-paths.mjs         # DRY-RUN, prints plan
node scripts/migrate-card-paths.mjs --apply # actually moves files
```

The script:
1. Reads `data/cards.json`, builds the new path for each of 60 ×
   3 = 180 image fields.
2. Validates that every old file actually exists on disk (else
   exits 1 with the missing filenames).
3. In `--apply` mode: `mkdir` 60 dirs, `rename` 180 files, rewrite
   `cards.json` with new paths.
4. Idempotent: re-running on already-migrated cards is a no-op.

### Redirects (preserve old URLs)

`next.config.mjs` `redirects()` builds 180 × 301 entries at
config-load time by reading `cards.json` (slug → kind → old path →
new path). Vercel serves these at the edge; no runtime cost. The
mapping is rebuilt on every `next build`, so adding a new card
or changing a slug auto-picks-up the new redirect.

### Wizard writes to new layout

`src/app/api/generate/route.ts` now:

1. `mkdir -p public/cards/<kind>/<slug>/` before writing the card
   image.
2. Writes `/cards/<kind>/<slug>/<slug>-card.png` (the actual CDN
   image).
3. Writes `/cards/<kind>/<slug>/<slug>-prompt.md` next to it —
   the verbatim prompt that was sent to the model (H1 rule: this
   file is exactly `prompt-template/main-template.md` +
   `categories/<kind>.md` with slots filled, no paraphrase).
4. Updates `cards.json` `image` field to the new path.

`image_thumb` and `image_full` are intentionally NOT auto-written
by the wizard — those 3-tier conversions are still done by the
separate `reencode-full-webp.mjs` + a follow-up sharp resize for
thumb (see `scripts-reference.md` §5).

### What did NOT change

- `src/lib/data.ts` — reads `cards.json` paths, no hard-coded
  paths. Works with the new layout unchanged.
- All React components (`lightbox.tsx`, `card-preview.tsx`,
  `map-view.tsx`, etc.) — read `c.image` / `c.image_thumb` /
  `c.image_full` from cards.json, no hard-coded paths.
- `next/image` sizing logic — width/height are tier-based, not
  path-based.

### Path compatibility note for `scripts/`

- `reencode-full-webp.mjs` — already idempotent, still works
  (path extraction is `/cards/`-prefix-stripped, doesn't care
  about nesting depth). Header comment updated to note the
  new layout.
- `resize-cards.mjs` — DEPRECATED, header comment updated.
- `restore-image-full.mjs` / `rewrite-image-full.mjs` — LEGACY,
  do not run.

## Round 28: prompt-template archive trim + tech→technology rename (2026-06-17)

### What broke

The v2 (file-archived) prompts in `prompt-template/` were
3821-3859 bytes per compose. The `matrix_generate_image` tool
enforces a **1500-character cap** on the prompt parameter;
anything longer fails with `status_code=2013: prompt length must
be less than 1500`. v1 (the inline 4336-byte legacy) also
overflows, so A/B rollback is broken until v1 is also trimmed.

The fix is in two parts:

### Part 1 — user-optimized `prompt-template/` archive

User re-wrote all 11 category templates + the main template
in their own words (not a code-side paraphrase — a fresh
authoring pass). New shape:

- **main-template.md**: 918 bytes (was ~3.2 KB). English
  section headers (`Style` / `Layout` / `Header` / `Summary
  Bar` / `Text` / `Failure Prevention`), Chinese values where
  Chinese reads naturally. Single accent color rule, no
  palette slot.
- **categories/<kind>.md** × 11: 605-664 bytes each (was
  1.7-2.2 KB). Same 7-section shape (Accent / Identity /
  Modules / Rating / Insets / Visualization / Failure
  Prevention) with the verbose explanations compressed to
  bullet lists.

Composed length after trim:

| Kind | Composed chars | Cap |
|---|---|---|
| pet | 1304 | ✓ |
| animal | 1352 | ✓ |
| plant | 1326 | ✓ |
| city | 1296 | ✓ |
| festival | 1325 | ✓ |
| food | 1279 | ✓ |
| phenomenon (natural-phenomenon) | 1343 | ✓ |
| history (historical-event) | 1322 | ✓ |
| object | 1317 | ✓ |
| person | 1320 | ✓ |
| tech (technology) | 1324 | ✓ |
| other (new file, was missing) | 1446 | ✓ |

All 12 kinds now compose under the 1500-char cap.

### Part 2 — script-side adaptation

`scripts/build-prompt.mjs` updated in two places to support
the new archive shape:

- **Slot format dual-support**: the new archive uses
  `Theme: [主题]` / `Category: [分类]` (English half-width
  brackets). The previous archive used `主题：【填写主题】`
  (Chinese full-width brackets). The script's slot detection
  accepts both formats so it survives archive round-trips
  (re-rolling a category file to the old shape, or a
  category file accidentally saved with the old style, won't
  silently send a half-filled prompt to the model).
- **`tech → technology` alias update**: the canonical
  `tech` CardKind is unchanged in `data/cards.json` and
  `src/lib/types.ts`, but the on-disk category file was
  renamed from `tech-concept.md` to `technology.md` for
  consistency with the noun pattern (`historical-event` /
  `natural-phenomenon` / `technology`). The script's
  `KIND_ALIASES` map was updated; the long-form key
  `"technology"` was added to `KIND_DISPLAY` so the slot
  fill resolves to the correct Chinese display name (科技概念).

### New `other` category template (filling the gap)

`prompt-template/categories/other.md` did not exist in R24-R27
even though `data/cards.json` has 5 cards with `kind: "other"`.
If the wizard ever runs on an `other` topic, the script would
fail with "Category template not found". Added in R28:

- **Accent**: `Defined by subject tradition` (same pattern as
  `festival.md` — let the topic's own visual identity drive it)
- **Identity**: `Miscellaneous or hybrid-topic encyclopedia page`
- **Modules**: 基础档案 / 概念定义 / 核心特征 / 历史脉络 / 应用领域
  / 文化背景 / 典型案例 / 快速评分卡
- **Rating**: 学术价值 / 普及程度 / 文化意义 / 时代相关性 / 跨领域影响
- **Failure prevention**: keep neutrality, don't lean toward
  specialized category styles

### Why v2-lite was rejected

A first attempt (the v2-lite idea, since reverted) tried to
auto-compress the v2 archive in code: if the composed prompt
exceeded 1500 chars, truncate the category section. **This was
H1 violation** — it would silently change the prompt the
user curated in the file, defeating the whole "read file
verbatim" guarantee. The correct fix is the user's archive
trim (Part 1 above), not a runtime workaround.

### R28 verification

End-to-end test: 青铜器 (object) → `build-prompt.mjs` (1317 chars
under cap) → `matrix_generate_image` (success) → 405 KB PNG
downloaded → visual inspection (9:16, ivory paper, museum
aesthetic, hero + modules). Saved to `tmp/bronze-pipeline-test/`
(not shipped to `public/cards/` — the 61st card decision is
R29). See `tmp/bronze-pipeline-test/R28-VERIFICATION.md` for
the full log and 3 R29 options (iterate prompt / accept / skip).

### Why the test image was kept in `tmp/`, not shipped

The image structure is correct. The Chinese small-text rendered
with visible character-level artifacts (mixed ink/blank strokes,
occasional garbled glyphs) — a Hailuo model limitation, not a
pipeline issue. Shipping a 61st card with garbled Chinese
text would be a visible downgrade to the public atlas, so
the test image is in `tmp/` (gitignored) and the 61st-card
decision is deferred to R29.

## Round 30: end-to-end pipeline automation (2026-06-18)

Goal: 让一张新卡从 0 到 100% 完整一条命令搞定,wizard 之外的
CLI 路径打通。详细笔记见 `docs/round-30-pipeline-automation.md`,
这里只列 API 表面。

### 4 new scripts (the pipeline)

| Script | Role | 调用方式 |
|---|---|---|
| `scripts/plan-new-cards.mjs` | 24-kind 候选池 + 缺口扫描 → `tmp/new-cards-plan.json` | `--kind X` `--count N` `--include-empty` `--dry-run` |
| `scripts/regen-3tier.mjs` | `-card.png` → `-thumb.webp` (384w) + `-full.webp` (1024w q90) | `--kind X --slug Y` 或 `--all` `--force` |
| `scripts/generate-card.mjs` | 串联 build-prompt → matrix (retry 3) → 落盘 PNG/MD → 3-tier → cards.json + log-revision | `--topic X --kind Y --slug Z [--series S --seriesNo N --palette "#hex,#hex,#hex"] [--resolution 1K\|2K]` 或 `--from-plan <json>` `--dry-run` |
| `scripts/finish-card.mjs` | 内容补全串联:阶段 1 per-card (mmx) + 阶段 2 bulk (deterministic) | `--slug X` (阶段 1) `--bulk` (阶段 2) `--all` (1+2) `--limit N` `--no-score` `--verbose` |

### 4 source scripts modified

- `scripts/draft-history.mjs`: mmx envelope 解析 + year post-process
  (从 body regex 提取 `前 N 年` / `公元 N 年` / `N 年` / `N 世纪`)
  + 节点数 5-8 → 3-5 (避开 M2.7 thinking 阶段 4096-token 截断)
- `scripts/draft-sources.mjs`: 同样 mmx envelope 解析
- `scripts/add-cross-tags.mjs`: `CROSS_TAGS` dict 补 `great-wall` +
  `potala-palace` 两条(之前 WARN 跳过)
- `scripts/generate-card.mjs`: 加 `--series` / `--seriesNo` / `--palette`
  CLI 标志(单卡模式不再 fallback 到 seriesNo="001")

### Wizard vs CLI 同源

```
       ┌─────────────────────────┐
       │ scripts/build-prompt.mjs │  ← single source of truth
       └─────────────────────────┘
              ▲                ▲
              │ execFile       │ execFile
              │                │
   ┌──────────┴──────┐  ┌──────┴─────────────────┐
   │ /api/generate   │  │ generate-card.mjs       │
   │ (wizard)        │  │ (CLI, no rate limit)    │
   │ 3 req / 5 min   │  │ N cards, batchable      │
   └─────────────────┘  └────────────────────────┘
       browser              terminal / batch
```

两个入口都调同一个 `build-prompt.mjs` (H1 强约束),所以 prompt
永远只有一份 source of truth。

### End-to-end PoC: 布达拉宫 (62nd card)

完整状态(经过 plan → generate → finish-card):

```yaml
slug:        potala-palace
title:       布达拉宫
kind:        architecture
series:      craft-and-botanical
seriesNo:    012
score:       8.7  (visualScore 7/8)
tags (8):    建筑 | 宫殿 | 西藏 | 世界遗产 | 唐朝 | 清初 | 中国 | 古代
description: 270 字
history:     5 nodes (631/1645/1648/1959/1994 年)
sources:     3 条权威中文 (中国大百科/维基中文/知网)
```

### R31 候选(未做)

- `scripts/batch-generate.mjs` orchestrator: 4 张 architecture 剩
  下 3 张(应县木塔 / 赵州桥 / 黄鹤楼)能一键并发 + 死信
- `categories/architecture.md` 模板防翻车补丁:"建筑档案" + "地理
  位置" 在布达拉宫图里各出现 2 次,模板没禁止 8 module 严格
- 长城 visualScore 4/8,可能 1K 图质量差,2K 重跑可改善
- score-all-cards 跑全 62 张(完整 visualScore sweep, 当前只跑了
  前 28 张 + 布达拉宫 1 张)

## Round 40: PWA install (2026-06-21)

Commit `4382ed5`. First PWA pass — make the site installable as
a standalone app on mobile Chrome / iOS Safari / Android.

### What was added

| File | Purpose |
|---|---|
| `public/manifest.webmanifest` | name/short_name (图鉴社 / Atlas Kit), 192+512 icons, theme `#C97064`, `display: "standalone"`, lang `zh-CN` |
| `public/icon-192.png` | Gold gradient + "A" wordmark (sharp SVG-to-PNG, 192×192) |
| `public/icon-512.png` | Same artwork, 512×512 |
| `public/sw.js` | Service worker, cache version `atlas-kit-v1` |
| `src/components/sw-register.tsx` | Client island, registers SW on mount + shows "新版本就绪,点击刷新" pill on `controllerchange` |
| `src/app/layout.tsx` | `<link rel="manifest">` + `<link rel="apple-touch-icon">` + `<SwRegister />` |

### Service worker cache strategy (3-tier)

| Resource pattern | Strategy | Cache name |
|---|---|---|
| `/` HTML navigations | network-first, fallback to cache | `atlas-kit-v1-pages` |
| `_next/static/*` + `/fonts/*` | cache-first (immutable assets) | `atlas-kit-v1-static` |
| CloudBase CDN images (`636c-cloud1-*.tcb.qcloud.la`) | stale-while-revalidate | `atlas-kit-v1-images` |

Rationale: HTML is cheap to refresh and changes on every deploy,
so network-first. Static assets are content-hashed by Next.js
(`/\_next/static/chunks/117-3f7d29040917b0e8.js` etc.) so once
cached they never need re-fetching. CDN images are slow but
immutable per slug — SWR is the right balance (show cached while
revalidating in background; instant on repeat visits).

### What was NOT added (intentional)

- **No `app/icon-192.png.tsx` route handler** — Next.js 14
  auto-registers `app/icon.png` (single icon), but doesn't
  auto-register `app/icon-192.png.tsx` / `app/icon-512.png.tsx`
  filename conventions. Static `public/icon-{192,512}.png` is
  the simpler / more predictable path. The legacy
  `app/icon-192.png.tsx` and `app/icon-512.png.tsx` files were
  DELETED in R30; the Next.js build was silently ignoring them.
- **No background sync / push notifications / install prompt
  override** — these need backend infra (push server) or fight
  the browser's native install UX. Defer to R42+ if needed.

### Verification (post-deploy)

- DevTools → Application → Manifest shows name, icons, theme
  color, start_url, display=standalone
- DevTools → Application → Service Workers shows `sw.js`
  activated, "Update on reload" toggle works
- Lighthouse → PWA category: installable + ✓
- iOS Safari: Share → "添加到主屏幕" shows 图鉴社 icon
- Android Chrome: install banner appears after ~3s on
  `/` navigation

## Round 41: keyboard shortcuts (2026-06-21)

Same commit `4382ed5`. Add global keyboard navigation so the site
feels like an actual encyclopedia app, not just a paginated blog.

### What was added

| File | Purpose |
|---|---|
| `src/components/keyboard-shortcuts.tsx` | Global `keydown` listener + help modal (Dialog) |
| `src/components/card-nav.tsx` | `j` / `k` as vim-style aliases for `ArrowLeft` / `ArrowRight` (prev/next card) |
| `src/app/search/page.tsx` | `data-search-input` attribute on the search input |
| `src/components/site-footer.tsx` | "按 ? 查看快捷键" hint pill with `Keyboard` icon |

### Shortcut table

| Key | Action | Scope |
|---|---|---|
| `?` | Open help modal | global |
| `Esc` | Close help modal | when modal is open |
| `/` | Focus search input (`[data-search-input]`) | global |
| `g h` | Navigate `/` | global, 1s sequence |
| `g c` | Navigate `/cards` | global, 1s sequence |
| `g s` | Navigate `/series` | global, 1s sequence |
| `g t` | Navigate `/timeline` | global, 1s sequence |
| `g g` | Navigate `/graph` | global, 1s sequence |
| `j` / `←` | Previous card | `/cards/[slug]` only (handled by `CardNav`) |
| `k` / `→` | Next card | `/cards/[slug]` only (handled by `CardNav`) |

### Implementation notes

- **Global listener uses `useRef` for `lastG` timestamp**, not
  `useState`. This avoids re-attaching the listener on every
  `g` press (which is what a `useState` approach would do —
  see `useEffect` dep churn in `useEffect` gotcha). Same
  pattern applies to `helpOpenRef` — read the latest value
  in the handler without re-attaching.
- **`isTypingTarget` guard**: skip the global handler when
  the user is typing in `INPUT` / `TEXTAREA` / `SELECT` /
  contentEditable. This is the same pattern as `CardNav`'s
  existing guard (R34 Day 1) and prevents `/` from nuking
  in-progress search input.
- **`j` / `k` only work on `/cards/[slug]`** — `CardNav` is
  not mounted elsewhere, so the keys are no-op outside card
  detail pages. The help modal documents this correctly
  ("上一张 / 下一张 — only on /cards/[slug]").
- **Help modal** is rendered conditionally (`if (!helpOpen)
  return null`), so the `useEffect` listener is the only
  runtime cost when the modal is closed.

### Why a separate component, not extending `CardNav`

The shortcut layer has 3 distinct scopes (global / page-level /
modal) and the `g x` sequence logic is meaningless for prev/next
card nav. Keeping `KeyboardShortcuts` separate from `CardNav`
preserves each component's single responsibility and avoids
re-rendering the card detail page's `<CardNav>` when the global
shortcut listener re-attaches.

### Verification (manual)

- Press `?` on `/` → modal opens, shows all shortcuts
- Press `Esc` → modal closes
- Press `/` on `/` → no-op (no search input on home)
- Navigate to `/search` → press `/` → cursor in search input
- Navigate to `/cards/sanxingdui` → press `j` → 404 or another
  card (depends on sort order); press `k` → goes back
- Press `g h` from `/cards/sanxingdui` → navigates to `/`
- Type `g` in any input → no nav, no listener fire
## Round 52: 收藏夹 + /random 增强 + /graph mobile fallback + view toggle (2026-06-22)

Commit `84e41d4`. Three parallel features driven by the "ship a
discoverability layer + bookmark system" theme.

### A. 收藏夹 (favorites / bookmarks)

localStorage-backed Set of favorited slugs, with cross-tab + cross-
component sync.

| File | Purpose |
|---|---|
| `src/lib/favorites.tsx` | `useFavorites()` hook (Set of slugs + count + toggle/clear) + custom `atlas-kit-favorites-changed` event for same-tab sync + native `storage` event for cross-tab |
| `src/components/star-button.tsx` | 44px star toggle, 2 sizes (`prominent` for detail hero, `subtle` for CardPreview overlay) |
| `src/components/favorites-list.tsx` | `/favorites` page client island (list + empty state + clear-all with 3s confirm timeout) |
| `src/components/favorites-badge.tsx` | Header 右上角 icon-only Star + count badge (sticky to localStorage, icon-only to preserve 7-item nav cap) |
| `src/app/favorites/page.tsx` | New static route (2.9 kB) |

### Hero overlay slot

`HeroWithLightbox` now accepts `overlay?: ReactNode` (rendered absolute
top-right inside the hero button, z-10 above the hover "查看原图"
pill). The detail page passes a `<StarButton>` there. This kept
HeroWithLightbox API-stable for any future re-use.

### B. /random 增强 (302 redirect → interactive UI)

Old R37 `/random` was a bare 302 redirect. Replaced with a full
client island:

- `src/components/random-client.tsx` (120+ LOC)
- `src/app/random/page.tsx` (Suspense wrapper for `useSearchParams()`)

Features:
- 24-kind chips at top (URL `?kind=X` deep link, browser back works)
- Hero card preview (image + meta + tagline + 4 action buttons)
- 4 buttons: 再换一张 (gold-deep primary) / 同系列再抽 (border secondary,
  disabled when no other cards in same series) / 看详情 (Link) / 收藏夹
- Space reroll shortcut
- sessionStorage history (max 20 slugs) — avoids repeating same card
  within a session; pool resets when exhausted
- SSR-safe first paint: deterministic first candidate based on
  URL ?kind

### C. /graph 增强 (TODO mobile fallback + view toggle)

Round 37 TODO ("60 节点在小屏太挤") addressed.

| File | Purpose |
|---|---|
| `src/components/graph-list.tsx` | Scrollable list view (thumbnail + name + kind + 邻居 count), 44px touch targets, full keyboard/SR navigable |
| `src/components/graph-view-toggle.tsx` | Toggle owner: localStorage `atlas-kit-graph-view` (`graph` / `list`), auto-pick `list` on viewport < 768px if no saved preference, CSS-hides inactive view |
| `src/app/graph/page.tsx` | Wraps both views in `GraphViewToggle` |

Why toggle vs responsive CSS: each view owns its filter UI independently.
Switching view resets filter intentionally — the two layouts serve
different mental modes ("explore" vs "scan"), not the same query in
two skins.

### Keyboard shortcuts added

- `s` — toggle favorite of current card (only on `/cards/[slug]`,
  conflict-guarded against `g s` sequence by 1s timeout)
- `g f` — navigate to `/favorites`
- Help modal gained 2 new rows

### Build verification

`next build` clean: 811 static pages. New routes picked up:
- `/favorites` (2.9 kB, Static)
- `/random` (4.76 kB, Static — Suspense-wrapped)
- `/graph` (5.92 kB, Static)

### Why no Push trigger

Push to origin was attempted but `atlas-kit.vercel.app` resolves to an
unrelated Storybook demo (the subdomain was claimed by someone else,
not our Vercel project). Without `vercel` / `gh` CLI on this machine,
deploy verification was not possible from the agent side. The 4
commits are pushed to `origin/master` (`d9f069f..84e41d4`) and await
manual verification by the user via their actual deployment URL.

## Round 53: /all 加 FavoritesCta 横幅 + CardPreview hover polish (2026-06-22)

Commit `28602b0`. Two follow-up polish / discoverability tweaks
after R52.

### A. /all FavoritesCta banner

New client island `src/components/favorites-cta.tsx` rendered above
the 3-grid (按字数 / 按系列 / 按类型) on `/all`. 3 states:

- **Pre-hydration**: 68px dashed skeleton (avoids layout shift when
  count hydrates)
- **0 favorites**: muted dashed-border banner with "随机逛逛"
  secondary CTA (links to `/random`)
- **≥1 favorites**: gold-bordered banner with count + primary
  "查看收藏夹" button (gold-deep) + secondary "随机一张"

### B. CardPreview hover polish (3 changes)

The 60-card grid's click affordance was too subtle (title color
shift only). Three additions, scoped tight to avoid visual noise:

1. **Image scale-up on hover**: `group-hover:scale-[1.04]` with
   `transition-transform duration-500`. Image is `fill` (absolute);
   Tailwind's default `transform-origin: center` gives the zoom-in
   feel without clipping.
2. **"查看图鉴 ↗" overlay pill**: bottom-center, fades in + slides up
   on `group-hover` / `group-focus-visible`. Mirrors HeroWithLightbox's
   "查看原图" pattern for visual consistency between detail and
   grid contexts. Decorative (`aria-hidden`); parent Link still
   handles click.
3. **Title underline animation**: 1px gold-deep underline grows from
   `w-0` → `w-full` in 300ms via child span with `absolute -bottom-0.5`.
   Only on the title (subtitle + tags don't get it — would feel
   busy).

### Untouched on purpose

- Card lift (`hover:-translate-y-1`) — already works, kept
- Star button behavior (subtle variant: opacity-0 until hover or
  favorited) — discovery tradeoff documented in R52
- Tag list, subtitle color, image alt text

### Build

`next build` clean (811 pages). No new dependencies.

### Lessons worth saving

- **Server-component shells + thin client islands**: `/all` stayed
  server-rendered for the 3-grid (SEO benefit, no client JS
  hydration cost); only the count-dependent CTA is client. Same
  pattern as `/favorites` page + `/random` page in R52.
- **Cross-component sync via custom event**: `useFavorites()` writes
  to localStorage AND dispatches a custom event. The native
  `storage` event only fires in OTHER tabs by spec, so the custom
  event is needed for same-tab cross-component sync. The hook also
  re-reads on `storage` for cross-tab updates.
- **Image-overlay interaction**: putting `<StarButton>` inside a
  parent `<Link>` requires `stopPropagation` on the button click,
  otherwise the Link navigation fires too. Already shipped in R52
  CardPreview; reaffirmed in R53 (the new overlay pill is
  `aria-hidden` precisely so it's not focusable, but the star still
  needs stopPropagation).## Round 54: /all 加 FavoritesCta 横幅 + CardPreview hover polish (2026-06-22) — REVISED

(Original R53 round note covered CardPreview polish + FavoritesCta.
R54 extended this: footer Browse 列 + home page FavoritesPreview 段
both ship in this round. R53 commit stays as-is, R54 commit is the
follow-up.)

Commit `10022a0`. Extends R52 favorites system with two more
discoverability surfaces.

### A. Footer Browse 列加 收藏夹 + 随机一张

`src/components/site-footer.tsx` — 2 new links in the Browse column:

- **收藏夹** (Star icon) → `/favorites`
- **随机一张** (Dices icon) → `/random`

Both pair with the header badge / keyboard shortcut to give
favorites + random a 2nd entry point. Icons match the Lucide
choices used elsewhere (FavoritesBadge uses Star, random page
uses Dices).

### B. Home page FavoritesPreview 段

New client island `src/components/favorites-preview.tsx` inserted
between the 5-series preview and the "精选图鉴" cards grid:

- **0 favorites**: returns null. First-time visitors get a clean
  home (no empty "你还没收藏" placeholder — redundant with hero
  CTAs).
- **1-6 favorites**: show all in a 2/3/6 col grid (same
  CardPreview component used elsewhere).
- **≥7 favorites**: show top 6 + "查看收藏夹 (N) →" link.

Section styling: gold-bordered eyebrow ("YOUR COLLECTION" with
Star icon) + serif h2 + count subtitle. Grid uses CardPreview's
existing component (no duplication).

Why client-only: favorites are localStorage. SSR returns null
(useFavorites' initial Set is empty), so no hydration flash for
the absent case.

### Combined R52-R54 discoverability matrix

After R54, /favorites is reachable from 8 surfaces:

1. Header 右上角 Star icon + count badge (all pages)
2. Detail page hero Star button (prominent)
3. CardPreview hover Star overlay (subtle)
4. Keyboard `s` (toggle current card) + `g f` (navigate)
5. /all page FavoritesCta banner
6. Home page FavoritesPreview section (if ≥1 favorite)
7. /random page hero Star + "收藏夹" button
8. Footer Browse column

## Round 55: CloudBase upload pipeline (2026-06-22)

Commits: `ef85f5e` (script) + `17b5bbd` (test run + 93 cards.json
fields rewritten to CDN URLs). Closes the new-card CDN gap left
open since R36 migration — 31 cards added in R43/R46 were still on
local paths.

### The gap (before R55)

- `generate-card.mjs` writes 3 tier files to local `public/cards/...`
- cards.json image fields are local paths (`/cards/food/dumplings/...`)
- The R36 migration (`cdn-rewrite.mjs`) had flipped 1080 fields to
  CDN URLs, but cards added afterwards (music + anime + pulp-fiction)
  were local-only
- New cards generated via pipeline were un-served — if anyone ran
  `cdn-rewrite.mjs --apply` post-R43 they'd 404

### What R55 adds

| File | Purpose |
|---|---|
| `scripts/upload-cdn.mjs` | Upload 3-tier files to CloudBase + optional cards.json rewrite |
| `scripts/generate-card.mjs` | New `--upload` flag (spawns upload-cdn as subprocess after step 6) |
| `.env.local.example` | New TENCENT_* env vars documented |
| `package.json` devDep | `@cloudbase/node-sdk@3.18.3` |

### upload-cdn.mjs CLI surface

```bash
node --env-file=.env.local scripts/upload-cdn.mjs \
  --kind food --slug dumplings --also-rewrite   # one card
node --env-file=.env.local scripts/upload-cdn.mjs \
  --kind food --also-rewrite                    # one kind
node --env-file=.env.local scripts/upload-cdn.mjs \
  --all --also-rewrite                          # all 391 cards (slow)
```

Flags:
- `--dry-run` — list files + sizes + cloudPath, no network
- `--also-rewrite` — after successful upload, point cards.json
  image / image_thumb / image_full to CDN URL
- exit code: `0` = success, `2` = partial failure (some files
  failed but cards.json NOT updated for them — caller can retry)

### Why `--env-file=.env.local`

Node doesn't auto-load .env files (that's Next.js's behavior).
CLI scripts need either:
1. `require('dotenv')` (extra dep + async load)
2. `node --env-file=.env.local script.mjs` (native, Node 20+)

Went with #2 — zero deps, faster cold start.

### Auth model

`@cloudbase/node-sdk` admin mode:

```js
tcb.init({
  env: process.env.TENCENT_CLOUDBASE_ENV,  // "cloud1-d9gv1q8ikad5e9721"
  region: process.env.TENCENT_CLOUDBASE_REGION,  // "ap-shanghai"
  secretId: process.env.TENCENT_SECRET_ID,  // CAM API key
  secretKey: process.env.TENCENT_SECRET_KEY,
})
```

Why admin (vs anonymous): `node-sdk` doesn't have
`signInAnonymously` (only `getAuthContext` / `createTicket` /
`getUserInfo`). For CLI server-side uploads, admin via CAM API
key is the standard pattern.

### Verification (R55-test)

| Step | Result |
|---|---|
| `node --env-file=.env.local scripts/upload-cdn.mjs --kind food --slug peking-duck` | 3/3 uploaded |
| `webfetch https://636c-cloud1-...tcb.qcloud.la/cards/food/peking-duck/peking-duck-thumb.webp` | returned actual encyclopedia card image ✓ |
| `--kind music --also-rewrite` | 45/45 uploaded, 45 cards.json fields rewritten |
| `--kind anime --also-rewrite` | 45/45 uploaded, 42 rewritten (3 already CDN) |
| `--kind movie --also-rewrite` | 48/48 uploaded, 6 rewritten (15 R36 already CDN, only R46 pulp-fiction was local) |
| **Total** | **138 files uploaded, 93 cards.json fields rewritten, 0 failures** |
| Post-upload audit `node -e "const c=require('./data/cards.json');console.log(c.filter(x=>x.image.startsWith('/cards/')).length)"` | `0` (all 391 cards on CDN URLs) |

### 2 gotchas worth saving

1. **`cloudPath` must NOT start with `/`** — `node-sdk` rejects it
   with "cloud path is invalid". Store as `cards/<kind>/<slug>/<file>`,
   construct public URL as `${CDN_DOMAIN}/${cloudPath}`.
2. **`@cloudbase/js-sdk` doesn't run in Node CLI** — depends on
   `window.navigator`, throws at init. Use `node-sdk` (admin mode) or
   `@cloudbase/admin-node` (no separate npm package as of 2026-06;
   admin is built into node-sdk).

Both gotchas are in `agent_memory` (MEMORY.md R55 entry) for
future sessions.

### R55 + R36 migrations = production CDN parity

Before R55: 360 cards on CDN (R36 migration), 31 on local (R43/R46 adds).
After R55: all 391 cards on CDN URLs. Next card generated via the
pipeline will auto-upload + auto-rewrite (with `--upload` flag).

## Round 55h: ThemeProvider useState SSR-safe init (2026-06-23)

Production hydration error surfaced post-R55g deploy:

```
Error: Hydration failed because the initial UI does not match what was rendered on the server.
Expected server HTML to contain a matching <footer> in <div>.
  <RootLayout>
    <html>
      <body>
        <ThemeProvider>
          <div>     <-- mismatch reported here
            <SiteFooter>
              <footer>  <-- client expected this
```

`<SiteFooter>` rendered correctly on both sides (verified via local
`next start` curl). The `<footer>` in the trace was collateral
damage: the hydration walker bailed at the first divergence it
noticed and reported the nearest DOM ancestor's missing element.

### Root cause

`src/components/theme-provider.tsx` had the same anti-pattern as R55c
ThemeToggle: a `useState` initializer that read localStorage on the
first render. Server returned `defaultTheme`, client read localStorage.
Even though `<ThemeContext.Provider>` doesn't emit a DOM element, the
provider's VALUE differs between server and client. React 18 dev
mode's hydration walker bails on this context value mismatch and
reports a misleading DOM-level error downstream.

### Fix

Keep `useState` init SSR-safe (always returns `defaultTheme` /
`"light"` on first render). Move localStorage read into a `useEffect`
that runs AFTER first paint.

```jsx
// BEFORE (broken):
const [theme, setTheme] = useState<Theme>(() => {
  if (typeof window === "undefined") return defaultTheme;
  const stored = window.localStorage.getItem("theme");
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return defaultTheme;
});

// AFTER (SSR-safe):
const [theme, setTheme] = useState<Theme>(defaultTheme);

useEffect(() => {
  if (typeof window === "undefined") return;
  const stored = window.localStorage.getItem("theme");
  if (stored === "light" || stored === "dark" || stored === "system") setTheme(stored);
  setResolvedTheme(
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  );
}, []);
```

FOUC prevention: the inline `<script>` in layout.tsx already applied
the `.dark` class to `<html>` before paint. Visual is correct from
frame 1; React state catches up after mount.

### Why suppression wouldn't have worked

`suppressHydrationWarning` on the layout's `<div>` would only
suppress text-level mismatches within `<div>` itself. The actual
divergence was at the React tree level (ThemeProvider's context
value), not at the `<div>`'s DOM attribute level. Fix has to be at
the source: make the context value SSR-stable.

## Round 55i: graph-view CloudBase CORS cleanup (2026-06-23)

Post-R55g temporary CORS workaround reverted. CloudBase bucket now
configured to send `Access-Control-Allow-Origin`, so we can restore
the proper image-first graph rendering.

### Changes in `src/components/graph-view.tsx`

| Before (R55g workaround) | After (R55i restore) |
|---|---|
| `img.crossOrigin` unset (canvas tainted) | `img.crossOrigin = "anonymous"` |
| `img.onerror = () => {}` (suppress 390 console errors) | removed — let real errors surface |
| `ctx.drawImage` wrapped in try/catch to absorb SecurityError | direct `ctx.drawImage` — no throw |

### Comment updates

The 25-line R55g comment block explaining the CORS situation has
been replaced with a 5-line R55i comment that documents the
reversion. If CORS ever breaks again (e.g. bucket CORS rule gets
deleted), fall back to the R55g workaround: drop `crossOrigin` +
re-add `img.onerror` + wrap `drawImage` in try/catch. The
graceful-degradation colored circle (drawn BEFORE the drawImage
attempt) still appears either way.

### Verification

`next build` clean. `/graph` route size unchanged (5.96 kB) — the
change is logic only, no bundle delta. Graph now actually shows
card thumbnails inside the colored circles (was just colored
circles pre-R55i, since drawImage was throwing).

### R55 closeout

The R55 series is now complete:
- **R55**: CloudBase upload pipeline (script + generate-card --upload)
- **R55b**: delete redirects() — 1173 stale entries
- **R55c**: ThemeToggle hydration fix
- **R55f**: graph density tuning
- **R55g**: graph-view canvas CORS workaround (temporary)
- **R55h**: ThemeProvider useState SSR-safe init
- **R55i**: revert R55g workaround now that CORS is fixed

8 commits since R55d (the cards-on-CDN test run). Image bundle
now renders correctly, hydration is clean, graph density is tuned.

## Round 56: drop OG image card thumbnails — fix /opengraph-image 500 (2026-06-23)

Pre-launch smoke test caught `/opengraph-image` returning **500
Internal Server Error** on Vercel. Discovered via curl during the
launch checklist — the build was green but production was broken.

### Root cause

`satori` (next/og's renderer) tried to fetch 4 `c.image` (CloudBase
CDN URLs) inline as the right-side thumbnail grid. On Vercel's
node-runtime serverless function, the fetch was failing — either
network timeout or internal CORS handling. Reproduced **only on
Vercel**, not on `next start` locally, so the build-time smoke
test couldn't catch it.

### Fix

Drop the 4-card thumbnail grid. Pure-text OG image — visual upgrade
with bigger fonts + larger A logo + brand color block + status bar.

| Layer | Content |
|---|---|
| Top | 图鉴社 / ATLAS KIT + 88px gold-gradient A logo |
| Middle | "知识整理 · 信息归档" / "图鉴式展示" (76px headline) + tagline (26px) |
| Bottom | "391 张图鉴 · 12 个分类 · AI 一键生成" status bar with top border |

### Why not the other options

- **Base64 embed in cards.json** (option B from launch checklist):
  +30 KB × 391 cards = 12 MB added to data file. Not worth the
  payload bloat for a launch fix. Defer to R60+ if real user
  feedback says thumbnail OG is important.
- **Static `public/og-image.png`** (option C): 0 runtime risk but
  no dynamic content. The current text-only design still carries
  the brand + stats, which is enough for Twitter / Slack /
  iMessage previews.

### Verification

- `next build` clean (811 static pages, /opengraph-image still
  `ƒ Dynamic`, 0 B bundle — server-only)
- Curl locally via `next start -p 3103` should return a real PNG
  (was 500 before this change; expected to be ~50 KB after)
- Curl Vercel after deploy — expect 200 + image/png + 30-80 KB body

### Lesson

**Always smoke-test deploys via curl, not just `next build`.** The
local `next start` and Vercel serverless runtime have different
network access (Vercel can't always reach external CDN hosts from
inside a serverless function, especially with no Allow headers).
Build-time validation misses these. Add OG image + sitemap +
robots + manifest to the deploy checklist.