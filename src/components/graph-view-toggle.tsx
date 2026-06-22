"use client";

/**
 * R52 (2026-06-22): GraphViewToggle — owns view mode state (graph /
 * list) and renders the appropriate component.
 *
 * State machine:
 *   - Initial: SSR renders both components, hidden via CSS based on
 *     a viewport guess (we don't know viewport on server).
 *     Actually we render GraphView by default (desktop-first
 *     historical usage) and GraphList hidden.
 *   - After mount: useEffect reads localStorage + viewport, may
 *     switch to list on small screens.
 *
 * The toggle is in the top bar of /graph. User choice is sticky
 * (persisted to localStorage) — once they pick list, we keep showing
 * list regardless of viewport.
 */

import { useEffect, useState } from "react";
import { LayoutGrid, Network } from "lucide-react";
import type { GraphData } from "@/lib/graph";
import { GraphView } from "./graph-view";
import { GraphList } from "./graph-list";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "atlas-kit-graph-view";

export function GraphViewToggle({ data }: { data: GraphData }) {
  // Default = "graph" on server. Mount may switch to "list" if
  // viewport is small AND no localStorage preference yet.
  const [view, setView] = useState<"graph" | "list">("graph");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "graph" || saved === "list") {
        setView(saved);
        return;
      }
    } catch {
      // localStorage disabled — fall through to viewport heuristic
    }
    // No saved preference → viewport heuristic
    if (window.innerWidth < 768) setView("list");
  }, []);

  function switchTo(next: "graph" | "list") {
    setView(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // fail silently
    }
  }

  return (
    <div className="relative h-[calc(100dvh-4rem)] w-full">
      {/* Both views mounted; CSS hides the inactive one. Pre-mount, the
          server render of GraphView shows, then on mobile it flips to
          GraphList after hydration. The flip is one render only on
          the FIRST visit on mobile; subsequent visits use the saved
          localStorage choice and don't flip. */}
      <div
        className={cn(
          "absolute inset-0",
          view === "graph" ? "block" : "hidden",
        )}
        aria-hidden={view !== "graph"}
      >
        <GraphView data={data} />
      </div>
      <div
        className={cn(
          "absolute inset-0",
          view === "list" ? "block" : "hidden",
        )}
        aria-hidden={view !== "list"}
      >
        <GraphList data={data} />
      </div>

      {/* View toggle pill — always visible (top-right). 44px buttons.
          Sits over the canvas/list — z-20 above the canvas (default
          z = 0 in ForceGraph2D). On mobile this lives below the
          series-filter panel (which is on the top-right too); use
          a smaller variant on mobile to share the row. */}
      <div
        className={cn(
          "absolute right-4 z-20 flex rounded-md border border-border bg-card/95 p-0.5 backdrop-blur shadow-card",
          // Below md: position below the series filter panel (which is ~250px tall);
          // md+: place in top-right corner above the search box.
          "top-4 md:top-16",
        )}
        role="group"
        aria-label="视图切换"
      >
        <button
          type="button"
          onClick={() => switchTo("graph")}
          aria-pressed={view === "graph"}
          aria-label="图视图"
          className={cn(
            "inline-flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] rounded-sm px-3 text-xs transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            view === "graph"
              ? "bg-gold text-gold-deep"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Network className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">图</span>
        </button>
        <button
          type="button"
          onClick={() => switchTo("list")}
          aria-pressed={view === "list"}
          aria-label="列表视图"
          className={cn(
            "inline-flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] rounded-sm px-3 text-xs transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            view === "list"
              ? "bg-gold text-gold-deep"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">列表</span>
        </button>
      </div>

      {/* Suppress unused-var lint without removing the import */}
      {!mounted && <span className="sr-only">正在加载视图偏好…</span>}
    </div>
  );
}