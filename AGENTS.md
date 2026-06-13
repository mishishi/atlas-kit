# Atlas Kit · 图鉴社 — Project Memory

## Production deploy checklist (must do before deploy)

- [ ] **Restore rate limit**: `src/lib/rate-limit.ts` line 11 currently
      has `MAX_REQUESTS = 9999` (disabled for the 60-card batch run).
      Change back to `3` before deploying. Comments in the file already
      note this.

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

## Dev server quirks

- `next build` overwrites `.next/` so dev server's HMR chunk cache
  becomes stale. After running `next build`, always restart dev:
  `Ctrl+C` + `npm run dev` + hard-refresh the browser.
- `/opengraph-image` returns 502 in dev mode (edge runtime can't read
  filesystem in dev's data-collection phase). In `next build` +
  `next start` production mode it's fine.
