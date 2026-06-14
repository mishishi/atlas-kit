# Atlas Kit · design-taste-frontend Review (2026-06-14)

> Source-of-truth: taste-skill (Leonxlnx/taste-skill), installed at
> `~/.mavis/agents/mavis/skills/design-taste-frontend/SKILL.md` (1206 行, 88KB)
>
> **Design read**: editorial / 图鉴 encyclopedia + AI generation tool, warm-craft
> editorial, Noto Serif SC display + restrained motion + 12-card bento + cream
> paper ground.
>
> **Dials**: VARIANCE 6 · MOTION 4 · DENSITY 4

## Pre-Flight Summary

| Check | Expect | Actual | Verdict |
|---|---|---|---|
| Eyebrow per page (≤ ceil(sections/3)) | home ≤3 / detail ≤1 | home 6 / detail 3 | 🟠 over |
| Layout family diversity | ≥ 4 per 8 sections | series/row 5× same | 🔴 fail |
| Zigzag cap (max 2 consec image+text) | ≤ 2 | cards/[slug] 同类+同系+延伸 = 3 | 🔴 fail |
| Hero stack (max 4 text elements) | 4 | home 5 | 🟠 over |
| Hero subtext (≤ 20 words) | 20 | 38 字 | 🟠 over |
| Bento background diversity | 2-3 of 6 cells vary | home stat 0/4 vary | 🟡 minor |
| Theme lock | 1 page = 1 theme | global unified | 🟢 |
| CTA wrap / dup intent | none | none | 🟢 |
| Button contrast AA 4.5:1 | 4.5 | gold+cream = 3.2 | 🟡 minor (large-text OK) |
| Serif discipline | sans default | Noto Serif SC Chinese | 🟢 (editorial override) |
| Cream+Brass+Ink palette | banned as default | used throughout | 🟢 (override via brand: 图鉴/博物馆) |
| Animate transform/opacity only | only xform/opacity | `animate-pulse` on badge | 🟡 minor |
| No emoji in code | 0 | 1 (☕ wizard) | 🟡 minor |
| `window.addEventListener('scroll')` ban | 0 | 0 (uses `window.scrollTo` for wizard step reset, not scroll listener) | 🟢 |
| URL-driven tabs/filter | yes | yes (series/[slug], cards) | 🟢 |

## Top 12 fixes (by ROI, commit separately)

| # | Severity | File | Change | Reason |
|---|---|---|---|---|
| 1 | 🔴 | `src/app/cards/[slug]/page.tsx` | 延伸阅读 2-col cards → 2 full-width text blocks | 3rd consecutive image+text-split = Pre-Fail |
| 2 | 🔴 | `src/app/series/page.tsx` + `src/app/series/[slug]/page.tsx` | 5 series row layouts → 5 different families (1+1, 1+3, 1+1+thumbs, 1+1 horizontal scroll, 1+stat-grid) | Section-Layout-Repetition Ban |
| 3 | 🔴 | `src/components/generation-wizard.tsx` | step 5 centered → left-align; `scale-[0.98]` x3 → no scale; collapse stepper (keep dots, drop breadcrumb) | Tactile feedback mis-use + UI dup |
| 4 | 🟠 | `src/app/page.tsx` | hero subtext 38字 → 20字; remove 1 element (pill eyebrow stays; subtext down) | Hero stack > 4 |
| 5 | 🟠 | `src/components/site-header.tsx` + `src/components/site-footer.tsx` + `src/app/cards/[slug]/page.tsx` | `bg-gradient-to-br from-gold to-gold-deep` → `bg-gold-deep` (logo + ShareActions) | Brand consistency |
| 6 | 🟠 | `src/components/generation-wizard.tsx` | stepper breadcrumb already collapsed in #3 | (combined) |
| 7 | 🟡 | `src/components/card-preview.tsx` | "新收录" badge `animate-pulse` → none | infinite loop @ MOTION=4 |
| 8 | 🟡 | `src/components/card-preview.tsx` | card eyebrow `text-[10px]` → `text-[9px]` opacity-70 | 60-card repeat soften |
| 9 | 🟡 | `src/app/search/page.tsx` + `src/components/share-actions.tsx` | "Twitter" → "X" | brand freshness |
| 10 | 🟡 | `src/components/generation-wizard.tsx` | emoji ☕ → Lucide Coffee icon | emoji policy |
| 11 | 🟡 | `src/app/cards/[slug]/page.tsx` | section 顺序: 同类 → 同系 → 相关搜索 → 延伸阅读 | editorial logic |
| 12 | 🟡 | `src/app/page.tsx` | 4-cell stat 改 1 cell cream 无 border | bento variety |

## Untouched (already aligned with skill)

- Cream + gold + ink palette (override: editorial / 图鉴 / 博物馆 brand)
- Noto Serif SC 标题 (中文 editorial 必要, Section 4.1 override 适用)
- 60 cards / 5 series / 12 kinds 数据完整性
- URL-driven tabs (series detail `?tab=`)
- localStorage wizard draft (debounced 300ms, 7d TTL)
- AbortController for wizard generation
- 12 kinds × 5 cards + 4 image tiers (sharp 3-tier)
- anti-RPG 文案 (no 稀有/星级/雷达图)
- a11y 全套 (skip link, aria-current, role=search/list/status, sr-only, focus-visible)
- Sharp image optimization (384w WebP thumb / 600w PNG card / 1024w PNG full)
- JSON-LD on detail pages
- Path-aware 404
- Security headers (next.config.mjs)
- Smoke test (28 routes, 27/28 pass)
- 12+ commits
