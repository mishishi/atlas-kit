"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";

/**
 * 3-state cycle: system → light → dark → system.
 * The icon reflects the *current* mode (which is `system` if
 * `theme === "system"` and we resolve by the OS preference).
 * Clicking advances to the next state, so users can always
 * return to "follow OS" by cycling past dark.
 */
export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();

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

  const Icon = theme === "system" ? Monitor : theme === "light" ? Sun : Moon;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={advance}
      className={cn(
        "grid h-11 w-11 min-h-[44px] min-w-[44px] place-items-center rounded-md border border-border bg-card",
        "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "transition-colors",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}