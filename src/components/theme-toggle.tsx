"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";

/**
 * 3-state cycle: system → light → dark → system.
 * The icon reflects the *current* mode (which is `system` if
 * `theme === "system"` and we resolve by the OS preference).
 * Clicking advances to the next state, so users can always
 * return to "follow OS" by cycling past dark.
 *
 * SSR / hydration:
 *   layout.tsx sets `defaultTheme="light"` → SSR always renders the
 *   Sun icon (no <rect>, no <circle> child swap). Client reads
 *   localStorage which may have any of the 3 values → would pick a
 *   DIFFERENT icon (Monitor = <rect>+<path>, Moon = pure <path>),
 *   triggering "Expected server HTML to contain a matching <rect>
 *   in <svg>".
 *
 *   Fix: gate the icon behind a `mounted` flag. SSR + first client
 *   paint both render Sun (matches defaultTheme). After hydration
 *   the useEffect flips `mounted` and the real icon appears. The
 *   `suppressHydrationWarning` on the button doesn't reach deep SVG
 *   child mismatches per React 18's hydration algorithm — the gate
 *   is the only reliable fix.
 */
export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const advance = () => {
    if (theme === "system") setTheme("light");
    else if (theme === "light") setTheme("dark");
    else setTheme("system");
  };

  const label =
    theme === "system"
      ? `跟随系统 (当前: ${resolvedTheme === "dark" ? "深色" : "浅色"}), 点击切换到浅色`
      : theme === "light"
        ? "当前: 浅色模式, 点击切换到深色"
        : "当前: 深色模式, 点击恢复跟随系统";

  // Until mounted: render a placeholder that matches what SSR produced
  // (Sun, no <rect>) so hydration is consistent. After mount: real icon.
  // Pre-mount, we still need a sensible aria-label — show "切换主题".
  const preMountLabel = "切换主题";
  const realLabel = mounted ? label : preMountLabel;

  const Icon =
    !mounted
      ? Sun
      : theme === "system"
        ? Monitor
        : theme === "light"
          ? Sun
          : Moon;

  return (
    <button
      type="button"
      aria-label={realLabel}
      title={realLabel}
      onClick={mounted ? advance : undefined}
      disabled={!mounted}
      className={cn(
        "grid h-11 w-11 min-h-[44px] min-w-[44px] place-items-center rounded-md border border-border bg-card",
        "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "transition-colors",
        "disabled:cursor-default",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}