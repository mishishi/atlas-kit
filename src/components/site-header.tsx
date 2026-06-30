"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookMarked, Compass, Sparkles, Clock, Map, Network } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { FavoritesBadge } from "./favorites-badge";
import { CategoriesDropdown } from "./categories-dropdown";
import { cn } from "@/lib/utils";

// P (2026-06-30): "全部" (LayoutGrid) 替换为 CategoriesDropdown.
// 把 6 个直链 + 1 个 dropdown + 1 个生成图鉴 = 7 项, 没超 cap.
// Dropdown 内含 26 kind chips + 4 个浏览模式, 把 26 种选项从
// /cards 上的 chip row 复制成可发现的 1-click 入口。
const navItems = [
  { href: "/", label: "首页", icon: BookMarked },
  { href: "/series", label: "系列", icon: Compass },
  { href: "/graph", label: "图谱", icon: Network },
  { href: "/map", label: "地图", icon: Map },
  { href: "/timeline", label: "时间线", icon: Clock },
  { href: "/create", label: "生成图鉴", icon: Sparkles, accent: true },
];

export function SiteHeader() {
  const pathname = usePathname() ?? "/";

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      {/* Skip to main content — keyboard/screen-reader users get past nav in 1 tab */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-gold-deep focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-cream focus:shadow-card-hover focus:outline-none"
      >
        跳到主内容
      </a>
      <div className="container flex h-16 items-center justify-between">
        <Link
          href="/"
          aria-label="图鉴社 回到首页"
          className="flex items-center gap-2 group rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div className="grid h-8 w-8 place-items-center rounded-md bg-gold-deep text-cream shadow-card transition-transform group-hover:scale-105">
            <span className="font-serif text-lg font-bold" aria-hidden="true">A</span>
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-serif text-base font-semibold tracking-wide">图鉴社</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Atlas Kit</span>
          </div>
        </Link>

        <nav aria-label="主导航" className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={item.accent ? `${item.label} (AI 生成)` : item.label}
                className={cn(
                  "flex items-center gap-2 rounded-md min-h-[44px] px-3 py-2 text-sm transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  active
                    ? "bg-muted text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  item.accent && !active && "text-gold-deep hover:bg-gold/10",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
          {/* P: 分类 dropdown — desktop only, mobile keeps the 6
              flat links. Renders 26 kind chips + 4 browse modes in a
              2-col mega menu. */}
          <CategoriesDropdown />
        </nav>

        <div className="flex items-center gap-1">
          <FavoritesBadge />
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile nav */}
      <nav aria-label="主导航 (移动)" className="md:hidden flex items-center justify-around border-t border-border py-2">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              aria-label={item.accent ? `${item.label} (AI 生成)` : item.label}
              className={cn(
                // Round 20 fix: added `bg-muted` to the active branch so
                // mobile active state matches desktop (was text-only,
                // which made it visually weak against the 5 inactive
                // siblings in the row).
                "flex flex-col items-center gap-1 rounded-md min-h-[44px] px-3 py-2 text-xs transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                active
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted/50",
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}