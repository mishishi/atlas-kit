/**
 * Atlas Kit — Theme Type Configuration
 *
 * SINGLE SOURCE OF TRUTH for both the prompt template and the frontend wizard.
 * Adding/removing a theme type here will propagate to both sides automatically.
 *
 * Each entry defines:
 *  - key:        stable identifier (used in JSON data)
 *  - label:      Chinese display name (shown in wizard buttons)
 *  - emoji:      icon for wizard UI
 *  - description: short subtitle for wizard buttons
 *  - promptType: the value inserted into the prompt's 「主题类型」 field.
 *                (must match a value listed in the prompt template)
 *  - palette:    color family hint for the UI badge
 *  - series:     default series name appended to the copyright line
 *  - icon:       lucide-react icon name (for any UI that wants it)
 */
export interface ThemeType {
  key: string;
  label: string;
  emoji: string;
  description: string;
  promptType: string; // matches one of the values in prompt-templates.ts
  series: string;
}

export const THEME_TYPES: ThemeType[] = [
  {
    key: "pet",
    label: "宠物",
    emoji: "🐾",
    description: "犬 / 猫 / 爬行 / 鸟 / 鱼",
    promptType: "宠物",
    series: "宠物图鉴系列",
  },
  {
    key: "animal",
    label: "野生动物",
    emoji: "🦊",
    description: "动物园 / 自然生态",
    promptType: "动物",
    series: "野生动物图鉴系列",
  },
  {
    key: "plant",
    label: "植物",
    emoji: "🌿",
    description: "花卉 / 树木 / 茶饮",
    promptType: "植物",
    series: "植物图鉴系列",
  },
  {
    key: "city",
    label: "城市",
    emoji: "🏙️",
    description: "城市档案 / 地标 / 历史",
    promptType: "城市",
    series: "城市图鉴系列",
  },
  {
    key: "person",
    label: "人物",
    emoji: "👤",
    description: "历史人物 / 名人 / 传记",
    promptType: "人物",
    series: "人物图鉴系列",
  },
  {
    key: "festival",
    label: "节日",
    emoji: "🎉",
    description: "传统节日 / 纪念日",
    promptType: "节日",
    series: "节日图鉴系列",
  },
  {
    key: "food",
    label: "食物",
    emoji: "🍱",
    description: "食材 / 料理 / 饮品",
    promptType: "食物",
    series: "食物图鉴系列",
  },
  {
    key: "phenomenon",
    label: "自然现象",
    emoji: "🌪️",
    description: "天气 / 地质 / 物理现象",
    promptType: "自然现象",
    series: "自然现象图鉴系列",
  },
  {
    key: "history",
    label: "历史事件",
    emoji: "📜",
    description: "历史事件 / 战争 / 革命",
    promptType: "历史事件",
    series: "历史事件图鉴系列",
  },
  {
    key: "object",
    label: "器物",
    emoji: "💎",
    description: "工具 / 收藏品 / 文化器物",
    promptType: "器物",
    series: "器物图鉴系列",
  },
  {
    key: "tech",
    label: "科技概念",
    emoji: "🔬",
    description: "科学 / 技术 / 抽象概念",
    promptType: "科技概念",
    series: "科技概念图鉴系列",
  },
  {
    key: "other",
    label: "其他",
    emoji: "✨",
    description: "不确定 / 综合",
    promptType: "其他",
    series: "百科图鉴系列",
  },
  // R31 (2026-06-17): 12 new kinds. User added corresponding
  // prompt-template/categories/*.md files. Adding entries here
  // auto-propagates to KIND_LABELS, KIND_ICONS, wizard buttons,
  // /cards?kind= filter, /all "by kind" view, /api/generate
  // validation. See scripts/build-prompt.mjs KIND_DISPLAY for the
  // matching display-name mapping (used to fill the prompt's
  // "Category: [分类]" slot).
  {
    key: "architecture",
    label: "建筑",
    emoji: "🏛️",
    description: "古建 / 现代建筑 / 地标",
    promptType: "建筑",
    series: "工艺与造物系列",
  },
  {
    key: "artwork",
    label: "艺术品",
    emoji: "🎨",
    description: "绘画 / 雕塑 / 工艺美术",
    promptType: "艺术品",
    series: "工艺与造物系列",
  },
  {
    key: "book",
    label: "书籍",
    emoji: "📖",
    description: "文学作品 / 学术 / 经典",
    promptType: "书籍",
    series: "历史与脉络系列",
  },
  {
    key: "chemical-element",
    label: "化学元素",
    emoji: "⚛️",
    description: "化学元素 / 周期表",
    promptType: "化学元素",
    series: "寰宇惊奇系列",
  },
  {
    key: "country",
    label: "国家",
    emoji: "🏳️",
    description: "国家档案 / 地理 / 政治",
    promptType: "国家",
    series: "城市百科系列",
  },
  {
    key: "disease",
    label: "疾病",
    emoji: "🏥",
    description: "医学 / 病理 / 公共卫生",
    promptType: "疾病",
    series: "历史与脉络系列",
  },
  {
    key: "movie",
    label: "电影",
    emoji: "🎬",
    description: "影片 / 导演 / 电影史",
    promptType: "电影",
    series: "历史与脉络系列",
  },
  {
    key: "mythology",
    label: "神话",
    emoji: "🐉",
    description: "神话 / 传说 / 民俗",
    promptType: "神话",
    series: "历史与脉络系列",
  },
  {
    key: "profession",
    label: "职业",
    emoji: "👷",
    description: "职业 / 工种 / 行业",
    promptType: "职业",
    series: "历史与脉络系列",
  },
  {
    key: "space-object",
    label: "天体",
    emoji: "🪐",
    description: "行星 / 恒星 / 星系",
    promptType: "天体",
    series: "寰宇惊奇系列",
  },
  {
    key: "sport",
    label: "体育运动",
    emoji: "⚽",
    description: "运动 / 比赛 / 体育史",
    promptType: "体育运动",
    series: "工艺与造物系列",
  },
  {
    key: "vehicle",
    label: "交通工具",
    emoji: "🚗",
    description: "汽车 / 船舶 / 飞机 / 火车",
    promptType: "交通工具",
    series: "工艺与造物系列",
  },
  // R43 (2026-06-21): 2 new kinds. music / anime — for popular
  // songs and Japanese animation works respectively. User added
  // the corresponding category templates. Palette is purple
  // (#6E628C) per the category templates.
  {
    key: "music",
    label: "音乐",
    emoji: "🎵",
    description: "流行 / 古典 / 跨地域音乐作品",
    promptType: "音乐",
    series: "音乐图鉴系列",
  },
  {
    key: "anime",
    label: "动漫",
    emoji: "🎬",
    description: "日本动画 / 漫画改编 / 经典作品",
    promptType: "动漫",
    series: "动漫图鉴系列",
  },
];

/** Quick lookup by key */
export const THEME_TYPE_MAP: Record<string, ThemeType> = Object.fromEntries(
  THEME_TYPES.map((t) => [t.key, t]),
);

/** The list of valid theme type values used in the prompt (for validation) */
export const PROMPT_TYPES: string[] = Array.from(
  new Set(THEME_TYPES.map((t) => t.promptType)),
);