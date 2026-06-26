/**
 * R37 Plan 3 (2026-06-17): Knowledge graph data layer.
 * R55f (2026-06-22): tag-edge threshold raised 3→5, generic tags
 * (中国/全球/古代/文化) excluded from tag-pair counting.
 *
 * 390 张图鉴 + ~200 边 = 第一版 image-first knowledge graph.
 *
 * Nodes: 来自 cards (slug, title, kind, series, palette, image, score).
 * Links: 3 种
 *   1. mention  — A.description 提到 B (有向, A→B).
 *                 用现有 getMentionIndex() 复用, 不重算.
 *   2. tag     — A 和 B 共享 N+ tag (无向, weight = 共享数). N=5.
 *   3. series  — 同 series 视觉聚类, 不画边 (前端用 series 颜色
 *                区分节点, 不污染 graph edges).
 *
 * 序列化: 服务器端一次算好, /graph page 静态生成. 390 节点 + ~200
 * 边 JSON < 60KB, 客户端 hydrate 0 工作量.
 *
 * 极致 #1 (2026-06-17 PM review): 维基没有 image-first graph.
 * 这是护城河.
 *
 * R55f tuning (after user feedback on graph density):
 *   - Old: 3+ shared tags → 202 tag edges + 32 super-hubs (beijing: 46)
 *   - New: 5+ shared tags + exclude generic tags → ~80 tag edges
 *   - Generic tags (中国/全球/古代/文化) appear on 50+ cards each,
 *     making them connect nearly every card — visually a hairball.
 *     Excluding them leaves only the "subject-specific" tag overlap
 *     which actually conveys a meaningful relationship.
 *   - Side effect: orphans (cards with 0 edges) increase from 115
 *     to ~130. Acceptable trade-off — orphans are visibly isolated
 *     dots, which is honest. Better than false-positive connections.
 */

import type { Card } from "./types";
import cardsData from "../../data/cards.json";

export interface GraphNode {
  id: string; // slug
  name: string; // title (zh-CN)
  kind: string;
  /** R58 (2026-06-26) — subKind L3 taxonomy bucket. Used by graph-view
   *  to color nodes by their subKind cluster instead of card.palette. */
  subKind?: string;
  series: string;
  seriesNo: string;
  palette: [string, string, string];
  image: string | null; // 缩略图
  image_thumb?: string;
  visualScore?: number;
  // Force-graph layout coords (filled client-side after force sim)
  x?: number;
  y?: number;
}

export interface GraphLink {
  source: string; // slug
  target: string; // slug
  type: "mention" | "tag";
  /** mention 边 weight=1; tag 边 weight = 共享 tag 数. */
  weight: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// At module load: build mention map from description cross-refs
// (uses getMentionIndex logic inline, no need to import).
// This is a copy of the algorithm in src/lib/data.ts getMentionIndex
// but kept self-contained for graph.ts simplicity.
function buildMentionPairs(): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  // For each card, look at its description, tagline, subtitle text
  // and find other card titles mentioned.
  // Use the existing index in data.ts: getMentionIndex (avoid
  // re-implementing).
  // Import dynamically to avoid circular dep risk.
  const { getMentionIndex } = require("./data") as typeof import("./data");
  const idx = getMentionIndex();
  for (const [fromSlug, mentionSet] of idx.entries()) {
    for (const toSlug of mentionSet) {
      if (fromSlug !== toSlug) pairs.push([fromSlug, toSlug]);
    }
  }
  return pairs;
}

// Tags that appear on 50+ cards and convey no subject-specific
// relationship. Excluded from tag-pair counting so they don't
// form a hub-and-spoke "everything connects" hairball.
// (R55f 2026-06-22)
const GENERIC_TAGS = new Set([
  "中国", "全球", "古代", "文化",
]);

// Tag-based links: any 2 cards sharing N+ tags (N from TAG_THRESHOLD)
// → weight = shared count. Generic tags skipped.
const TAG_THRESHOLD = 3;

function buildTagPairs(
  cardList: Card[],
): Array<[string, string, number]> {
  const tagMap = new Map<string, Set<string>>(); // tag → slugs
  for (const c of cardList) {
    for (const t of c.tags || []) {
      if (GENERIC_TAGS.has(t)) continue;
      if (!tagMap.has(t)) tagMap.set(t, new Set());
      tagMap.get(t)!.add(c.slug);
    }
  }
  const pairCount = new Map<string, number>();
  for (const slugs of tagMap.values()) {
    const arr = [...slugs];
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const key = arr[i] < arr[j] ? `${arr[i]}|${arr[j]}` : `${arr[j]}|${arr[i]}`;
        pairCount.set(key, (pairCount.get(key) || 0) + 1);
      }
    }
  }
  const out: Array<[string, string, number]> = [];
  for (const [key, count] of pairCount) {
    if (count >= TAG_THRESHOLD) {
      const [a, b] = key.split("|");
      out.push([a, b, count]);
    }
  }
  return out;
}

let _cache: GraphData | null = null;

export function getGraphData(): GraphData {
  if (_cache) return _cache;

  const cardList = cardsData as Card[];

  // Nodes
  const nodes: GraphNode[] = cardList.map((c) => ({
    id: c.slug,
    name: c.title,
    kind: c.kind,
    subKind: c.subKind,
    series: c.series,
    seriesNo: c.seriesNo,
    palette: c.palette,
    image: c.image_thumb ?? c.image ?? null,
    image_thumb: c.image_thumb,
    visualScore: c.visualScore,
  }));

  // Links
  const links: GraphLink[] = [];

  // 1. Mentions (forward + reverse = same set, just deduplicate)
  const mentionSet = new Set<string>();
  for (const [a, b] of buildMentionPairs()) {
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    mentionSet.add(key);
  }
  for (const key of mentionSet) {
    const [a, b] = key.split("|");
    links.push({ source: a, target: b, type: "mention", weight: 1 });
  }

  // 2. Tag pairs (3+ shared)
  for (const [a, b, count] of buildTagPairs(cardList)) {
    links.push({ source: a, target: b, type: "tag", weight: count });
  }

  _cache = { nodes, links };
  return _cache;
}

// ─── Stats helpers (for UI labels) ────────────────────────────────
export function getGraphStats(data: GraphData) {
  const seriesCount = new Set(data.nodes.map((n) => n.series)).size;
  const kindCount = new Set(data.nodes.map((n) => n.kind)).size;
  const mentionCount = data.links.filter((l) => l.type === "mention").length;
  const tagCount = data.links.filter((l) => l.type === "tag").length;
  return {
    nodes: data.nodes.length,
    series: seriesCount,
    kinds: kindCount,
    mentions: mentionCount,
    tagEdges: tagCount,
    totalEdges: data.links.length,
  };
}
