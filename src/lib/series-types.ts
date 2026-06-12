/**
 * Atlas Kit — Series Configuration
 *
 * SINGLE SOURCE OF TRUTH for encyclopedia series.
 * Each series is a curated collection that can span multiple kinds/themes.
 *
 * Adding a new series here will propagate to:
 *   - wizard (Step 2.5 series picker)
 *   - series list page (/series)
 *   - series detail page (/series/[slug])
 *   - card detail page (badge: "属于 {series.name}")
 *   - API /generate (AI suggestion logic)
 *
 * Each entry defines:
 *   - slug:        stable identifier (used in cards.json's `series` field)
 *   - name:        Chinese display name
 *   - tagline:     one-line hook shown on series cards
 *   - description: 2-3 sentence story for series detail page header
 *   - palette:     [bg, accent, secondary] — applied to the series card border, badge, and detail header
 *   - themeTags:   keywords that hint which kinds this series contains
 *                  (used by the C3 AI recommender to suggest the best series for a new card)
 *   - keywords:    extra topic-level keywords for AI matching (overlap with themeTags)
 *   - icon:        lucide-react icon name (optional, future use)
 */
export interface SeriesType {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  palette: [string, string, string]; // [bg, accent, secondary]
  themeTags: string[]; // matches THEME_TYPES[].key
  keywords: string[]; // for AI keyword matching
  icon?: string; // lucide icon name
  createdAt: string; // ISO date
}

export const SERIES_TYPES: SeriesType[] = [
  {
    slug: "pet-breed-guide",
    name: "宠物品种图鉴",
    tagline: "认识每一只可能成为家人的伙伴",
    description:
      "从金毛到豹纹守宫，从英短到玄凤鹦鹉——一份只关心「饲养视角」的宠物百科。不卖萌、不站台、不喊口号，只讲清楚每一种动物的脾气、生活需求、风险注意。",
    palette: ["#FAF3E9", "#C97064", "#A8B89C"],
    themeTags: ["pet"],
    keywords: ["犬", "猫", "宠物", "品种", "饲养", "护理", "守宫", "鹦鹉"],
    icon: "Heart",
    createdAt: "2026-06-12",
  },
  {
    slug: "wild-fauna-atlas",
    name: "野生动物图鉴",
    tagline: "走进纪录片镜头之外的真实生态",
    description:
      "从雪豹到藏羚羊，从负鼠到大熊猫——把那些我们在屏幕里见过的生灵，整理成可以查阅的图鉴。关注外形、栖息、食性、保护等级，提醒我们：它们不是背景。",
    palette: ["#F0F4F7", "#6B8294", "#B7C5CE"],
    themeTags: ["animal"],
    keywords: ["野生动物", "生态", "保护", "栖息", "食性", "雪豹", "藏羚", "熊猫"],
    icon: "PawPrint",
    createdAt: "2026-06-12",
  },
  {
    slug: "city-encyclopedia",
    name: "城市百科图鉴",
    tagline: "在水泥森林里读懂每一座城",
    description:
      "不是旅游宣传，不是打卡清单。一座城市的诞生、坐标、街区肌理、生活节奏、文化符号——按百科书页的方式整理出来，可以收藏，可以对比。",
    palette: ["#F5F0E6", "#8C7F6E", "#A8B89C"],
    themeTags: ["city"],
    keywords: ["城市", "历史", "地标", "街区", "古城", "古都", "文化", "首都"],
    icon: "Building2",
    createdAt: "2026-06-12",
  },
  {
    slug: "festival-almanac",
    name: "节日岁时志",
    tagline: "把一年的节气与节日整理成可查阅的图志",
    description:
      "从冬至到中秋，从春节到端午——每一个传统节日背后的起源、习俗、食物、地域差异。不煽情、不商业化，只做一份安静的岁时记录。",
    palette: ["#FAF3E9", "#C97064", "#D9B48E"],
    themeTags: ["festival"],
    keywords: ["节日", "节气", "传统", "习俗", "起源", "冬至", "春节", "中秋", "端午"],
    icon: "Sparkles",
    createdAt: "2026-06-12",
  },
  {
    slug: "atlas-miscellany",
    name: "图鉴杂俎",
    tagline: "放不下单一主题的有趣集合",
    description:
      "图鉴社里那些不属于任何已有系列，但又值得被整理的主题。可能是某种植物、一件器物、一个科技概念——只要它能讲出有意思的故事，就值得一张图鉴。",
    palette: ["#F5F0E6", "#B8956A", "#A8B89C"],
    themeTags: ["plant", "food", "object", "tech", "phenomenon", "history", "person", "other"],
    keywords: ["植物", "食物", "器物", "科技", "现象", "历史", "人物", "其他"],
    icon: "BookMarked",
    createdAt: "2026-06-12",
  },
];

/** Quick lookup by slug */
export const SERIES_TYPE_MAP: Record<string, SeriesType> = Object.fromEntries(
  SERIES_TYPES.map((s) => [s.slug, s]),
);

/** Get the default series for a kind (used by API when no seriesSlug is provided) */
export function getDefaultSeriesSlugForKind(kind: string): string {
  // Map kind → default series
  const map: Record<string, string> = {
    pet: "pet-breed-guide",
    animal: "wild-fauna-atlas",
    city: "city-encyclopedia",
    festival: "festival-almanac",
  };
  return map[kind] ?? "atlas-miscellany";
}

/**
 * AI-style recommender: score each series against (topic, kind) and return
 * the top N matches. Pure keyword + theme-tag match — no LLM call.
 *
 * Used by C3: when wizard has no series selected, the API can suggest 1-3
 * candidates and the wizard can pre-highlight the top one.
 */
export function recommendSeries(
  topic: string,
  kind: string,
  topN = 3
): { series: SeriesType; score: number; reason: string }[] {
  const scored = SERIES_TYPES.map((s) => {
    let score = 0;
    const reasons: string[] = [];

    // 1. themeTag match (strongest signal)
    if (s.themeTags.includes(kind)) {
      score += 10;
      reasons.push(`主题类型「${kind}」与系列偏好匹配`);
    }

    // 2. keyword match in topic
    const lowerTopic = topic.toLowerCase();
    for (const kw of s.keywords) {
      if (lowerTopic.includes(kw.toLowerCase())) {
        score += 3;
        if (reasons.length < 2) reasons.push(`关键词「${kw}」命中`);
      }
    }

    // 3. fallback boost for atlas-miscellany (always a valid option)
    if (s.slug === "atlas-miscellany") score += 1;

    return { series: s, score, reason: reasons.join("；") || "通用兜底系列" };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN);
}
