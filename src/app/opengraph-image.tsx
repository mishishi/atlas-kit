import { ImageResponse } from "next/og";
import { EDGE_TOKENS as T } from "@/lib/edge-tokens";

// 2026-06-21: switched from edge to nodejs runtime.
// Vercel Edge functions have a 1MB code size limit, and satori + resvg
// (next/og's renderer) blow past that at ~1MB+ for non-trivial OG images.
// nodejs serverless functions have a 300MB limit on Hobby.
// Side benefit: /opengraph-image works in `npm run dev` too (edge
// runtime in dev mode can't read filesystem during data-collection,
// returning 502; the env loading + EDGE_TOKENS pattern works fine
// in node runtime).
export const runtime = "nodejs";
// Force on-demand rendering (not static prerender at build time).
// Without this, next build tries to evaluate ImageResponse during
// static page generation, which hits a TypeError in @vercel/og's
// fileURLToPath call (it expects import.meta.url to resolve to a
// valid path inside the function bundle, which doesn't happen at
// build time). Setting dynamic to force-dynamic makes next treat
// this as a per-request serverless function instead.
export const dynamic = "force-dynamic";
export const alt = "图鉴社 · Atlas Kit — 系列化中文科普图鉴";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Cream-deeper for the gradient end (used in this file only,
// ~5% darker than EDGE_TOKENS.cream). Kept inline as a local
// constant since it doesn't appear elsewhere in the brand.
const CREAM_DEEP = "#EBE3D2";

// R56 (2026-06-23): Drop the 4-card thumbnail grid. Earlier this
// version tried to fetch `c.image` (CloudBase CDN URLs) inline via
// satori, but the Vercel node-runtime function was returning 500
// on every request — likely the inline fetch was failing (network
// timeout / CORS from serverless). Pure-text OG is more reliable
// across hosting changes; if we want thumbnails back, embed as
// base64 in cards.json (R60+).
const STATS = "600 张图鉴 · 26 个分类 · AI 一键生成";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: `linear-gradient(135deg, ${T.cream} 0%, ${CREAM_DEEP} 100%)`,
          padding: "80px",
          fontFamily: "serif",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* Top: brand block */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "88px",
              height: "88px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "16px",
              background: `linear-gradient(135deg, ${T.gold} 0%, ${T.goldDeep} 100%)`,
              color: T.cream,
              fontSize: "52px",
              fontWeight: "bold",
              boxShadow: "0 8px 24px rgba(60, 50, 30, 0.15)",
            }}
          >
            A
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: "44px", fontWeight: 700, color: T.ink, lineHeight: 1.1 }}>
              图鉴社
            </div>
            <div
              style={{
                fontSize: "20px",
                color: T.inkSoft,
                letterSpacing: "0.25em",
                marginTop: "4px",
              }}
            >
              ATLAS KIT
            </div>
          </div>
        </div>

        {/* Middle: title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontSize: "76px",
              fontWeight: 700,
              color: T.ink,
              lineHeight: 1.1,
            }}
          >
            知识整理 · 信息归档
          </div>
          <div
            style={{
              fontSize: "76px",
              fontWeight: 700,
              color: T.goldDeep,
              lineHeight: 1.1,
              marginTop: "12px",
            }}
          >
            图鉴式展示
          </div>
          <div
            style={{
              fontSize: "26px",
              color: T.inkSoft,
              marginTop: "32px",
              lineHeight: 1.4,
            }}
          >
            系列化中文科普图鉴卡片集 · 博物馆质感
          </div>
        </div>

        {/* Bottom: stats */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            fontSize: "22px",
            color: T.inkSoft,
            paddingTop: "32px",
            borderTop: `2px solid ${T.creamDeep}`,
          }}
        >
          <div style={{ fontWeight: 600, color: T.goldDeep }}>{STATS}</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
