import { ImageResponse } from "next/og";

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
          background: "linear-gradient(135deg, #B8956A 0%, #8C6F4D 100%)",
          color: "#F5F0E6",
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
