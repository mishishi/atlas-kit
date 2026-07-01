"use client";

/**
 * PWA registration + install prompt + offline status banner.
 *
 * Three concerns share this single client island because they all
 * touch the same lifecycle:
 *   1. Service worker registration (offline support)
 *   2. beforeinstallprompt capture → custom install button
 *      (Chrome / Edge / Samsung; iOS Safari shows its own "Add to
 *      Home Screen" sheet via Share menu, no API to intercept)
 *   3. Online/offline status pill (helps users notice when offline
 *      and confirms the SW fallback is working)
 *
 * The banner is intentionally compact (max 1 line + 1 button) so
 * the page's main content stays primary. The pill auto-fades after
 * 6 seconds unless the user toggles it; the install prompt stays
 * until dismissed or installed.
 */

import { useEffect, useState } from "react";
import { Download, WifiOff, Wifi, RefreshCw } from "lucide-react";

// `BeforeInstallPromptEvent` is the type Chrome ships. It's not
// in TS lib yet (Safari still hasn't shipped the API). Cast to
// any for the .prompt() + .userChoice call.
type DeferredPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function SwRegister() {
  const [showUpdateHint, setShowUpdateHint] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<DeferredPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [online, setOnline] = useState(true);
  const [showOfflinePill, setShowOfflinePill] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const onUpdate = () => {
      setShowUpdateHint(true);
      const t = setTimeout(() => setShowUpdateHint(false), 6000);
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
        // SW registration failed (private mode, unsupported browser).
        // Silent fallback: no offline support, but no error to user either.
      });

    // beforeinstallprompt — Chrome / Edge / Samsung fire this when
    // the SW + manifest are valid. Capture it so we can show our own
    // "Install" button instead of relying on the browser's auto-prompt.
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as DeferredPrompt);
    };
    // appinstalled — fires after the user accepts the install dialog.
    const onInstalled = () => {
      setDeferredPrompt(null);
      setInstalled(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    // Online / offline status. `online` is the live browser event;
    // we show a small pill at the bottom-right for ~6 seconds when
    // status flips, then auto-fade.
    const onOnline = () => {
      setOnline(true);
      setShowOfflinePill(true);
      setTimeout(() => setShowOfflinePill(false), 4000);
    };
    const onOffline = () => {
      setOnline(false);
      setShowOfflinePill(true);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    setOnline(navigator.onLine);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // PWA install button — only visible when beforeinstallprompt fired
  // AND the user hasn't installed yet. Hidden on iOS Safari (no API
  // intercept — users install via Share → Add to Home Screen).
  async function onInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    } else {
      // dismissed — keep prompt state in case the user changes mind
    }
  }

  if (installed) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-4 left-4 z-40 rounded-md bg-gold/10 border border-gold/30 px-3 py-2 text-xs text-gold-deep shadow-card"
      >
        已安装 · 图鉴社 已添加到主屏幕 ✓
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-40 flex flex-col items-start gap-2">
      {/* Install prompt */}
      {deferredPrompt && (
        <button
          type="button"
          onClick={onInstall}
          className="inline-flex items-center gap-2 rounded-md bg-gold-deep px-3 py-2 text-xs font-medium text-cream shadow-card hover:bg-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
          aria-label="安装图鉴社到主屏幕"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          安装 PWA
        </button>
      )}

      {/* Update ready pill */}
      {showUpdateHint && (
        <div
          role="status"
          aria-live="polite"
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground shadow-card"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          新版本就绪, 刷新页面以使用
        </div>
      )}

      {/* Online / offline status pill */}
      {showOfflinePill && !showUpdateHint && (
        <div
          role="status"
          aria-live="polite"
          className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs shadow-card ${
            online
              ? "border-border bg-card text-muted-foreground"
              : "border-gold/30 bg-gold/10 text-gold-deep"
          }`}
        >
          {online ? (
            <>
              <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
              已恢复网络
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
              已离线 · SW 仍可加载缓存
            </>
          )}
        </div>
      )}
    </div>
  );
}