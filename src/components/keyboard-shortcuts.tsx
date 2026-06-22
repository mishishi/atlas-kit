"use client";

// R41 (2026-06-21): Global keyboard shortcuts.
// R52 (2026-06-22): added g f (→ /favorites) + s (toggle favorite on
// current /cards/[slug]).
//
// What it handles:
//   /         → focus the search input (data-search-input attribute)
//   ?         → show this keyboard help modal
//   Escape    → close the help modal
//   g h       → go home /
//   g c       → go /cards
//   g s       → go /series
//   g t       → go /timeline
//   g g       → go /graph
//   g f       → go /favorites
//   s         → toggle favorite of current card (only on /cards/[slug])
//
// j/k for prev/next card are handled by CardNav itself (alongside
// ArrowLeft/Right). CardNav is mounted only on /cards/[slug], so the
// j/k scope is implicit. Global shortcuts here only fire outside
// input/textarea/contenteditable (don't hijack typing).

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  X,
  Search,
  Home,
  Library,
  GitBranch,
  Calendar,
  Network,
  ChevronRight,
  ChevronLeft,
  Lightbulb,
  Star,
} from "lucide-react";
import { useFavorites } from "@/lib/favorites";

const G_PREFIX_MS = 1000;

export function KeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const { toggle: toggleFavorite, hydrated: favHydrated } = useFavorites();
  const [helpOpen, setHelpOpen] = useState(false);
  // lastG lives in a ref so updates don't re-attach the listener.
  // We only depend on `helpOpen` in the effect (Escape needs to
  // see the latest value to early-return when modal is open).
  const lastG = useRef(0);
  const helpOpenRef = useRef(helpOpen);
  helpOpenRef.current = helpOpen;

  // Derive current slug from /cards/[slug] path. Used by `s` shortcut.
  const currentSlug = pathname.match(/^\/cards\/([\w-]+)\/?$/)
    ? RegExp.$1
    : null;

  useEffect(() => {
    function isTypingTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (target.isContentEditable) return true;
      return false;
    }

    function onKey(e: KeyboardEvent) {
      const key = e.key;

      // Escape closes the help modal regardless of focus.
      if (key === "Escape" && helpOpenRef.current) {
        e.preventDefault();
        setHelpOpen(false);
        return;
      }

      if (isTypingTarget(e.target)) return;

      // ? opens the help modal. Shift+? on US keyboard is "/".
      if (e.key === "?") {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }

      // / focuses the search input. Don't conflict with g+something.
      if (key === "/" && Date.now() - lastG.current > G_PREFIX_MS) {
        e.preventDefault();
        const el = document.querySelector<HTMLInputElement>(
          "[data-search-input]",
        );
        if (el) {
          el.focus();
          el.select();
        }
        return;
      }

      // R52: `s` toggles favorite of current card. Only on
      // /cards/[slug]. Skip if `g s` sequence is in progress
      // (lastG < 1s ago).
      if (
        key === "s" &&
        currentSlug &&
        favHydrated &&
        Date.now() - lastG.current > G_PREFIX_MS
      ) {
        e.preventDefault();
        toggleFavorite(currentSlug);
        return;
      }

      // g + <key> nav (vim-style leader key, 1s timeout).
      if (key === "g") {
        lastG.current = Date.now();
        return;
      }
      if (Date.now() - lastG.current <= G_PREFIX_MS) {
        const route =
          {
            h: "/",
            c: "/cards",
            s: "/series",
            t: "/timeline",
            g: "/graph",
            f: "/favorites",
          }[key.toLowerCase()] ?? null;
        if (route) {
          e.preventDefault();
          lastG.current = 0;
          router.push(route);
        }
        return;
      }
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [router]);

  if (!helpOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="键盘快捷键"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={() => setHelpOpen(false)}
    >
      <div
        className="relative w-full max-w-md rounded-lg border border-border bg-card shadow-card-hover p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setHelpOpen(false)}
          aria-label="关闭"
          className="absolute top-3 right-3 grid h-9 w-9 place-items-center rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <h2 className="font-serif text-xl font-bold mb-1 flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-gold-deep" aria-hidden="true" />
          键盘快捷键
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          按 <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted text-[10px] font-mono">?</kbd>{" "}
          随时打开这个面板 · <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted text-[10px] font-mono">Esc</kbd> 关闭
        </p>

        <div className="space-y-3 text-sm">
          <Section title="浏览">
            <Row icon={ChevronLeft} label="上一张" keys={["j", "←"]} />
            <Row icon={ChevronRight} label="下一张" keys={["k", "→"]} />
            <Row icon={Search} label="搜索" keys={["/"]} />
            <Row icon={Star} label="收藏当前图鉴" keys={["s"]} hint="仅 /cards/[slug]" />
          </Section>
          <Section title="跳转">
            <Row icon={Home} label="首页" keys={["g", "h"]} />
            <Row icon={Library} label="图鉴库" keys={["g", "c"]} />
            <Row icon={GitBranch} label="系列" keys={["g", "s"]} />
            <Row icon={Calendar} label="时间线" keys={["g", "t"]} />
            <Row icon={Network} label="知识图谱" keys={["g", "g"]} />
            <Row icon={Star} label="收藏夹" keys={["g", "f"]} />
          </Section>
          <Section title="图鉴">
            <Row icon={X} label="关闭弹窗" keys={["Esc"]} />
            <Row icon={Lightbulb} label="帮助" keys={["?"]} />
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 mb-1.5">
        {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  keys,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  keys: string[];
  /** Optional scope hint shown muted to the right (e.g. "仅 /cards/[slug]"). */
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="flex items-center gap-2 text-muted-foreground min-w-0">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden={true} />
        <span className="truncate">{label}</span>
        {hint && (
          <span className="text-[10px] text-muted-foreground/60 truncate hidden sm:inline">
            ({hint})
          </span>
        )}
      </span>
      <span className="flex items-center gap-1 shrink-0">
        {keys.map((k) => (
          <kbd
            key={k}
            className="px-1.5 py-0.5 rounded border border-border bg-muted text-[10px] font-mono"
          >
            {k}
          </kbd>
        ))}
      </span>
    </div>
  );
}