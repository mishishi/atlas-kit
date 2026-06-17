"use client";

/**
 * R37 Plan 3 (2026-06-17): /graph visualization client component.
 *
 * react-force-graph-2d is canvas-based and needs `window`, so:
 *   1. This file is "use client"
 *   2. react-force-graph-2d is dynamic-imported with ssr: false
 *
 * Visual design (v1, minimal — visual polish is follow-up):
 *   - bg: bg-background + paper-grain
 *   - node: 32px circle, fill = palette[0], 2px border palette[1]
 *   - node label: name (Chinese) below circle, 11px
 *   - link: 1px solid for mention, 0.5px dashed for tag-share
 *   - force: d3 default + slightly stronger negative charge
 *     to spread 60 nodes across viewport
 *
 * Interactions (v1):
 *   - hover: highlight 1-hop neighbors, dim others to 30% opacity
 *   - click node: router.push to /cards/<slug>
 *   - drag: reposition (d3 default)
 *
 * Performance: 60 nodes / ~250 edges is trivial. 60fps.
 */

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GraphData, GraphLink, GraphNode } from "@/lib/graph";
import { Skeleton } from "@/components/skeleton";

// react-force-graph-2d uses canvas + d3-force. Must be client-only.
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
const imgCache = new Map<string, HTMLImageElement>();
function getImage(src: string): HTMLImageElement | null {
  if (!src) return null;
  if (imgCache.has(src)) return imgCache.get(src)!;
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  imgCache.set(src, img);
  return img;
}

export function GraphView({ data }: { data: GraphData }) {
  const router = useRouter();
  const fgRef = useRef<any>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });

  // Resize observer: re-fit the camera to viewport on window resize.
  // Force-graph has its own zoom/pan camera; we set initial size then
  // let user pan.
  useEffect(() => {
    function onResize() {
      setSize({ w: window.innerWidth, h: window.innerHeight - 64 });
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Compute 1-hop neighbors of hovered node for highlight
  const neighbors = useMemo(() => {
    if (!hoveredId) return null;
    const set = new Set<string>([hoveredId]);
    for (const l of data.links as Array<GraphLink & { source: any; target: any }>) {
      // After force-graph loads, l.source / l.target may be either
      // a slug string OR a node object with .id. Both are valid at
      // different render phases.
      const s = typeof l.source === "string" ? l.source : l.source.id;
      const t = typeof l.target === "string" ? l.target : l.target.id;
      if (s === hoveredId) set.add(t);
      if (t === hoveredId) set.add(s);
    }
    return set;
  }, [hoveredId, data.links]);

  // Pre-load all node images so the first paint doesn't flicker
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
        backgroundColor="rgba(0,0,0,0)" // inherit page bg
        nodeRelSize={6}
        nodeId="id"
        linkColor={(l: any) => {
          if (l.type === "tag") return "rgba(140, 127, 110, 0.25)"; // muted
          return "rgba(184, 137, 82, 0.55)"; // gold for mention
        }}
        linkWidth={(l: any) => (l.type === "tag" ? 0.5 : 1.2)}
        linkDirectionalParticles={0}
        cooldownTicks={120}
        d3AlphaDecay={0.025}
        d3VelocityDecay={0.3}
        nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, scale: number) => {
          const n = node as GraphNode & { x: number; y: number };
          const r = 14; // visual radius
          const dim = neighbors && !neighbors.has(n.id);
          ctx.globalAlpha = dim ? 0.25 : 1;

          // Outer ring: palette[1] (accent)
          ctx.beginPath();
          ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
          ctx.fillStyle = n.palette?.[0] || "#f5f0e6";
          ctx.fill();
          ctx.lineWidth = 2 / scale;
          ctx.strokeStyle = n.palette?.[1] || "#b88952";
          ctx.stroke();

          // Inner thumbnail (or fallback solid)
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
            if (aspect > 1) {
              dh = dw / aspect;
            } else {
              dw = dh * aspect;
            }
            ctx.drawImage(
              img,
              n.x - dw / 2,
              n.y - dh / 2,
              dw,
              dh,
            );
            ctx.restore();
          }

          // Label below
          const label = n.name;
          const fontSize = 11 / scale;
          ctx.font = `${fontSize}px "Noto Sans SC VF", "PingFang SC", "Microsoft YaHei", sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillStyle = dim
            ? "rgba(60, 50, 40, 0.35)"
            : "rgba(30, 25, 20, 0.85)";
          ctx.fillText(label, n.x, n.y + r + 3 / scale);
          ctx.globalAlpha = 1;
        }}
        nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
          // Larger invisible hit area for easier clicking
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
      {/* Legend (top-left) */}
      <div className="pointer-events-none absolute left-4 top-4 rounded-md border border-border bg-card/90 p-3 text-xs backdrop-blur space-y-1.5 shadow-card">
        <p className="font-medium text-foreground">图谱说明</p>
        <p className="text-muted-foreground">
          <span className="inline-block h-0.5 w-4 align-middle mr-1" style={{ background: "rgba(184, 137, 82, 0.55)" }} />
          描述互引 ({data.links.filter((l) => l.type === "mention").length})
        </p>
        <p className="text-muted-foreground">
          <span className="inline-block h-px w-4 align-middle mr-1 border-t border-dashed" style={{ borderColor: "rgba(140, 127, 110, 0.5)" }} />
          共享 3+ 标签 ({data.links.filter((l) => l.type === "tag").length})
        </p>
        <p className="text-muted-foreground mt-2">
          悬停高亮邻居, 点击节点跳详情
        </p>
      </div>
    </div>
  );
}
