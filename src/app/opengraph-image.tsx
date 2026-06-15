import { ImageResponse } from "next/og";
import { getAllCards } from "@/lib/data";
import { SERIES_TYPE_MAP } from "@/lib/series-types";
import { EDGE_TOKENS as T } from "@/lib/edge-tokens";

// Edge runtime (next/og) — cannot use CSS vars. EDGE_TOKENS keeps
// the brand colors in sync with the rest of the design system.
export const runtime = "edge";
export const alt = "图鉴社 · Atlas Kit — 系列化中文科普图鉴";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Cream-deeper for the gradient end (used in this file only,
// ~5% darker than EDGE_TOKENS.cream). Kept inline as a local
// constant since it doesn't appear elsewhere in the brand.
const CREAM_DEEP = "#EBE3D2";

export default async function Image() {
  const cards = getAllCards().slice(0, 4);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: `linear-gradient(135deg, ${T.cream} 0%, ${CREAM_DEEP} 100%)`,
          padding: "60px",
          fontFamily: "serif",
        }}
      >
        {/* Left: title + tagline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1,
            paddingRight: "40px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "12px",
                background: `linear-gradient(135deg, ${T.gold} 0%, ${T.goldDeep} 100%)`,
                color: T.cream,
                fontSize: "36px",
                fontWeight: "bold",
              }}
            >
              A
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "32px", fontWeight: 700, color: T.ink }}>
                图鉴社
              </div>
              <div
                style={{
                  fontSize: "16px",
                  color: T.inkSoft,
                  letterSpacing: "0.2em",
                  marginTop: "2px",
                }}
              >
                ATLAS KIT
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", marginTop: "32px" }}>
            <div
              style={{
                fontSize: "52px",
                fontWeight: 700,
                color: T.ink,
                lineHeight: 1.15,
                fontStyle: "italic",
              }}
            >
              知识整理 · 模块信息
            </div>
            <div
              style={{
                fontSize: "52px",
                fontWeight: 700,
                color: T.goldDeep,
                lineHeight: 1.15,
                marginTop: "8px",
              }}
            >
              图鉴式展示
            </div>
            <div
              style={{
                fontSize: "20px",
                color: T.inkSoft,
                marginTop: "24px",
                lineHeight: 1.4,
              }}
            >
              系列化中文科普图鉴卡片集 · 博物馆质感
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "24px",
              fontSize: "16px",
              color: T.inkSoft,
            }}
          >
            <div>{cards.length}+ 张图鉴</div>
            <div>·</div>
            <div>{Object.keys(SERIES_TYPE_MAP).length} 个系列</div>
            <div>·</div>
            <div>AI 一键生成</div>
          </div>
        </div>

        {/* Right: 4 card thumbnails in 2x2 grid */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            width: "440px",
            height: "510px",
            gap: "12px",
          }}
        >
          {cards.map((c) => (
            <div
              key={c.slug}
              style={{
                position: "relative",
                width: "214px",
                height: "249px",
                borderRadius: "12px",
                overflow: "hidden",
                background: c.palette[0],
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 24px rgba(60, 50, 30, 0.15)",
                border: `2px solid ${c.palette[1]}`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.image}
                alt={c.title}
                width="214"
                height="249"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
