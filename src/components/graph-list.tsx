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
 *     60 nodes overlap and the labels clip. Pinch-zoom + pan exist
 *     but the hover side-panel was desktop-first (absolute right
 *     panel covers half the screen on phone).
 *   - This list view is fully keyboard-/SR-navigable by default.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, X } from "lucide-react";
import type { GraphData, GraphNode } from "@/lib/graph";
import { cn } from "@/lib/utils";

interface GraphListProps {
  data: GraphData;
}

export function GraphList({ data }: GraphListProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

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

  // Apply search filter.
  const filtered = useMemo(() => {
    if (!query.trim()) return data.nodes;
    const q = query.trim().toLowerCase();
    return data.nodes.filter(
      (n) =>
        n.name.toLowerCase().includes(q) || n.id.toLowerCase().includes(q),
    );
  }, [data.nodes, query]);

  return (
    <div className="flex h-[calc(100dvh-4rem)] w-full flex-col bg-background">
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

      {/* Scrollable list */}
      <ul className="flex-1 overflow-y-auto" role="list">
        {filtered.length === 0 ? (
          <li className="px-4 py-12 text-center text-sm text-muted-foreground">
            没有匹配「{query}」的图鉴。
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