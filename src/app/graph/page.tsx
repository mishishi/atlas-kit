/**
 * R37 Plan 3 (2026-06-17): /graph — image-first knowledge graph.
 *
 * Server component: 拿 graph data, 传给 client GraphView.
 *
 * Header: minimal — site header 已经给了导航, 这里只 1 行标题 +
 * 计数 + 关按钮 (回 /cards). 整页是 graph (无 footer/header 全宽).
 *
 * TODO (R38+): mobile 友好版 (60 节点在小屏太挤, 用列表 fallback).
 * 现阶段桌面端是主用例.
 */

import Link from "next/link";
import { ArrowLeft, Network } from "lucide-react";
import { getGraphData, getGraphStats } from "@/lib/graph";
import { GraphView } from "@/components/graph-view";

export const metadata = {
  title: "图谱 · 图鉴社",
  description: "60 张图鉴的知识图谱, 边 = 描述互引 + 共享标签. 维基没有的 image-first graph.",
};

export default function GraphPage() {
  const data = getGraphData();
  const stats = getGraphStats(data);

  return (
    <main className="flex h-dvh flex-col">
      {/* Top bar — minimal, doesn't fight the graph */}
      <div className="flex items-center justify-between border-b border-border bg-card/80 backdrop-blur px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 min-h-[44px] px-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="返回首页"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回
          </Link>
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <Network className="h-4 w-4 text-gold-deep" aria-hidden="true" />
            <h1 className="font-serif text-base font-semibold">知识图谱</h1>
            <span className="text-muted-foreground">
              · {stats.nodes} 张图鉴 · {stats.totalEdges} 条关系
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="hidden md:inline">悬停看邻居, 点击进详情</span>
        </div>
      </div>

      {/* Graph fills the remaining viewport */}
      <GraphView data={data} />
    </main>
  );
}
