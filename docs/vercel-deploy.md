# Atlas Kit · Vercel Deploy Checklist

> Source-of-truth: `next.config.mjs`, `src/app/api/generate/route.ts`, `src/app/layout.tsx`
> All env vars documented in `.env.local.example` (repo root).
> Last verified: 2026-06-15 (post-`756e534`).

## Pre-flight (already done in this repo)

- [x] `MAX_REQUESTS = 3` in `src/lib/rate-limit.ts` (production rate limit)
- [x] `dynamicParams = false` on `/cards/[slug]` and `/series/[slug]` (real 404 on unknown slugs)
- [x] Local Noto Sans/Serif SC VF fonts in `src/app/fonts/` (no Google Fonts CDN call)
- [x] Security headers in `next.config.mjs` (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy)
- [x] 60/60 cards with images in `data/cards.json` + `public/cards/`
- [x] Build clean (`next build` → 78 routes, 87.3 kB First Load JS)
- [x] GitHub repo: https://github.com/mishishi/atlas-kit (master @ `756e534`)

## Step 1 — Import the repo

1. Go to https://vercel.com/new
2. Sign in with GitHub
3. Click **"Import"** next to `mishishi/atlas-kit`
4. **Project Name**: `atlas-kit` (or your preferred subdomain)
5. **Framework Preset**: Next.js (auto-detected)
6. **Root Directory**: `./` (default)
7. **Build & Output settings**: leave defaults (Vercel auto-detects Next.js 14)
   - Build Command: `next build` (or empty for default)
   - Output Directory: `.next` (default)
   - Install Command: `npm install` (default)

Click **Deploy**. First deploy will fail because env vars are missing. That's expected — proceed to Step 2.

## Step 2 — Set environment variables

Go to **Project Settings → Environment Variables**. Add these (Production scope, optionally Preview + Development):

| Key | Value (Production) | Required? | Notes |
|---|---|---|---|
| `SITE_URL` | `https://atlas-kit.vercel.app` (or your custom domain) | **Yes** | Used by `metadataBase` in `src/app/layout.tsx` line 45, sitemap, robots, OG image. **Must include scheme, no trailing slash**. |
| `IMAGE_PROVIDER` | `matrix` | **Yes** | mavis CLI for image generation. Other valid values: `minimax`, `hailuo` (alias), `openai`. |
| `MAVIS_DAEMON_URL` | `http://127.0.0.1:15321` | **Yes (if matrix)** | The mavis daemon endpoint. **If you run mavis on the same host as Vercel, leave default.** If you deploy daemon to a different host (e.g., a VPS), put that URL here. **The daemon must be publicly reachable from Vercel for the wizard to work** — see Step 4. |
| `MINIMAX_API_KEY` | your_key_here | Only if `IMAGE_PROVIDER=minimax`/`hailuo` | https://platform.minimaxi.com/user-center/basic-information/interface-key |
| `OPENAI_API_KEY` | your_key_here | Only if `IMAGE_PROVIDER=openai` | https://platform.openai.com/api-keys |
| `MAVIS_BIN_PATH` | leave empty | No | Commented out in `.env.local.example`; not used in current code (route.ts fetches daemon HTTP directly). |

### Where to find mavis daemon port

The mavis daemon listens on a random port stored in `~/.mavis/daemon.port`. Read it with:

```bash
cat ~/.mavis/daemon.port    # Linux/macOS
Get-Content C:\Users\zrb03\.mavis\daemon.port   # Windows PowerShell
```

Or hardcode: defaults to `15321` if `daemon.port` file is missing (see `src/app/api/generate/route.ts` fallback).

## Step 3 — Re-deploy

After saving env vars, go to **Deployments** tab → click the three-dot menu on the latest deployment → **Redeploy**. (Env vars do not apply to already-built deployments.)

Build should succeed. Test the deployed URL:
- `/` → home (200)
- `/cards` → all cards (200)
- `/cards/labrador-retriever` → real card (200)
- `/cards/this-does-not-exist` → 404 (now real, was 200 pre-`756e534`)
- `/series/pet-breed-guide` → real series (200)
- `/create` → wizard (200)

## Step 4 — Matrix daemon reachability (CRITICAL for wizard)

The generation wizard at `/create` calls `POST ${MAVIS_DAEMON_URL}/mavis/api/mcp/call` server-side (see `src/app/api/generate/route.ts`). This will **fail with ECONNREFUSED** if Vercel can't reach your daemon.

**Three solutions** (pick one):

### Option A — Tunnel via Cloudflare Tunnel (recommended for personal projects)

