# Atlas Kit · 图鉴社 — Project Memory

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
- [ ] **Post-deploy smoke test**: 10 routes, expect 8× 200 + 2× 404
      (the 2 unknowns at `/cards/this-does-not-exist` and
      `/series/this-does-not-exist`).

## Wizard filename convention

- Output files are written to `public/cards/<slug>.png` (English slug,
  not Chinese topic). The 60 placeholder cards.json entries all use
  English slugs (labrador-retriever, hangzhou, peking-duck, ...).
- Wizard upsert is by English slug. Re-running the wizard for any
  existing card updates its image only; new topics fall back to a
  hash slug (card-xxxxxx) and are appended.
- The SLUG_TABLE in `src/app/api/generate/route.ts` (60 entries) must
  stay in sync with the slugs in `data/cards.json` — if a user adds
  a new placeholder card with an English slug, also add a row to
  the table so the wizard can find the existing card instead of
  creating a duplicate.

## 60-card plan (kind × 5)

See `data/cards.json` — 12 kind × 5 cards. Series assignment:

- pet (5)         → pet-breed-guide
- animal (5)      → wild-fauna-atlas
- city (5)        → city-encyclopedia
- festival (5)    → festival-almanac
- everything else (35) → atlas-miscellany

## Image tier conventions

Three resize tiers per card (sharp):

| Field | Source | Size | Use |
|---|---|---|---|
| `image_thumb` | `<slug>-thumb.webp` | 384w WebP | Card grid + list views (~50 KB) |
| `image` | `<slug>-card.png` | 600w PNG | Detail hero + series cover (mid-quality, ~350 KB) |
| `image_full` | `<slug>-full.webp` | 1024w WebP | Lightbox modal + download (pixel-real zoom, ~310 KB) |

**History**:
- The original `resize-cards.mjs` had a bug: `withoutEnlargement: true`
  meant 1536w source → no-op downsize → -full.png ended up 1536w @ ~5.5 MB
  each. 60 cards = 334 MB, over Vercel Hobby 100 MB static upload cap.
- `scripts/rewrite-image-full.mjs` was a band-aid that set
  `image_full = image` (600w) so the detail page download still worked.
- `scripts/reencode-full-webp.mjs` (2026-06-16) is the real fix:
  re-encoded 60 -full.png → 1024w WebP q90 → 19 MB total, fits Hobby
  with 81 MB headroom. Updated `image_full` paths in cards.json to
  `.webp` extension.

Series list + detail page covers use `image_full` for crispness on
desktop (was 600w card size, looked blurry at 100vw — fixed 2026-06-14
in commit `f098548`). Card list + thumbnails still use 384w WebP.

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

## Scripts (in `scripts/`)

- `resize-cards.mjs` — sharp batch resize 60 PNGs into 3 tiers. Keep
  (initial generation from a non-1536 source; current files are
  re-encoded by reencode-full-webp.mjs).
- `reencode-full-webp.mjs` — 1536w PNG → 1024w WebP q90 (-95% size).
  Run after any new batch of cards to keep static bundle under cap.
- `restore-image-full.mjs` — inverse of rewrite-image-full.mjs;
  re-points cards.json image_full to the -full.webp paths.
- `rewrite-image-full.mjs` — legacy band-aid that set
  `image_full = image` (600w). Kept for reference; superseded by
  reencode-full-webp.mjs.
- ~~`run-60.mjs`~~ — one-off batch image generator (deleted 2026-06-15).
- ~~`retry-4.mjs`~~ — one-off retry (deleted 2026-06-15).
- ~~`sample-gen.mjs`~~ — one-off sample (deleted 2026-06-15).
