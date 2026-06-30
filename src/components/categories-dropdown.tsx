"use client";

/**
 * P (2026-06-30): Categories dropdown for the header.
 *
 * Replaces the old plain "/cards" link in the desktop nav. Click
 * opens a 2-column mega menu:
 *   col 1: browse modes (全部图鉴 / 按系列 / 按类型 / 索引 / 地图)
 *   col 2: 26 kind chips, sorted by label
 *
 * Mobile: stays as a direct link to /cards (the dropdown is too
 * tall to fit a mobile bottom nav; tapping goes straight to the
 * chips page).
 *
 * Implementation: click-outside + Escape close (same pattern as
 * ShareActions popover R60+). No Radix, no headlessui — just useState
 * + a useEffect for outside click + a backdrop element on mobile.
 *
 * Why not a Radix Popover: the project's "no Radix unless ≥3 sites
 * need the same primitive" rule (per AGENTS.md). This is the first
 * mega-menu, and we already have ShareActions' popover as a model.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LayoutGrid, ListOrdered, Layers, Map, Compass, X } from "lucide-react";
import { THEME_TYPES } from "@/lib/theme-types";
import { KIND_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

const BROWSE_MODES = [
  { href: "/cards", label: "全部图鉴", icon: LayoutGrid, desc: "600 张 · 26 个分类" },
  { href: "/series", label: "按系列", icon: Compass, desc: "12 个系列浏览" },
  { href: "/all", label: "索引 (按字数/系列/类型)", icon: ListOrdered, desc: "3 个视角" },
  { href: "/map", label: "地图视图", icon: Map, desc: "12 个地理坐标" },
] as const;

export function CategoriesDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname() ?? "/";

  // Active state: any /cards or /series or /all or /map or kind-filter
  // route counts as "categories" being active.
  const isActive =
    pathname === "/cards" ||
    pathname.startsWith("/cards?") ||
    pathname.startsWith("/series") ||
    pathname === "/all" ||
    pathname === "/map" ||
    pathname.startsWith("/map?");

  // Close on outside click + Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex items-center gap-1.5 rounded-md min-h-[44px] px-3 py-2 text-sm transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isActive
            ? "bg-muted text-foreground font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
        )}
      >
        <Layers className="h-4 w-4" aria-hidden="true" />
        分类
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="图鉴分类导航"
          className="absolute right-0 top-full mt-2 w-[min(640px,calc(100vw-2rem))] rounded-lg border border-border bg-card shadow-card-hover p-4 z-50"
        >
          {/* Mobile close button — desktop uses outside click */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="关闭"
            className="md:hidden absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Col 1: browse modes */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 mb-2">
                浏览方式
              </p>
              <ul className="space-y-1 list-none p-0">
                {BROWSE_MODES.map((m) => {
                  const Icon = m.icon;
                  return (
                    <li key={m.href}>
                      <Link
                        href={m.href}
                        onClick={() => setOpen(false)}
                        className="group flex items-start gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
                      >
                        <Icon className="h-4 w-4 mt-0.5 text-gold-deep shrink-0" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium group-hover:text-gold-deep transition-colors">
                            {m.label}
                          </p>
                          <p className="text-[10px] text-muted-foreground leading-tight">
                            {m.desc}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Col 2: kind chips, 2-col inside the col for density */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 mb-2">
                按类型 ({THEME_TYPES.length})
              </p>
              <ul className="grid grid-cols-2 gap-1 list-none p-0 max-h-64 overflow-y-auto pr-1">
                {THEME_TYPES.map((t) => (
                  <li key={t.key}>
                    <Link
                      href={`/cards?kind=${t.key}`}
                      onClick={() => setOpen(false)}
                      className="block rounded-sm px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
                    >
                      {KIND_LABELS[t.key as keyof typeof KIND_LABELS] ?? t.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}