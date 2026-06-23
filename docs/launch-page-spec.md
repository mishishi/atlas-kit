# Atlas Kit Launch Page — Design Spec

## Project Context

**Atlas Kit · 图鉴社** is a 391-card visual encyclopedia in Chinese, designed like flipping through a museum guide. Image-first, anti-gacha (no rarity / no SSR / no levels), open source on GitHub.

This landing page is a marketing surface for the **launch** of the project on Product Hunt + V2EX + Twitter. It must:
1. Communicate the "museum / encyclopedia / anti-RPG" positioning in 5 seconds
2. Show actual card samples (so visitors know what they're clicking into)
3. Have one clear CTA: "进入图鉴社" → atlas-kit-six.vercel.app
4. Secondary CTA: GitHub repo (mishishi/atlas-kit)

Production URL: https://atlas-kit-six.vercel.app
GitHub: https://github.com/mishishi/atlas-kit

## Hero Section — Video-Led

A muted autoplay cinematic loop, 1080p minimum, atmospheric and looping. Sets the museum / dark-cinematic tone immediately.

**Concept**: A single card sits on a dark museum pedestal, lit by warm directional light. Camera slowly pushes in (15s loop) toward the card. Gold-foil accents catch the light. Background fades to deep charcoal.

**Cinematic keywords for gen_videos**:
> "A single illustrated encyclopedia card sits on a dark museum pedestal, warm directional spotlight from upper left, gold foil accents catching light, camera slowly pushing in over 15 seconds, cinematic shallow depth of field 85mm f/1.8, dark museum gallery background, hyper-realistic, 8k, Arri Alexa"

**Overlay**: Giant serif title "图鉴社" in cream, "ATLAS KIT" in tracked sans below, single sentence tagline: "系列化中文科普图鉴卡片集 · 博物馆质感". Two CTA buttons (primary gold, secondary outline).

## Typography

| Use | Font | Spec |
|---|---|---|
| Display (titles, hero) | Noto Serif SC Variable | 100–900 weight, italics for emphasis |
| Body | Noto Sans SC Variable | 400–600 |
| Mono / labels | Geist Mono | tracked 0.25em, uppercase for tag pills |

**Scale**:
- Hero title: 120px (desktop) / 64px (mobile)
- H2 section: 56px / 36px
- H3 card name: 24px
- Body: 18px / 1.6 line-height
- Caption / label: 13px / tracked 0.2em

## Layout Structure (top to bottom)

1. **Hero** — 100vh, video background, centered text overlay
2. **Stats strip** — "391 张图鉴 · 12 个分类 · 5 个系列 · 1 个开源项目" with thin gold dividers
3. **Sample cards** — 3-column grid of 9 actual cards (mix of kinds: pet / city / festival / food / anime / music / history / architecture / craft), each with thumbnail + title + 1-line tagline + kind tag
4. **Why it exists** — editorial split: left = "市面 AI 生图" (text wall, broken Chinese, gacha patterns), right = "图鉴社" (image-first, museum quality, anti-RPG)
5. **Features** — 4-up grid: Image-first / 9 模块骨架 / 知识图谱 / 收藏夹
6. **Tech** — single line: "Next.js 14 · Tailwind · mavis MCP · CloudBase · MIT"
7. **CTA footer** — "进入图鉴社" big gold button + "GitHub" outline button + copyright

## Motion / Animation

- Hero video: autoplay muted, infinite loop
- Scroll-triggered fade-up on each section (IntersectionObserver, 0.1 threshold)
- Sample cards: hover lifts (`translateY(-8px)`) + image scale 1.04 + gold underline animation on title
- Stats: number counters animate from 0 → 391 on first viewport entry (200ms ease-out, no bounce)
- CTA buttons: subtle gold-glow pulse on hero CTA only (3s loop, infinite)
- Reduce-motion: respect `prefers-reduced-motion`, skip all animations except video (still paused instead of autoplay)

## Tech Strategy

- **Stack**: Pure HTML + CSS + vanilla JS. No framework. (Landing page is static, no SSR needed.)
- **Hosting**: Deploy tool (Vercel-style)
- **Assets**:
  - 1 hero video (1080p, ~5-10 MB, mp4, h264)
  - 9 card thumbnails (already on CloudBase CDN, hotlink directly)
  - 1 favicon (gold-gradient A mark, 32x32 SVG inline)
- **Performance budget**: First contentful paint < 1.5s, total page weight < 12 MB (video dominates)
- **Responsive**: Mobile-first. Stack columns at < 768px. Hero text shrinks to 64px. Stats become 2x2 grid.
- **Fonts**: Inline-load Noto Serif SC + Noto Sans SC subsets via Google Fonts (variable axis, single woff2 per family, ~80KB each)

## Design System

### Color Palette (NO blue / purple)

| Token | Hex | Use |
|---|---|---|
| `--ink` | `#1A1814` | Background base, text on cream |
| `--ink-soft` | `#3A342B` | Body text on cream |
| `--ink-mute` | `#7A7264` | Captions, labels |
| `--cream` | `#F5F0E6` | Page background, surface |
| `--cream-deep` | `#E5DED0` | Borders, dividers |
| `--gold` | `#B8956A` | Accent, CTA hover, focus ring |
| `--gold-deep` | `#87603F` | CTA background, brand primary |
| `--terracotta` | `#C97064` | Destructive / "市面 AI" comparison column |
| `--forest` | `#5C7A4F` | Success / "图鉴社" comparison column |

**Hero background**: `--ink` with subtle paper-grain texture (CSS noise filter).
**Sample cards section**: `--cream`.
**Why-it-exists section**: left col `--cream-deep` (terracotta accent), right col `--cream` (forest accent) — split-screen editorial.

### Spacing
8px base unit. Sections separated by 120px (desktop) / 64px (mobile). Content max-width 1280px, centered with 24px gutters.

### Border radius
- Cards / buttons: 12px
- Pills / tags: 999px
- Large image containers: 16px

## Asset Plan

| File | Format | Source | Notes |
|---|---|---|---|
| `videos/hero_loop.mp4` | 1080p mp4 | matrix `gen_videos` | 15s slow push-in, dark museum pedestal |
| `imgs/og-preview.png` | 1200x630 PNG | matrix `gen_images` | Static OG / social card fallback |
| Card thumbnails | from CDN | hotlink atlas-kit-six.vercel.app CDN URLs | 9 cards: labrador-retriever, hangzhou, dragon-boat, peking-duck, your-scent, sanxingdui, potala-palace, longjing-tea, abacus |

## Open Questions

None — proceeding with expert defaults. User has launched ready copy for PH/V2EX/Twitter; the landing page is the visual companion.