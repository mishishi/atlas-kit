"use client";

/**
 * R37 Plan 3 (2026-06-17): /graph visualization client component.
 *
 * v2 (2026-06-18): 加 8-series filter chips + 搜索 + hover side panel.
 *
 * State (3 个):
 *   - selectedSeries: string | null  (filter 到单个 series)
 *   - searchQuery: string             (按 name 匹配, 实时)
 *   - hoveredId: string | null       (高亮 1-hop 邻居 + side panel)
 *
 * Dim 规则 (AND):
 *   - hover dim:  非 hover 节点 + 非邻居 → 25% opacity
 *   - series dim: filter 选了 X 系列, 不在 X → 25% opacity
 *   - search dim: query 命中但节点 name 不含 → 25% opacity
 *
 * 节点 click → 跳详情 (router.push /cards/<slug>).
 * 节点 hover → side panel 显示卡 mini 详情 (image + title + tagline + 跳转).
 */

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import NextImage from "next/image";
import { Search, X, ArrowRight } from "lucide-react";
import type { GraphData, GraphLink, GraphNode } from "@/lib/graph";
import { Skeleton } from "@/components/skeleton";
import { cn } from "@/lib/utils";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="space-y-3 w-80">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-3/4" />
        <p className="text-xs text-muted-foreground">正在加载图谱…</p>
      </div>
    </div>
  ),
});

// Image cache: src → HTMLImageElement (loaded once, reused on every
// repaint). Without this, every redraw does a fresh image fetch.
// `Image` here is the global browser Image (canvas-friendly), NOT
// next/image — they're different APIs.
const imgCache = new Map<string, HTMLImageElement>();
function getImage(src: string): HTMLImageElement | null {
  if (!src) return null;
  if (imgCache.has(src)) return imgCache.get(src)!;
  const img = new window.Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  imgCache.set(src, img);
  return img;
}

