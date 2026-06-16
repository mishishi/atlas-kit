import { THEME_TYPES } from "./theme-types";
import { SERIES_TYPES, type SeriesType } from "./series-types";

export type { ThemeType } from "./theme-types";
export { THEME_TYPES, THEME_TYPE_MAP, PROMPT_TYPES } from "./theme-types";
export { SERIES_TYPES, SERIES_TYPE_MAP, recommendSeries } from "./series-types";
export type { SeriesType } from "./series-types";

// CardKind = union of all theme type keys. Kept in sync with THEME_TYPES[].key
// (manually, since TS can't infer literal types from runtime arrays).
export type CardKind =
  | "pet"
  | "animal"
  | "plant"
  | "city"
  | "person"
  | "festival"
  | "food"
  | "phenomenon"
  | "history"
  | "object"
  | "tech"
  | "other";

/** A historical milestone on the detail page's 历史沿革 timeline. */
export interface HistoryNode {
  /** Display string: "前 11 世纪" | "627 年" | "1921 年" | "2023 年 5 月" */
  year: string;
  /** 6-12 字标题 */
  title: string;
  /** 30-80 字史实描述 */
  body: string;
}

/** A revision entry on a card — tracks content edits over time. */
export interface RevisionEntry {
  /** ISO date string when the revision was made */
  date: string;
  /** One-line human description of what changed */
  summary: string;
  /** Which card fields were touched (description / tags / history / etc.) */
  fields: string[];
}

export interface Card {
  slug: string;
  title: string;
  kind: CardKind;
  /** Series slug — points to SERIES_TYPES[].slug. Decoupled from kind (a card's
   *  series is editorial/story-level, while kind is taxonomic/category-level). */
  series: string;
  seriesNo: string;
  palette: [string, string, string]; // [bg, accent, secondary]
  image: string;
  /** 200-wide thumbnail (~42KB). Falls back to `image` for un-resized cards. */
  image_thumb?: string;
  /** 1024-wide original (~5MB). Use for download / "view original" link. */
  image_full?: string;
  score: number;
  tags: string[];
  tagline: string;
  subtitle: string;
  description: string;
  createdAt: string; // ISO date
  /** 5-8 历史节点, 详情页底部"历史沿革"区使用. 草拟 by AI + 人工校对. */
  history?: HistoryNode[];
  /** 1-2 句权威引文, 标注来源 (苏轼/维基百科/...). AI 草拟 + 人工校对. */
  quote?: string;
  /** 1 句有趣小知识. AI 草拟 + 人工校对. */
  trivia?: string;
  /** 地理坐标 (用于 /map 视图). 仅 12 张地理图鉴有. */
  coords?: { lat: number; lng: number };
  /** 修订记录. scripts/log-revision.mjs 维护. */
  revisions?: RevisionEntry[];
  /** 参考来源 / 引用. 未来添加 (issue 6/6). */
  sources?: Array<{ title: string; url?: string; type?: string }>;
}

/** Series — collection-level view (slug, name, plus runtime-aggregated fields) */
export interface Series {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  palette: [string, string, string];
  themeTags: string[];
  keywords: string[];
  icon?: string;
  createdAt: string;
  // runtime-aggregated:
  count: number;
  cards: Card[];
}

/** label for each kind — derived from THEME_TYPES so it stays in sync */
export const KIND_LABELS: Record<CardKind, string> = Object.fromEntries(
  THEME_TYPES.map((t) => [t.key, t.label]),
) as Record<CardKind, string>;

/** lucide icon name for each kind */
export const KIND_ICONS: Record<CardKind, string> = Object.fromEntries(
  THEME_TYPES.map((t) => [t.key, "Sparkles"]),
) as Record<CardKind, string>;

// Backwards compat: legacy "dog" entries render as pet in UI
export function displayLabel(kind: string): string {
  if (kind === "dog") return KIND_LABELS.pet;
  return (KIND_LABELS as Record<string, string>)[kind] ?? kind;
}
