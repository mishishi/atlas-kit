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
    slug: "craft-and-botanical",
    name: "工艺与草木",
    tagline: "从一片叶子到一件器物的造物笔记",
    description:
      "把植物与器物放在一起看，是因为它们都回答同一个问题：人和自然怎么把「材料」变成「有意义的东西」。龙井、算盘、青花瓷——每张图鉴都讲一个造物故事的来龙去脉。",
    palette: ["#F5F0E6", "#7A8B6E", "#A8B89C"],
    themeTags: ["plant", "object"],
    keywords: ["植物", "草木", "器物", "工艺", "造物", "非遗", "茶", "瓷", "玉"],
    icon: "Leaf",
    createdAt: "2026-06-17",
  },
  {
    slug: "culinary-corner",
    name: "烟火人间",
    tagline: "把一道菜讲成一个地方",
    description:
      "北京烤鸭、兰州拉面、广式早茶——食物从来不只是味道, 是地理、历史、人情世故的容器。这一系列只收录可以讲出「地方+故事」的食单, 不收录单纯的食谱。",
    palette: ["#FAF3E9", "#C97064", "#D9B48E"],
    themeTags: ["food"],
    keywords: ["食物", "美食", "地方", "饮食", "非遗", "文化", "烤鸭", "火锅", "早茶"],
    icon: "UtensilsCrossed",
    createdAt: "2026-06-17",
  },
  {
    slug: "history-and-figures",
    name: "历史与人物",
    tagline: "把一段历史和一个人并排放在一起",
    description:
      "从司马迁到苏东坡, 从贞观之治到安史之乱——历史和人物是同一件事的两面。这一系列关注「为什么这件事 / 这个人重要」, 不收录只罗列年代的流水账。",
    palette: ["#F5F0E6", "#8C7F6E", "#A8B89C"],
    themeTags: ["person", "history", "other"],
    keywords: ["历史", "人物", "古代", "近代", "事件", "朝代", "故宫", "遗址", "考古"],
    icon: "ScrollText",
    createdAt: "2026-06-17",
  },
  {
    slug: "frontiers-and-wonders",
    name: "寰宇惊奇",
    tagline: "从一片极光到一个算力单位",
    description:
      "把「自然的奇迹」和「人造的奇迹」放在一起, 因为它们都在拓展人类认知的边界。极光、潮汐、5G、量子计算——每张图鉴都讲一个「原来世界是这样 / 我们能做到这样」的故事。",
    palette: ["#F0F4F7", "#6B8294", "#B7C5CE"],
    themeTags: ["tech", "phenomenon"],
    keywords: ["科技", "自然", "极光", "潮汐", "现象", "天文", "物理", "AI", "区块链"],
    icon: "Sparkles",
    createdAt: "2026-06-17",
  },
  // R43 (2026-06-21): 2 new series — soundtrack-atlas / anime-works-atlas.
  // 音乐 (popular songs) and 动漫 (Japanese animation works) deserve
  // their own curated series rather than folding into a generic bucket.
  {
    slug: "soundtrack-atlas",
    name: "音律图鉴",
    tagline: "把一首歌讲成一个时代",
    description:
      "从「千本桜」到「夜的钢琴曲五」, 一首歌是创作者、年代、媒介和听众的合谋。这一系列关注流行 / 经典 / 跨地域音乐作品的创作背景、曲式结构、声音语言与传播影响——不收录只罗列榜单的流水卡。",
    palette: ["#F5F0E6", "#6E628C", "#4A3F66"],
    themeTags: ["music"],
    keywords: ["歌曲", "音乐", "作曲", "作词", "编曲", "流行", "J-POP", "VOCALOID", "古典", "民谣"],
    icon: "Music",
    createdAt: "2026-06-21",
  },
  {
    slug: "anime-works-atlas",
    name: "动漫图鉴",
    tagline: "把一部动画讲成一种美学",
    description:
      "从「虫师」到「鬼灭之刃」, 一部动画是监督、原画、分镜、声优和观众的合谋。这一系列关注日本动画 / 漫画改编作品的世界观、角色、美术风格、制作演出与主题表达——不收录只罗列集数的简介卡。",
    palette: ["#F5F0E6", "#6E628C", "#2C2438"],
    themeTags: ["anime"],
    keywords: ["动画", "动漫", "漫画改编", "日本", "新海诚", "宫崎骏", "监督", "声优", "作画"],
    icon: "Tv",
    createdAt: "2026-06-21",
  },
  // R60+35 (2026-06-30): 2 catch-all series from R59 batch. Pulp-fiction
  // for global popular films; atlas-miscellany for cross-genre items that
  // don't fit any of the 10 curated series above.
  {
    slug: "pulp-fiction",
    name: "影像档案",
    tagline: "把一部电影讲成一段共同记忆",
    description:
      "从「玩具总动员」到「冰雪奇缘」, 一部电影是票房、奖项、口碑与文化共振的合谋。这一系列收录全球票房与影响力俱佳的流行电影——关注市场表现、视觉风格、文化输出与观众共鸣, 不收录只罗列演员表的卡片。",
    palette: ["#F0F4F7", "#5C7A8C", "#8FA8B5"],
    themeTags: ["movie"],
    keywords: ["电影", "票房", "流行", "好莱坞", "迪士尼", "皮克斯", "梦工厂", "动画长片", "商业大片"],
    icon: "Film",
    createdAt: "2026-06-26",
  },
  {
    slug: "atlas-miscellany",
    name: "寰宇杂谈",
    tagline: "凡不归他处者, 暂居于此",
    description:
      "图鉴社的杂项桶——那些暂时没找到更适合位置的跨类别条目都暂存于此, 等待后续可能拆分为新的专题系列。这不是「不分类」, 而是「待分类」: 内容质量与正式系列一致, 只是归属还在观察。",
    palette: ["#FAF3E9", "#9B8B6E", "#C4B89A"],
    themeTags: ["tech", "mythology", "other", "object"],
    keywords: ["杂项", "待分类", "跨类别"],
    icon: "PackageOpen",
    createdAt: "2026-06-26",
  },
];

