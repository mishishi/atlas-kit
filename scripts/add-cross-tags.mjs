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
  // R30: architecture kind (great-wall + potala-palace)
  "great-wall": ["建筑", "中国", "古代", "防御", "世界遗产"],
  "potala-palace": ["建筑", "中国", "古代", "宫殿", "西藏", "世界遗产"],
  // R31: architecture kind (3 more, completing 5-card target)
  "yingxian-wooden-pagoda": ["建筑", "中国", "古代", "木构", "佛教", "世界遗产"],
  "zhaozhou-bridge": ["建筑", "中国", "古代", "桥梁", "工程", "世界遗产"],
  "yellow-crane-tower": ["建筑", "中国", "古代", "楼阁", "文学", "江南"],
  // R33: artwork kind (5 cards, R33 PoC) — R33 review 漏写, R34 补
  "mona-lisa": ["艺术品", "意大利", "文艺复兴", "肖像"],
  "starry-night": ["艺术品", "后印象", "夜景", "天文"],
  "the-last-supper": ["艺术品", "意大利", "文艺复兴", "宗教"],
  "guernica": ["艺术品", "西班牙", "现代", "战争"],
  "girl-with-pearl-earring": ["艺术品", "荷兰", "巴洛克", "肖像"],
  // R34: mythology kind (5 cards, R34 first batch)
  "norse-mythology": ["神话", "欧洲", "古代", "维京", "宗教"],
  "greek-mythology": ["神话", "欧洲", "古代", "哲学", "文化"],
  "hindu-mythology": ["神话", "亚洲", "古代", "宗教", "哲学"],
  "japanese-mythology": ["神话", "亚洲", "古代", "神道", "宗教"],
  "egyptian-mythology": ["神话", "非洲", "古代", "宗教", "文化"],
  // R34: movie kind (5 cards, R34 second batch)
  "the-godfather": ["电影", "美国", "20世纪", "黑帮", "经典"],
  "seven-samurai": ["电影", "日本", "20世纪", "武士", "经典"],
  "citizen-kane": ["电影", "美国", "20世纪", "剧情", "经典"],
  "farewell-my-concubine": ["电影", "中国", "20世纪", "戏曲", "近代"],
  "spirited-away": ["电影", "日本", "21世纪", "动画", "奇幻"],
  // R34: book kind (staging cards, 2 of 5 generated so far — full 5 in R34 next batch)
  "dream-of-the-red-chamber": ["文学", "中国", "古代", "小说", "经典"],
  "war-and-peace": ["文学", "俄罗斯", "19世纪", "小说", "经典"],
  // R34: book kind (3 more, completing 5-card target)
  "ulysses": ["文学", "爱尔兰", "20世纪", "现代主义", "经典"],
  "one-hundred-years-of-solitude": ["文学", "拉美", "20世纪", "魔幻现实主义", "经典"],
  "in-search-of-lost-time": ["文学", "法国", "20世纪", "现代主义", "经典"],
  // R34: space-object kind (5 cards)
  "andromeda-galaxy": ["天文", "星系", "河外", "观测"],
  "crab-nebula": ["天文", "星云", "超新星", "脉冲星"],
  "black-hole": ["天文", "天体", "广义相对论", "极端"],
  "mars": ["天文", "行星", "太阳系", "探测"],
  "europa": ["天文", "卫星", "木星", "冰下海洋"],
  // R34: sport kind (5 cards)
  "football": ["体育", "球类", "全球", "团队"],
  "basketball": ["体育", "球类", "美国", "团队"],
  "go": ["体育", "棋类", "亚洲", "智力"],
  "marathon": ["体育", "田径", "全球", "耐力"],
  "table-tennis": ["体育", "球类", "亚洲", "技巧"],
  // R34: country kind (5 cards)
  "france": ["国家", "欧洲", "西方", "文化"],
  "egypt": ["国家", "非洲", "古代", "文明"],
  "brazil": ["国家", "南美", "热带", "多元"],
  "iceland": ["国家", "欧洲", "极地", "自然"],
  "kenya": ["国家", "非洲", "草原", "野生动物"],
  // R34: chemical-element kind (5 cards)
  "carbon": ["化学", "非金属", "基础", "有机"],
  "gold": ["化学", "金属", "贵金属", "文化"],
  "oxygen": ["化学", "非金属", "生命", "大气"],
  "iron": ["化学", "金属", "工业", "基础"],
  "uranium": ["化学", "金属", "放射性", "能源"],
  // R34: profession kind (5 cards)
  "physician": ["职业", "医疗", "全球", "服务"],
  "architect": ["职业", "建筑", "全球", "设计"],
  "chef": ["职业", "餐饮", "全球", "文化"],
  "astronaut": ["职业", "航天", "全球", "科学"],
  "farmer": ["职业", "农业", "全球", "基础"],
  // R34: disease kind (5 cards)
  "malaria": ["医学", "传染病", "全球", "蚊媒"],
  "tuberculosis": ["医学", "传染病", "全球", "细菌"],
  "smallpox": ["医学", "传染病", "历史", "已消灭"],
  "diabetes": ["医学", "慢性病", "全球", "代谢"],
  "alzheimers-disease": ["医学", "神经退行", "老年", "研究"],
  // R34: vehicle kind (5 cards)
  "ford-model-t": ["交通", "汽车", "美国", "20世纪初"],
  "concorde": ["交通", "飞机", "英法", "20世纪"],
  "ford-mustang": ["交通", "汽车", "美国", "肌肉车"],
  "f-22-raptor": ["交通", "战斗机", "美国", "隐身"],
  "citroen-2cv": ["交通", "汽车", "法国", "国民车"],
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
