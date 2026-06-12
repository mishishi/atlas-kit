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
];

/** Quick lookup by key */
export const THEME_TYPE_MAP: Record<string, ThemeType> = Object.fromEntries(
  THEME_TYPES.map((t) => [t.key, t]),
);

/** The list of valid theme type values used in the prompt (for validation) */
export const PROMPT_TYPES: string[] = Array.from(
  new Set(THEME_TYPES.map((t) => t.promptType)),
);