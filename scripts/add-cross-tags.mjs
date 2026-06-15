#!/usr/bin/env node
// Add cross-cutting category tags to each card so the "你可能也会
// 喜欢" algorithm has signal to work with. The current per-card tags
// are mostly unique descriptive words, so 99% of card pairs share 0
// tags. This script adds 2-3 high-level categorical tags per card
// based on kind/series/content patterns.
//
// Tag axes used:
//   era:     古代, 近代, 现代 (when the SUBJECT matters, not the card's age)
//   region:  中国, 东亚, 全球, 北方, 江南, 西北, 西南, 高原
//   theme:   自然, 城市, 工艺, 科技, 文化, 节日, 食物, 历史, 神话,
//            文学, 哲学, 物理, 数学
//   subject: 哺乳, 鸟类, 爬行, 植物, 矿物, 器物, 建筑, 食物
//
// Rules-based assignment keeps the script deterministic and the
// tags consistent (we don't want "古代" and "古时候" for the same era).
import fs from "node:fs";
import path from "node:path";

const cardsPath = path.resolve("data/cards.json");
const cards = JSON.parse(fs.readFileSync(cardsPath, "utf8"));

/** Hard-coded cross-cutting tag map. Each card gets at minimum 2
 *  cross-cutting tags. Edit the values, not the structure, to add
 *  more dimensions. */
const CROSS_TAGS = {
  // pets
  "belgian-malinois": ["哺乳", "全球", "工作"],
  "labrador-retriever": ["哺乳", "全球", "家庭"],
  "ragdoll": ["哺乳", "全球", "家庭"],
  "cockatiel": ["鸟类", "全球", "家庭"],
  "corn-snake": ["爬行", "全球", "家庭"],
  // animals
  "tibetan-antelope": ["哺乳", "中国", "高原", "自然", "濒危"],
  "giant-panda": ["哺乳", "中国", "自然", "濒危"],
  "snow-leopard": ["哺乳", "高原", "自然", "濒危"],
  "siberian-tiger": ["哺乳", "中国", "自然", "濒危"],
  "crested-ibis": ["鸟类", "中国", "自然", "濒危"],
  // plants
  "longjing-tea": ["植物", "中国", "江南", "饮食"],
  "ginkgo": ["植物", "全球", "长寿"],
  "plum-blossom": ["植物", "中国", "江南", "文化"],
  "orchid": ["植物", "中国", "文化"],
  "bamboo": ["植物", "中国", "文化"],
  // cities
  "shanghai": ["城市", "中国", "现代", "江南"],
  "hangzhou": ["城市", "中国", "江南"],
  "suzhou": ["城市", "中国", "江南", "文化"],
  "xian": ["城市", "中国", "西北", "古代"],
  "beijing": ["城市", "中国", "北方", "古代"],
  // persons
  "li-bai": ["人物", "中国", "古代", "文学", "盛唐"],
  "du-fu": ["人物", "中国", "古代", "文学", "盛唐"],
  "su-shi": ["人物", "中国", "古代", "文学", "宋代"],
  "cai-lun": ["人物", "中国", "古代", "工艺", "东汉"],
  "zhang-heng": ["人物", "中国", "古代", "科技", "东汉"],
  // festivals
  "spring-festival": ["节日", "中国", "饮食", "文化"],
  "winter-solstice": ["节日", "中国", "饮食", "文化"],
  "qingming": ["节日", "中国", "文化", "二十四节气"],
  "dragon-boat": ["节日", "中国", "饮食", "文化"],
  "mid-autumn": ["节日", "中国", "饮食", "文化"],
  // foods
  "peking-duck": ["食物", "中国", "北方", "饮食"],
  "lamian": ["食物", "中国", "西北", "饮食", "非遗"],
  "rougamo": ["食物", "中国", "西北", "饮食"],
  "yum-cha": ["食物", "中国", "南方", "饮食", "非遗"],
  "chongqing-hotpot": ["食物", "中国", "西南", "饮食"],
  // phenomena
  "plum-rain": ["自然", "中国", "江南", "气候"],
  "aurora": ["自然", "全球", "物理", "高纬度"],
  "qiantang-tide": ["自然", "中国", "物理", "天文"],
  "tide": ["自然", "全球", "物理", "天文"],
  "el-nino": ["自然", "全球", "气候", "物理"],
  // history
  "silk-road": ["历史", "中国", "古代", "贸易"],
  "reign-of-zhenguan": ["历史", "中国", "古代", "盛唐"],
  "an-shi-rebellion": ["历史", "中国", "古代", "盛唐"],
  "hundred-days-reform": ["历史", "中国", "近代"],
  "xian-incident": ["历史", "中国", "近代"],
  // objects
  "agate": ["矿物", "全球", "工艺"],
  "jade-bi": ["器物", "中国", "古代", "礼器", "文化"],
  "lacquerware": ["器物", "中国", "古代", "工艺", "文化"],
  "blue-white-porcelain": ["器物", "中国", "古代", "工艺", "文化"],
  "abacus": ["器物", "中国", "古代", "数学", "非遗"],
  // tech
  "5g": ["科技", "全球", "现代", "物理"],
  "artificial-intelligence": ["科技", "全球", "现代", "数学"],
  "quantum-computing": ["科技", "全球", "现代", "物理", "数学"],
  "blockchain": ["科技", "全球", "现代", "数学"],
  "space-station": ["科技", "全球", "现代", "物理"],
  // misc
  "forbidden-city": ["建筑", "中国", "古代", "北方", "文化", "世界遗产"],
  "mogao-caves": ["建筑", "中国", "古代", "西北", "文化", "世界遗产"],
  "suzhou-gardens": ["建筑", "中国", "江南", "文化", "世界遗产"],
  "three-body": ["文学", "中国", "现代", "科幻"],
  "sanxingdui": ["历史", "中国", "古代", "西南", "考古"],
};

let updated = 0;
for (const c of cards) {
  const cross = CROSS_TAGS[c.slug];
  if (!cross) {
    console.log(`  WARN: no cross-tags for ${c.slug} (${c.title})`);
    continue;
  }
  // Append cross-tags to existing tags, dedup. Keep original per-card
  // descriptive tags so the wizard prompt context isn't lost.
  const seen = new Set(c.tags);
  for (const t of cross) {
    if (!seen.has(t)) {
      c.tags.push(t);
      seen.add(t);
    }
  }
  updated++;
}

fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + "\n", "utf8");
console.log(`Added cross-cutting tags to ${updated} cards.`);
console.log("Tag frequency sanity check (top 10):");
const counts = new Map();
for (const c of cards) for (const t of c.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
[...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([t, n]) => console.log("  " + t + ": " + n));