```bash
# On the host running mavis daemon:
cloudflared tunnel --url http://localhost:15321
# Copy the https://*.trycloudflare.com URL
# Set MAVIS_DAEMON_URL=https://your-tunnel.trycloudflare.com in Vercel
```

Pros: no firewall holes, free, daemon stays private.
Cons: tunnel URL changes on restart (or pay $5/mo for named tunnel).

### Option B — Public VPS + reverse proxy

Run mavis daemon on a VPS with HTTPS reverse proxy (Caddy / nginx + Let's Encrypt). Set `MAVIS_DAEMON_URL=https://mavis.yourdomain.com`.

Pros: stable URL, production-grade.
Cons: $5/mo VPS, ops overhead.

### Option C — Disable wizard (MVP-only)

Set `IMAGE_PROVIDER=openai` and `OPENAI_API_KEY=...` instead of matrix. OpenAI API is public-reachable, no daemon needed. **Tradeoff**: OpenAI's Chinese text rendering on museum-card prompts is noticeably worse than matrix (per `docs/ai-image-gen.md` if you have it).

Pros: zero ops.
Cons: image quality drop, costs money per generation.

## Step 5 — Custom domain (optional)

1. Buy a domain (Namecheap, Cloudflare Registrar, etc.)
2. In Vercel: **Project Settings → Domains** → add `yourdomain.com`
3. Vercel shows DNS records to add. Two common setups:
   - **Apex (`yourdomain.com`)**: add `A` record `@` → `76.76.21.21`
   - **Subdomain (`www.yourdomain.com`)**: add `CNAME` `www` → `cname.vercel-dns.com`
4. Wait for DNS propagation (up to 48h, usually <1h)
5. Vercel auto-provisions Let's Encrypt cert
6. Update `SITE_URL` env var to `https://yourdomain.com` and redeploy

## Step 6 — Post-deploy smoke test

```bash
# Replace YOUR_DOMAIN with the actual URL
DOMAIN="https://atlas-kit.vercel.app"

# Status code test
for path in / /cards /cards/labrador-retriever /cards/this-does-not-exist \
            /series/pet-breed-guide /series/this-does-not-exist \
            /create /about /search /sitemap.xml; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$DOMAIN$path")
  echo "$code  $path"
done

# Expected: 200 200 200 404 200 404 200 200 200 200
```

## Rollback

If deploy breaks:
1. Vercel → **Deployments** → find a working previous deploy
2. Click three-dot menu → **Promote to Production**
3. (Or) git revert + push; Vercel auto-deploys the revert

## Monitoring (nice-to-have)

Vercel provides free logs + analytics. For uptime monitoring:
- UptimeRobot (free tier, 50 monitors)
- Better Stack (free tier)
- Healthchecks.io (free tier)

Ping `/` every 5 min; alert if non-200.

## Cost

Vercel free tier (Hobby):
- 100 GB bandwidth / month
- Unlimited deployments
- 1 concurrent build
- 10s serverless function timeout

Atlas Kit expected usage:
- ~50 MB per home page (1.5 MB × 5 series covers + ~1 MB JS/CSS)
- ~5 MB per card detail (5.7 MB full image + 200 KB JS)
- 100 GB / 50 MB = ~2000 page views / month at full quality

If you exceed, either:
- Vercel Pro ($20/mo, 1 TB bandwidth, 60s timeout)
- Switch covers to a CDN with image optimization (Cloudflare Images, Cloudinary)

## Common issues

| Issue | Fix |
|---|---|
| Build fails with "Cannot find module 'next/font/local'" | Verify `src/app/fonts/NotoSansSC-VF.ttf` and `NotoSerifSC-VF.ttf` are committed (currently in `.gitignore`? Check `git ls-files src/app/fonts/`) |
| Build fails with "Module not found: Can't resolve '@/lib/...'" | Check `tsconfig.json` has `paths: { "@/*": ["./src/*"] }` — already set, no action needed |
| Deploy succeeds but `/cards/[any]` returns 404 | `generateStaticParams` didn't list those slugs — verify `data/cards.json` has them with English slugs |
| Wizard says "AI 生成失败" | Daemon unreachable. Check `MAVIS_DAEMON_URL` + Vercel function logs. See Step 4. |
| OpenGraph image shows 502 | Known Next.js 14 dev quirk; works in production. If still failing in prod, check `/opengraph-image?xxx` directly. |

## Reference

- `next.config.mjs` — security headers, bundle analyzer
- `src/app/layout.tsx` — `metadataBase` from `SITE_URL`, fonts
- `src/app/api/generate/route.ts` — daemon HTTP fetch logic
- `src/lib/rate-limit.ts` — `MAX_REQUESTS = 3`
- `AGENTS.md` — project memory (deploy checklist there is shorter)