export function GraphView({ data }: { data: GraphData }) {
  const router = useRouter();
  const fgRef = useRef<any>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [size, setSize] = useState({ w: 800, h: 600 });

  // All unique series, with counts
  const seriesList = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of data.nodes) m.set(n.series, (m.get(n.series) || 0) + 1);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [data.nodes]);

  // 1-hop neighbors of hovered node
  const neighbors = useMemo(() => {
    if (!hoveredId) return null;
    const set = new Set<string>([hoveredId]);
    for (const l of data.links as Array<GraphLink & { source: any; target: any }>) {
      const s = typeof l.source === "string" ? l.source : l.source.id;
      const t = typeof l.target === "string" ? l.target : l.target.id;
      if (s === hoveredId) set.add(t);
      if (t === hoveredId) set.add(s);
    }
    return set;
  }, [hoveredId, data.links]);

  // Currently hovered node object (for side panel)
  const hoveredNode = useMemo(
    () => (hoveredId ? data.nodes.find((n) => n.id === hoveredId) ?? null : null),
    [hoveredId, data.nodes],
  );

  // Dim check: returns true if node should be dimmed
  function isDim(node: GraphNode): boolean {
    if (selectedSeries && node.series !== selectedSeries) return true;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!node.name.toLowerCase().includes(q) && !node.id.toLowerCase().includes(q)) {
        return true;
      }
    }
    if (neighbors && !neighbors.has(node.id)) return true;
    return false;
  }

  useEffect(() => {
    function onResize() {
      setSize({ w: window.innerWidth, h: window.innerHeight - 64 });
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    for (const n of data.nodes) {
      if (n.image) getImage(n.image);
    }
  }, [data.nodes]);

  return (
    <div className="relative h-[calc(100dvh-4rem)] w-full overflow-hidden bg-background paper-grain">
      <ForceGraph2D
        ref={fgRef}
        width={size.w}
        height={size.h}
        graphData={data}
        backgroundColor="rgba(0,0,0,0)"
        nodeRelSize={6}
        nodeId="id"
        linkColor={(l: any) => {
          if (l.type === "tag") return "rgba(140, 127, 110, 0.25)";
          return "rgba(184, 137, 82, 0.55)";
        }}
        linkWidth={(l: any) => (l.type === "tag" ? 0.5 : 1.2)}
        linkDirectionalParticles={0}
        // R55f (2026-06-22) — graph density tuning.
        //   Old: cooldownTicks=120, d3AlphaDecay=0.025, d3VelocityDecay=0.3,
        //        linkDistance default (~30 px).
        //   Issue: 390 nodes + 584 edges packed into a 1280px viewport
        //     = hairball. Super-hubs (beijing: 46 edges) create dense
        //     black knots.
        //   Fix: bigger linkDistance + slower decay = forces run longer
        //     and push nodes farther apart. Tag threshold drop (in
        //     graph.ts) also reduces edges 584 → ~300, less critical
        //     to also push harder here, but the two together give
        //     a much cleaner layout.
        cooldownTicks={250}
        d3AlphaDecay={0.015}
        d3VelocityDecay={0.25}
        // d3Force prop is supported at runtime by react-force-graph-2d
        // but missing from the published TypeScript types. The `as any`
        // cast keeps the call ergonomic; if react-force-graph-2d
        // changes its force API the runtime guard below will surface
        // a clear error instead of silently falling through.
        // @ts-expect-error d3Force not in ForceGraphProps types
        d3Force={(d3: any) => {
          // Pull nodes apart (default 30 → 70 px). Combined with
          // lower alphaDecay the layout settles with more breathing
          // room between clusters.
          d3.force("link").distance(70);
          // Mild charge: default -30, push slightly harder to spread
          // hubs away from the mass of leaves they connect to.
          d3.force("charge").strength(-90);
        }}
        nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, scale: number) => {
          const n = node as GraphNode & { x: number; y: number };
          const r = 14;
          const dim = isDim(n);
          ctx.globalAlpha = dim ? 0.2 : 1;

          ctx.beginPath();
          ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
          ctx.fillStyle = n.palette?.[0] || "#f5f0e6";
          ctx.fill();
          ctx.lineWidth = 2 / scale;
          ctx.strokeStyle = n.palette?.[1] || "#b88952";
          ctx.stroke();

          const img = n.image ? getImage(n.image) : null;
          if (img && img.complete && img.naturalWidth > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(n.x, n.y, r - 2 / scale, 0, 2 * Math.PI);
            ctx.clip();
            const aspect = img.naturalWidth / img.naturalHeight;
            const drawSize = (r - 2 / scale) * 2;
            let dw = drawSize;
            let dh = drawSize;
            if (aspect > 1) dh = dw / aspect;
            else dw = dh * aspect;
            ctx.drawImage(img, n.x - dw / 2, n.y - dh / 2, dw, dh);
            ctx.restore();
          }

          const label = n.name;
          const fontSize = 11 / scale;
          ctx.font = `${fontSize}px "Noto Sans SC VF", "PingFang SC", "Microsoft YaHei", sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillStyle = dim ? "rgba(60, 50, 40, 0.3)" : "rgba(30, 25, 20, 0.85)";
          ctx.fillText(label, n.x, n.y + r + 3 / scale);
          ctx.globalAlpha = 1;
        }}
        nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
          const r = 18;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
          ctx.fill();
        }}
        onNodeHover={(node: any) => setHoveredId(node?.id ?? null)}
        onNodeClick={(node: any) => {
          if (node?.id) router.push(`/cards/${node.id}`);
        }}
      />

      {/* Top-right: series filter + search */}
      <div className="absolute right-4 top-4 w-72 space-y-2">
        <div className="rounded-md border border-border bg-card/95 p-3 backdrop-blur shadow-card">
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/80 mb-2">
            系列筛选
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedSeries(null)}
              className={cn(
                "inline-flex min-h-[28px] items-center rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                selectedSeries === null
                  ? "border-gold bg-gold/15 text-gold-deep"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              全部
            </button>
            {seriesList.map(([slug, count]) => (
              <button
                key={slug}
                type="button"
                onClick={() => setSelectedSeries(selectedSeries === slug ? null : slug)}
                className={cn(
                  "inline-flex min-h-[28px] items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                  selectedSeries === slug
                    ? "border-gold bg-gold/15 text-gold-deep"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
                title={slug}
              >
                {slug.replace(/-/g, " ")} <span className="opacity-60">{count}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="relative">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜卡名 / slug…"
            aria-label="按名称搜索图鉴"
            className={cn(
              "w-full min-h-[36px] rounded-md border border-border bg-card/95 pl-8 pr-8 text-sm",
              "placeholder:text-muted-foreground/60",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "backdrop-blur shadow-card",
            )}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="清空搜索"
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom-left: legend */}
      <div className="pointer-events-none absolute bottom-4 left-4 rounded-md border border-border bg-card/90 p-3 text-xs backdrop-blur space-y-1.5 shadow-card">
        <p className="font-medium text-foreground">图谱说明</p>
        <p className="text-muted-foreground">
          <span
            className="inline-block h-0.5 w-4 align-middle mr-1"
            style={{ background: "rgba(184, 137, 82, 0.55)" }}
          />
          描述互引 ({data.links.filter((l) => l.type === "mention").length})
        </p>
        <p className="text-muted-foreground">
          <span
            className="inline-block h-px w-4 align-middle mr-1 border-t border-dashed"
            style={{ borderColor: "rgba(140, 127, 110, 0.5)" }}
          />
          共享 3+ 标签 ({data.links.filter((l) => l.type === "tag").length})
        </p>
        <p className="text-muted-foreground mt-2">悬停查看详情 · 点击跳详情</p>
      </div>

      {/* Right side: hover side panel */}
      {hoveredNode && (
        <aside
          className="absolute right-4 top-44 w-72 rounded-md border border-border bg-card/95 p-4 backdrop-blur shadow-card-hover"
          aria-label="悬停的图鉴"
        >
          {hoveredNode.image && (
            <div className="relative mb-3 aspect-[9/16] w-full max-w-[160px] mx-auto overflow-hidden rounded-md border border-border">
              <NextImage
                src={hoveredNode.image}
                alt={hoveredNode.name}
                fill
                sizes="160px"
                className="object-cover"
              />
            </div>
          )}
          <h3 className="font-serif text-base font-semibold text-center">
            {hoveredNode.name}
          </h3>
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground text-center mt-1">
            No.{hoveredNode.seriesNo} · {hoveredNode.series.replace(/-/g, " ")}
          </p>
          <button
            type="button"
            onClick={() => router.push(`/cards/${hoveredNode.id}`)}
            className={cn(
              "mt-3 flex w-full min-h-[36px] items-center justify-center gap-1 rounded-md bg-gold-deep px-3 py-1.5 text-xs font-medium text-cream",
              "hover:bg-gold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
          >
            查看完整图鉴
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </aside>
      )}
    </div>
  );
}
