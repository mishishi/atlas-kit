#!/usr/bin/env node
/**
 * R60plus cleanup: expand 5 short descriptions to 80+ characters.
 * History/sources/tags all OK — only description needs fleshing.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CARDS_PATH = path.join(ROOT, "data/cards.json");

const HAND = {
  "iceland": "冰岛是位于北大西洋北部的北欧岛国, 首都为雷克雅未克。该国地跨欧亚与美洲板块, 境内火山与冰川并存, 地热资源丰富, 以壮观的极光和独特的自然景观闻名于世。人口约 38 万, 是欧洲人口密度最低的国家之一。",
  "oxygen": "氧是化学元素, 符号 O, 原子序数 8, 在空气中约占五分之一, 支持燃烧和呼吸。氧是地壳中丰度最高的元素, 与大多数元素都能形成化合物, 是维持地球生命活动的必需物质, 也是工业、医疗与航天领域的关键原料。",
  "afghan-hound": "阿富汗猎犬原产于阿富汗, 是现存最古老的犬种之一, 以丝质长毛和优雅体态著称。它们曾是贵族狩猎大型猎物的高速视觉猎犬, 性格独立高贵, 对主人忠诚而不失傲气, 现主要作为伴侣犬参展, AKC 1926 年正式登记。",
  "inca-mythology": "印加神话是古代安第斯地区印加帝国的宗教与神话体系, 约在 13 至 16 世纪 (1200-1533 年) 期间发展鼎盛。核心信奉太阳神因蒂 (Inti) 与造物主维拉科查 (Viracocha), 包含山川、星辰、农事等丰富的自然崇拜, 与玛雅、阿兹特克神话并称美洲三大古文明神话体系。",
  "qufu": "曲阜位于山东省济宁市, 是孔子的故乡, 也是鲁国故都。作为国家历史文化名城, 曲阜以「三孔」—— 孔庙、孔府、孔林闻名于世, 是中国重要的文化遗产地, 也是儒家文化圈的精神朝圣地, 1994 年列入世界遗产名录。",
};

const cards = JSON.parse(readFileSync(CARDS_PATH, "utf8"));
let applied = 0;
const bySlug = new Map(cards.map((c) => [c.slug, c]));

for (const [slug, desc] of Object.entries(HAND)) {
  const card = bySlug.get(slug);
  if (!card) { console.error(`MISSING: ${slug}`); continue; }
  if (desc.length < 80) {
    console.error(`TOO SHORT: ${slug} (${desc.length} chars)`);
    continue;
  }
  card.description = desc;
  applied++;
  console.log(`OK ${slug}: ${desc.length} chars`);
}

writeFileSync(CARDS_PATH, JSON.stringify(cards, null, 2) + "\n", "utf8");
console.log(`\nApplied ${applied}.`);

const short = cards.filter((c) => !c.description || c.description.length < 80);
console.log(`Remaining short desc (<80): ${short.length}`);