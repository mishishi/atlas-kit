"use client";

// R40 (2026-06-21): Register the PWA service worker on first client load.
//
// Why a separate client island instead of inline <script> in layout.tsx:
// 1. Service worker registration requires navigator.serviceWorker which
//    doesn't exist in SSR; we need useEffect to gate it.
// 2. Renders a tiny "offline-ready" pill in the bottom-right when the SW
//    reports that it has finished precaching the static assets. The pill
//    fades away after 4 seconds. This is the standard PWA "install hint"
//    pattern — visible enough to be discoverable, quiet enough to not be
//    annoying for users who don't care.

import { useEffect, useState } from "react";

export function SwRegister() {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const onUpdate = () => {
      // New SW installed — show a tiny hint to refresh.
      setShowHint(true);
      const t = setTimeout(() => setShowHint(false), 4000);
      return () => clearTimeout(t);
    };

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        reg.addEventListener("updatefound", () => {
          const newSw = reg.installing;
          if (!newSw) return;
          newSw.addEventListener("statechange", () => {
            if (
              newSw.state === "activated" &&
              navigator.serviceWorker.controller
            ) {
              onUpdate();
            }
          });
        });
      })
      .catch(() => {
        // SW registration failed (private mode, unsupported browser, etc.).
        // Silently fall back to no-offline support.
      });
  }, []);

  if (!showHint) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 rounded-md bg-card border border-border shadow-card px-3 py-2 text-xs text-muted-foreground animate-fade-in"
    >
      新版本就绪 · 刷新页面以使用
    </div>
  );
}