/** Quick lookup by slug */
export const SERIES_TYPE_MAP: Record<string, SeriesType> = Object.fromEntries(
  SERIES_TYPES.map((s) => [s.slug, s]),
);

/** Get the default series for a kind (used by API when no seriesSlug is provided) */
export function getDefaultSeriesSlugForKind(kind: string): string {
  // Map kind → default series. Round 27 (2026-06-17): each of the
  // 8 non-pet/animal/city/festival kinds now has its own curated
  // series, so no kind falls back to a generic "miscellany" bucket.
  const map: Record<string, string> = {
    pet: "pet-breed-guide",
    animal: "wild-fauna-atlas",
    city: "city-encyclopedia",
    festival: "festival-almanac",
    plant: "craft-and-botanical",
    object: "craft-and-botanical",
    food: "culinary-corner",
    history: "history-and-figures",
    person: "history-and-figures",
    other: "history-and-figures",
    phenomenon: "frontiers-and-wonders",
    tech: "frontiers-and-wonders",
    // R31 (2026-06-17): 12 new kinds → closest existing series.
    // Each new kind maps to one of the 8 curated series (no
    // "atlas-miscellany" fallback — R27 split that out into
    // history-and-figures / craft-and-botanical / etc).
    // Mapping rationale:
    //   - architecture / artwork / vehicle → craft-and-botanical
    //     (built/made things, 造物 axis)
    //   - book / disease / movie / mythology / profession →
    //     history-and-figures (cultural records / human stories)
    //   - chemical-element / space-object → frontiers-and-wonders
    //     (natural + manmade boundaries of knowledge)
    //   - country → city-encyclopedia (closest geographic/political)
    //   - sport → craft-and-botanical (closest "造物" — sport
    //     equipment / 体育文化 is the strongest overlap; not perfect
    //     but no dedicated 体育 series yet)
    architecture: "craft-and-botanical",
    artwork: "craft-and-botanical",
    book: "history-and-figures",
    "chemical-element": "frontiers-and-wonders",
    country: "city-encyclopedia",
    disease: "history-and-figures",
    movie: "history-and-figures",
    mythology: "history-and-figures",
    profession: "history-and-figures",
    "space-object": "frontiers-and-wonders",
    sport: "craft-and-botanical",
    vehicle: "craft-and-botanical",
    // R43 (2026-06-21): music + anime have their own dedicated
    // series (soundtrack-atlas / anime-works-atlas). No fallback
    // to the generic buckets.
    music: "soundtrack-atlas",
    anime: "anime-works-atlas",
  };
  return map[kind] ?? "craft-and-botanical";
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

    // 3. fallback boost for craft-and-botanical (the most general
    //    curated series — covers plants + objects which span everything)
    if (s.slug === "craft-and-botanical") score += 1;

    return { series: s, score, reason: reasons.join("；") || "通用兜底系列" };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN);
}
