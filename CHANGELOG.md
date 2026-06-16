# Changelog

All notable changes to Atlas Kit, in reverse-chronological order.
Dates are ISO 8601, Asia/Shanghai.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/)
(loosely — pre-1.0, so anything before the first `1.0.0` tag may
ship breaking changes).

## [Unreleased] — post-v0.1.0 polish

### Fixed (audit rounds 13–23, 2026-06-16)

#### Round 13 — `/all` view 2 series bento
- Removed 3px `border-left` colored stripe (impeccable ban: side-stripe
  >1px on cards is AI slop). Replaced with 8px accent dot + accent-colored
  h3 text.
- Series palette `bg = #FAF3E9` was invisible in dark mode. Switched
  to theme-aware `bg-muted` token; accent hex stayed mid-saturation
  for cross-theme readability.

#### Round 14 — `/series` tab + `/about` em-dash
- Series detail tab buttons bumped from 36px → 44px (WCAG 2.5.5).
- `/about` line 17 em-dash replaced with comma + new sentence.

#### Round 15 — `/changelog` site milestones
- New `type: "milestone"` entry shape, alongside `created` / `revised`.
- 5 hand-curated site-wide milestones (MVP 上线 / 60 张齐 / 首轮设计
  review / 6 项 roadmap 完成 / 连续 4 轮设计 audit) injected into the
  page so the changelog tells the project story, not just per-card churn.
- Data lives in `SITE_MILESTONES` const at the top of the file.

