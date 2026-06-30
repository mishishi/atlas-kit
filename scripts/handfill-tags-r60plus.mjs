#!/usr/bin/env node
/**
 * Hand-fill tags for 41 cards where mmx got 529-overloaded and fallback
 * only added generic tags. Each card gets 4-6 semantic tags hand-picked
 * from its kind/subKind/description context.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CARDS_PATH = path.join(ROOT, "data", "cards.json");

const HAND = {
  // === space-object (10) — all stars/galaxies/nebulae ===
  "sun": ["恒星", "太阳系", "全球", "天文学", "自然"],
  "sirius": ["恒星", "天狼星", "冬季夜空", "天文学", "全球"],
  "betelgeuse": ["恒星", "红超巨星", "猎户座", "天文学", "全球"],
  "vega": ["恒星", "织女星", "夏季夜空", "天文学", "全球"],
  "eagle-nebula": ["星云", "恒星形成", "天文学", "全球", "自然"],
  "virgo-cluster": ["星系团", "室女座", "天文学", "全球", "自然"],
  "hubble-telescope": ["天文望远镜", "空间望远镜", "美国航天", "天文学", "全球", "现代"],
  "iss": ["空间站", "载人航天", "国际合作", "工程", "现代"],
  "milky-way-cnt": ["星系", "银河", "天文学", "全球", "自然"],
  "saturn-v": ["运载火箭", "阿波罗", "美国航天", "航天工程", "现代"],

  // === pet / country / chem-element (15) ===
  "thailand": ["东南亚", "佛教", "近现代", "全球", "文化"],
  "singapore": ["东南亚", "城市国家", "现代", "全球", "金融"],
  "south-korea": ["东亚", "韩流", "现代", "全球", "文化"],
  "indonesia": ["东南亚", "群岛", "现代", "全球", "文化"],
  "argentina": ["南美", "潘帕斯", "近现代", "全球", "文化"],
  "kenya": ["非洲", "草原", "野生动物", "近现代", "全球"],
  "brazil": ["南美", "亚马逊", "现代", "全球", "文化"],
  "iceland": ["北欧", "火山", "现代", "全球", "自然"],
  "zinc": ["过渡金属", "化学元素", "全球", "工业", "自然"],
  "cesium": ["碱金属", "化学元素", "全球", "原子钟", "科学"],
  "krypton": ["稀有气体", "化学元素", "全球", "照明", "科学"],
  "potassium": ["碱金属", "化学元素", "全球", "营养", "科学"],
  "xenon": ["稀有气体", "化学元素", "全球", "照明", "科学"],
  "aluminum": ["后过渡金属", "化学元素", "全球", "工业", "材料"],
  "sulfur": ["非金属", "化学元素", "全球", "工业", "自然"],

  // === profession / disease (5) ===
  "middle-school-teacher": ["职业", "教育", "现代", "全球", "文化"],
  "civil-engineer": ["职业", "工程", "现代", "全球", "建设"],
  "down-syndrome": ["疾病", "染色体", "医学", "现代", "全球"],
  "cystic-fibrosis": ["疾病", "遗传病", "医学", "现代", "全球"],
  "sickle-cell": ["疾病", "血液病", "医学", "现代", "全球"],

  // === plant / festival / other (11) ===
  "tea-tree": ["植物", "茶", "工艺", "全球", "自然"],
  "white-tea": ["植物", "茶", "工艺", "中国", "文化"],
  "temple-fair": ["节庆", "庙会", "中国", "民俗", "传统"],
  "dragon-boat-ceremony": ["节庆", "端午", "中国", "民俗", "文化"],
  "mazu-worship": ["信仰", "妈祖", "中国", "民俗", "非遗"],
  "mars-rover": ["火星车", "探测器", "美国航天", "现代", "全球"],
  "steamboat": ["船", "蒸汽", "工业革命", "工程", "近代"],
  "weather-balloon": ["气象", "大气", "科学", "现代", "全球"],
  "sage": ["植物", "草药", "全球", "自然", "工艺"],
  "iron-pillar": ["文物", "印度", "古代", "金属", "全球"],
  "hourglass": ["仪器", "计时", "古代", "工艺", "全球"],
};

const cards = JSON.parse(readFileSync(CARDS_PATH, "utf8"));
let applied = 0, skipped = 0;
const bySlug = new Map(cards.map((c) => [c.slug, c]));

for (const [slug, tags] of Object.entries(HAND)) {
  const card = bySlug.get(slug);
  if (!card) { console.error(`MISSING: ${slug}`); skipped++; continue; }
  card.tags = [...new Set(tags)];
  applied++;
}

writeFileSync(CARDS_PATH, JSON.stringify(cards, null, 2) + "\n", "utf8");
console.log(`Hand-filled ${applied}, skipped ${skipped}.`);

const short = cards.filter((c) => !c.tags || c.tags.length < 4);
console.log(`Remaining short: ${short.length}`);
short.slice(0, 10).forEach((c) => console.log(`  ${c.slug} | ${c.tags?.join(",")}`));