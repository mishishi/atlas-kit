"use client";

/**
 * R52 (2026-06-22): GraphList — mobile-friendly fallback for /graph.
 *
 * Same GraphData as GraphView (force-directed canvas) but renders
 * a simple scrollable list instead. Each row = node thumbnail +
 * name + kind + neighbor count. Click → /cards/[slug].
 *
 * Filter scope: independent of GraphView's series filter. Simplifies
 * the cross-view state by letting each view own its filter. Switching
 * view resets filter (intentional — UX is "browse graph OR scan list",
 * not "find the same filtered set in two layouts").
 *
 * Why not just responsive-hide the ForceGraph:
 *   - ForceGraph2D is canvas-based; on a 360×640 mobile screen the
 *     600 nodes overlap and the labels clip. Pinch-zoom + pan exist
 *     but the hover side-panel was desktop-first (absolute right
 *     panel covers half the screen on phone).
 *   - This list view is fully keyboard-/SR-navigable by default.
 */

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowUp, Search, X } from "lucide-react";
import type { GraphData, GraphNode } from "@/lib/graph";
import { cn } from "@/lib/utils";

interface GraphListProps {
  data: GraphData;
}

export function GraphList({ data }: GraphListProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [seriesFilter, setSeriesFilter] = useState<string | null>(null);

  // R-J (2026-06-30): series chip filter + scroll-to-top FAB. The
  // graph-list was missing the series filter that graph-view has,
  // so mobile users could search but not browse-by-series. Adding
  // a single-row chip strip and a FAB to jump back to top after
  // scrolling through hundreds of rows.

  // All series with counts, sorted by slug
  const seriesList = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of data.nodes) m.set(n.series, (m.get(n.series) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [data.nodes]);

  const filtered = useMemo(() => {
    let result = data.nodes;
    if (seriesFilter) result = result.filter((n) => n.series === seriesFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(
        (n) =>
          n.name.toLowerCase().includes(q) || n.id.toLowerCase().includes(q),
      );
    }
    return result;
  }, [data.nodes, query, seriesFilter]);

  // Scroll-to-top visibility (show after 200px scroll)
  const [showScrollTop, setShowScrollTop] = useState(false);
  const listRef = useRef<HTMLUListElement | null>(null);
  function onScroll(e: React.UIEvent<HTMLUListElement>) {
    setShowScrollTop(e.currentTarget.scrollTop > 200);
  }
  function scrollToTop() {
    listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Pre-compute neighbor counts once (graph is static after load).
  // Same cast as GraphView: react-force-graph-2d mutates link.source/
  // target from string to object after layout, so the type isn't
  // literally `string` at runtime. Cast through `any` keeps TS happy
  // without weakening the rest of the file.
  const neighborCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of data.nodes) m.set(n.id, 0);
    for (const l of data.links as Array<{ source: any; target: any }>) {
      const s: string = typeof l.source === "string" ? l.source : l.source.id;
      const t: string = typeof l.target === "string" ? l.target : l.target.id;
      m.set(s, (m.get(s) ?? 0) + 1);
      m.set(t, (m.get(t) ?? 0) + 1);
    }
    return m;
  }, [data]);

  return (
    <div className="relative flex h-[calc(100dvh-4rem)] w-full flex-col bg-background">
      {/* Sticky search bar */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`搜 ${data.nodes.length} 张图鉴的名称或 slug`}
            aria-label="按名称或 slug 搜索图鉴"
            className={cn(
              "w-full min-h-[44px] rounded-md border border-border bg-card pl-10 pr-10 text-sm",
              "placeholder:text-muted-foreground/60",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="清空搜索"
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {query ? (
            <>
              匹配 <span className="font-medium text-foreground">{filtered.length}</span> / {data.nodes.length}
            </>
          ) : (
            <>列表视图 · 触屏友好,点行进详情</>
          )}
        </p>
      </div>

      {/* R-J (2026-06-30): series filter chip strip. Same chip style
          as graph-view's top-right series filter (gold-deep when
          active), but horizontal scroll on small screens so the
          8-12 series don't wrap awkwardly. */}
      <div
        className="border-b border-border/60 bg-card/40 px-2 py-2 overflow-x-auto scrollbar-editorial"
        aria-label="按系列筛选"
      >
        <ul className="flex gap-1.5 list-none p-0 min-w-min">
          <li>
            <button
              type="button"
              onClick={() => setSeriesFilter(null)}
              aria-pressed={seriesFilter === null}
              className={cn(
                "inline-flex min-h-[32px] items-center rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                seriesFilter === null
                  ? "border-gold bg-gold/15 text-gold-deep font-medium"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              全部
            </button>
          </li>
          {seriesList.map(([slug, count]) => {
            const active = seriesFilter === slug;
            return (
              <li key={slug}>
                <button
                  type="button"
                  onClick={() => setSeriesFilter(active ? null : slug)}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex min-h-[32px] items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 whitespace-nowrap",
                    active
                      ? "border-gold bg-gold/15 text-gold-deep font-medium"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                  title={slug}
                >
                  {slug.replace(/-/g, " ")}{" "}
                  <span className="opacity-60 tabular-nums">{count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Scrollable list */}
      <ul
        ref={listRef}
        className="flex-1 overflow-y-auto"
        role="list"
        onScroll={onScroll}
      >
        {filtered.length === 0 ? (
          <li className="px-4 py-12 text-center text-sm text-muted-foreground">
            没有匹配「{query}」的图鉴。
            {seriesFilter && (
              <>
                <br />
                <button
                  type="button"
                  onClick={() => setSeriesFilter(null)}
                  className="mt-3 inline-flex min-h-[36px] items-center rounded-md border border-border px-3 py-1 text-xs hover:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  清除系列筛选
                </button>
              </>
            )}
          </li>
        ) : (
          filtered.map((node) => (
            <GraphListRow
              key={node.id}
              node={node}
              neighborCount={neighborCounts.get(node.id) ?? 0}
              onClick={() => router.push(`/cards/${node.id}`)}
            />
          ))
        )}
      </ul>

      {/* R-J (2026-06-30): scroll-to-top FAB. Only visible after
          200px scroll. 44x44 round, bottom-right, semi-transparent
          card bg so the list still reads through. */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="回到顶部"
          className="absolute bottom-6 right-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/95 text-foreground shadow-card hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all"
        >
          <ArrowUp className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

interface RowProps {
  node: GraphNode;
  neighborCount: number;
  onClick: () => void;
}

function GraphListRow({ node, neighborCount, onClick }: RowProps) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-label={`${node.name} · ${node.kind} · ${neighborCount} 个邻居`}
        className={cn(
          "flex w-full items-center gap-3 border-b border-border/40 px-4 py-3 text-left transition-colors",
          "hover:bg-muted focus-visible:outline-none focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
      >
        <div
          className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-border"
          style={{ backgroundColor: node.palette?.[0] }}
        >
          {node.image && (
            <Image
              src={node.image}
              alt=""
              fill
              sizes="56px"
              className="object-cover"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-serif text-base font-semibold truncate">{node.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {node.kind} · No.{node.seriesNo}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-muted-foreground tabular-nums">
            {neighborCount} 邻居
          </p>
        </div>
      </button>
    </li>
  );
}