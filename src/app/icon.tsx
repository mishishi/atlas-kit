import { ImageResponse } from "next/og";
import { EDGE_TOKENS as T } from "@/lib/edge-tokens";

// Edge runtime (favicon) — cannot use CSS vars. EDGE_TOKENS keeps
// the gradient + text color in sync with the rest of the brand.
export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(135deg, ${T.gold} 0%, ${T.goldDeep} 100%)`,
          color: T.cream,
          fontSize: "22px",
          fontFamily: "serif",
          fontWeight: 700,
          borderRadius: "6px",
        }}
      >
        A
      </div>
    ),
    { ...size },
  );
}
