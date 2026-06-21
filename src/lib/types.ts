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
  | "other"
  // R31 (2026-06-17): 12 new kinds added when user expanded
  // prompt-template/categories/. THEME_TYPES is the single source
  // of truth; this union must be kept in sync with it (TS can't
  // infer literal types from runtime arrays).
  | "architecture"
  | "artwork"
  | "book"
  | "chemical-element"
  | "country"
  | "disease"
  | "movie"
  | "mythology"
  | "profession"
  | "space-object"
  | "sport"
  | "vehicle"
  // R43 (2026-06-21): 2 new kinds — music / anime. User-added
  // category templates in prompt-template/categories/. Same
  // single-source-of-truth constraint as R31.
  | "music"
  | "anime";

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
  /** 常见误解 (hand-written, 非 AI). 详情页"误解/事实"小卡片. */
  myth?: string;
  /** 与 myth 对应的事实. 同样 hand-written. */
  fact?: string;
  /** 地理坐标 (用于 /map 视图). 仅 12 张地理图鉴有. */
  coords?: { lat: number; lng: number };
  /** 修订记录. scripts/log-revision.mjs 维护. */
  revisions?: RevisionEntry[];
  /** 参考来源 / 引用. 未来添加 (issue 6/6). */
  sources?: Array<{ title: string; url?: string; type?: string }>;
  /**
   * R37 (2026-06-17): 视觉质量分 (0-8). 由 scripts/score-all-cards.mjs
   * 跑 R30 check-image 8 规则后写入. 8 = 完美, < 5 = 需要 regen.
   * 详情页 hero 旁显示金色 / 灰 / 红 badge. 长城 placeholder
   * 会是 0/8 (预期, sharp 生成的纯色图, 不跑 OCR 也会挂).
   */
  visualScore?: number;
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