#### Round 16 — untested-pages audit
- `/` home hero collage: removed `aria-hidden` from wrapping div and
  `alt=""` from each of the 5 collage Images. SR users were previously
  unable to discover any of the 5 hero cards (the collage is the home
  page's primary CTA for sighted users). Each Link now carries
  `aria-label="{title} · 精选"`.

#### Round 17 — `CardPreview` "新收录" badge hydration
- `Date.now() - new Date(card.createdAt).getTime() < 86400000` runs
  once at SSR and again at hydration — the two clocks can drift and
  silently flip the badge. Added `suppressHydrationWarning` on the
  badge span. We accept the rare flash as the cost of keeping
  `CardPreview` a server component.

#### Round 18 — `MapView` popup theme + dead code
- `buildPopupNode` set inline `color: #2e2a24` / `#6f6a5e` / `#87603f`
  on popup text. The popup wrapper bg flipped with theme but the
  inner text stayed near-black, crashing contrast on dark mode.
  Switched to className hooks (`atlas-popup-thumb/-title/-sub/-cta`)
  + CSS in `globals.css` that uses `--foreground` /
  `--muted-foreground` / `--gold-deep`.
- Deleted dead `escapeAttr` (always returned `true`).
- Deleted dead `filteredIdsRef` (assigned in 2 places, never read).

#### Round 19 — `Lightbox` 44px + unmount guard
- Mode-toggle buttons (zoom-out / 重置 / zoom-in) bumped from
  32px → 44px touch target. Third occurrence of the 44px pattern
  (R8 chips → R14 series tabs → R19 lightbox).
- `Image.onLoad` `setNaturalDims` could fire after unmount under
  React 18 strict mode. Added `openRef` guard.

#### Round 20 — site header / footer / OG image sync
- Mobile nav active state was text-only, desktop was `bg-muted`.
  Unified to `bg-muted` so mobile active stands out among 5
  inactive siblings.
- Footer GitHub link was placeholder `https://github.com/`. Fixed
  to `https://github.com/mishishi/atlas-kit`.
- Footer mailto was hard-coded `hello@atlas-kit.example` (a
  `.example` reserved TLD that never delivers). Now reads
  `NEXT_PUBLIC_SITE_AUTHOR_EMAIL` with `atlas-kit@example.com`
  fallback — matches the per-card errata link.
- Tagline "模块信息" → "信息归档" was a Round 12 fix in
  `app/page.tsx` (home hero) that missed 2 stragglers:
  `components/site-footer.tsx` and `app/opengraph-image.tsx`.
  Both still said "模块信息" until R20.

#### Round 21 — `ShareActions` / `SeriesDetailTabs`
- `ShareActions` copy-link `setTimeout(() => setCopied(false), 2000)`
  could fire after unmount. Added `mountedRef` guard.
- `ShareActions` PDF link missing `noreferrer` (had `noopener`
  only; footer uses `noopener noreferrer` for consistency).
- `SeriesDetailTabs` dead `slug` prop + dead `displayLabel` import
  dropped (and the `slug={series.slug}` call from the parent
  series detail page).

### Added

#### Round 15 — site milestones
- See above. `SITE_MILESTONES` const, 5 hand-curated entries.

### Documentation

- `README.md`: rewrote the create-next-app placeholder into a real
  project intro with 60s 上手, 14-route table, image tier
  conventions, and a placeholder for the 公众号 section.
- `AGENTS.md`: appended Round 8 → Round 23 summaries, current
  route inventory, post-Round-9 Card schema (25 fields).
- `docs/blog-2026-06-intro.md`: project retrospective blog post
  (~1900 字), based on actual git log / cards.json / AGENTS.md
  evidence (not fabricated). Available in `.md` and brand-styled
  `.html`.
- `docs/pr-body-round-9.md`: PR description refresh for the
  merged PR #1.
- `CHANGELOG.md`: new file, Keep-a-Changelog format.

#### Round 22 — `scripts/handwrite-history.mjs` drift detection
- 9 hard-coded card slugs. If a slug is renamed / deleted in
  `cards.json`, the loop silently skips it. Added `writtenSlugs`
  Set + `console.warn` for any hard-coded slug not found.

#### Round 23 — scripts audit pass
- `add-myth-fact.mjs`: drift detection + skip counter.
- `draft-history.mjs`: `--limit` arg validation (reject 0 / negative).
- `draft-extras.mjs`: header comment fix (was "3 fields, ~$0.50",
  actually 2 fields, ~$0.15; myth/fact is hand-written in
  `add-myth-fact.mjs`).
- `draft-sources.mjs`: drop sources with missing / non-https URL
  (avoid broken-link rows on the detail page).
- `fix-descriptions.mjs`: success / fail counters.
- `backdate-timeline.mjs`: idempotency guard (refuse re-run without
  `--force` — would otherwise re-distribute dates and shift
  timeline).
- `add-coords.mjs`: drift detection on 12 hard-coded coords.
- `resize-cards.mjs`: DEPRECATED warning in header (replaced by
  `reencode-full-webp.mjs`).
- `reencode-full-webp.mjs`: idempotency guard (refuse re-run when
  `image_full` already points to `.webp` — `.png` sources have
  been deleted).

## [v0.1.0] — 2026-06-16 — "5-round audit done"

The first tag on the project. Marks the project as ship-ready after
5 design audit rounds (Round 8 / 9 / 12 / 13 / 14). Tagged at
commit `1297617`.

### Highlights

- **60 视觉图鉴** (12 kind × 5), 5 series (pet-breed-guide /
  wild-fauna-atlas / city-encyclopedia / festival-almanac /
  atlas-miscellany)
- **Knowledge graph**: 43/60 inline links, 22/60 reverse refs
- **Content**: 60/60 history (5-8 nodes each), 60/60 sources,
  60/60 quote + trivia, 10/60 hand-written myth + fact
- **Geography**: 12 geo-located cards on `/map` (Leaflet + OSM,
  client-side name search, gold-deep 36px pins)
- **Print-to-PDF**: 60 SSG routes at `/print/cards/[slug]`
  (A4 portrait, 3s auto-print with opt-out)
- **Discovery**: `/random`, `/browse` (308 → `/cards`), `/all`
  (3-axis index, 3 distinct layout families), `/search` (fuse.js
  fuzzy), `/timeline` (reverse-chrono)
- **/changelog** with 5 site milestone entries + per-card
  created / revised entries
- **README + brand-styled blog post**

### Audit history at v0.1.0

- Round 8: taste-skill + ui-ux-pro-max full audit, 20 findings
  in one commit (19 files, +989/-427). Critical fixes included
  theme FOUC inline bootstrap script, 4 real a11y bugs, `/browse`
  → `/cards` consolidation, map popup XSS sink, map UX.
- Round 9: 10 hand-written `myth` + `fact` micro-blocks in
  detail page info panel.
- Round 12: impeccable + landing-page-generator joint audit,
  6 polish fixes (biggest: `/cards` `?tag=` filter now actually
  filters, page.tsx hero "信息归档" replaced gibberish
  "模块信息").
- Round 13: `/all` view 2 side-stripe border removal.
- Round 14: `/series` tab 44px touch target, `/about` em-dash.

For rounds 15–21 (post-tag polish), see the
**[Unreleased]** section above.