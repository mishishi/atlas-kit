#!/usr/bin/env node
/**
 * Hand-fill quote for 26 cards where fallback failed (description too short
 * or contaminated). Picked from card's description / context — short, ~15-30 char
 * Chinese phrase that could serve as a "quote" card.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CARDS_PATH = path.join(ROOT, "data", "cards.json");

const QUOTES = {
  "peregrine-falcon": "俯冲时速可达 389 公里, 是地球上最快的动物。",
  "radiohead": "我们不是在写歌, 我们是在建房子。",
  "alipay": "中国数字经济的基础设施之一, 日均交易量过亿。",
  "linux": "开源精神的活化石, 统治了服务器与移动设备两端。",
  "mozart": "上帝亲吻过的孩子, 五岁写出第一部交响曲。",
  "chopin": "钢琴诗人, 把夜曲写到了前无古人的高度。",
  "x-japan": "视觉系摇滚的代名词, 古典与金属的融合实验。",
  "apollo": "光明之神, 司掌艺术与预言, 罗马名为福玻斯。",
  "a-brief-history-of-time": "宇宙的终极问题, 在这本薄薄的小书里被温柔讲述。",
  "qing-porcelain": "康雍乾三朝把粉彩工艺推向了中国瓷器的视觉巅峰。",
  "amazon-rainforest": "地球之肺, 贡献了全球氧气总量的 6%。",
  "milky-way-cnt": "银河系的心脏, 藏着一个 400 万倍太阳质量的超大质量黑洞。",
  "yellow-mountain": "五岳归来不看山, 黄山归来不看岳。",
  "lijiang": "茶马古道上的活化石, 纳西古乐至今仍在玉龙雪山脚下回响。",
  "all-blacks": "比赛前的哈卡战舞, 是橄榄球世界里最震慑人心的仪式。",
  "taj-mahal": "一滴凝固在时间里的永恒眼泪。",
  "xenon": "稀有气体, 但在我们的车灯与投影仪里从不缺席。",
  "satellite": "现代社会的 6000+ 个隐形基础设施, GPS 与天气都靠它们。",
  "virgo-cluster": "我们的银河系, 正是这个 1300 个星系组成的宇宙都市的一员。",
  "lizard": "会断尾求生的冷血宠物, 守宫用脚趾粘住天花板。",
  "singapore": "从第三世界到第一世界, 建国 60 年的奇迹。",
  "zinc": "人体必需的微量元素, 也是镀锌钢板的主角。",
  "tcm-doctor": "望闻问切四诊合参, 是中国延续三千年的诊断哲学。",
  "white-tea": "一年茶, 三年药, 七年宝。",
  "canary": "曾经是煤矿工人的安全警报, 现在是客厅里的歌手。",
  "zisha-pot": "世间茶具称为首, 紫砂壶内水长新。",
};

const cards = JSON.parse(readFileSync(CARDS_PATH, "utf8"));
let applied = 0;
const bySlug = new Map(cards.map((c) => [c.slug, c]));

for (const [slug, quote] of Object.entries(QUOTES)) {
  const card = bySlug.get(slug);
  if (!card) { console.error(`MISSING: ${slug}`); continue; }
  card.quote = quote;
  applied++;
}

writeFileSync(CARDS_PATH, JSON.stringify(cards, null, 2) + "\n", "utf8");
console.log(`Hand-filled quotes: ${applied}`);

const noQuote = cards.filter((c) => !c.quote).length;
console.log(`Remaining no-quote: ${noQuote}`);