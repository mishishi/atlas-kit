#!/usr/bin/env node
/**
 * Round 2: hand-fill the remaining 20 short-tags cards.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CARDS_PATH = path.join(ROOT, "data", "cards.json");

const HAND = {
  "polaris": ["恒星", "北极星", "天文学", "全球", "导航"],
  "altair": ["恒星", "牛郎星", "天文学", "东亚", "民俗"],
  "fomalhaut": ["恒星", "南鱼座", "天文学", "全球", "行星盘"],
  "antares": ["恒星", "红超巨星", "天蝎座", "天文学", "全球"],
  "guinea-pig": ["宠物", "小型哺乳", "南美", "全球", "家养"],
  "rabbit": ["宠物", "小型哺乳", "全球", "东亚", "家养"],
  "canary": ["宠物", "鸟类", "全球", "鸣禽", "家养"],
  "malaysia": ["东南亚", "热带", "现代", "全球", "多元文化"],
  "philippines": ["东南亚", "群岛", "现代", "全球", "西语文化"],
  "gaucher": ["疾病", "代谢", "医学", "全球", "罕见病"],
  "microscope": ["仪器", "光学", "科学", "全球", "古代近代"],
  "npc": ["建筑", "剧院", "现代", "中国", "北京"],
  "kangxi-emp": ["人物", "帝王", "清代", "中国", "古代"],
  "zisha-pot": ["工艺", "紫砂", "茶具", "中国", "明代以来"],
  "lantingxu": ["书法", "东晋", "中国", "艺术", "名帖"],
  "embroidery": ["工艺", "刺绣", "中国", "传统", "非遗"],
  "self-strengthening": ["历史事件", "清末", "中国", "近代", "改革"],
  "chinese-chess": ["棋类", "智力", "中国", "传统", "古代"],
  "ice-skating": ["运动", "冬季", "全球", "体育", "现代"],
  "wang-wei": ["人物", "诗人", "唐代", "中国", "古代"],
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