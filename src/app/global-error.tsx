"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, Home, RefreshCw } from "lucide-react";
import { EDGE_TOKENS as T } from "@/lib/edge-tokens";

// global-error.tsx runs OUTSIDE the root layout, so:
//   - Tailwind classes don't work (CSS bundle not yet applied)
//   - CSS vars in globals.css are not yet resolvable
//   - All styling must be inline with explicit values
// We import EDGE_TOKENS so the colors stay in sync with the
// rest of the brand (light-mode cream + gold + ink).
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Could forward to analytics here
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body
        style={{
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
          background: T.cream,
          color: T.ink,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "480px", textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              width: "72px",
              height: "72px",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              background: T.destructiveSoft,
              border: `2px dashed ${T.destructive}`,
              marginBottom: "20px",
            }}
          >
            <AlertCircle size={36} color={T.destructive} aria-hidden="true" />
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, margin: "0 0 8px" }}>
            应用出现异常
          </h1>
          <p style={{ color: T.inkSoft, lineHeight: 1.5, margin: "0 0 24px" }}>
            页面遇到了一个未捕获的错误。刷新试试, 或回到首页继续浏览。
          </p>
          {error.digest && (
            <p
              style={{
                fontSize: "12px",
                fontFamily: "monospace",
                color: T.inkMute,
                marginBottom: "24px",
              }}
            >
              错误 ID: {error.digest}
            </p>
          )}
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button
              onClick={reset}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                minHeight: "44px",
                padding: "10px 20px",
                background: T.goldDeep,
                color: T.cream,
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <RefreshCw size={16} aria-hidden="true" />
              重试
            </button>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                minHeight: "44px",
                padding: "10px 20px",
                background: T.white,
                color: T.ink,
                border: `1px solid ${T.creamDeep}`,
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              <Home size={16} aria-hidden="true" />
              回到首页
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
