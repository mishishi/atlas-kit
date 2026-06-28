#!/usr/bin/env node
// Hand-write cross-cutting tags for the 43 R60 mmx-stubborn cards.
import fs from "node:fs";
import path from "node:path";
const cardsPath = path.resolve("data/cards.json");
const cards = JSON.parse(fs.readFileSync(cardsPath, "utf8"));
const TAGS = {
  "yew": ["植物", "中国", "长寿", "稀有", "工艺"],
  "peking-opera": ["中国", "传统", "戏曲", "文化"],
  "li-qingzhao": ["中国", "古代", "宋", "女性", "诗词"],
  "cold-food": ["中国", "古代", "传统", "节日", "纪念"],
  "luosifen": ["中国", "南方", "广西", "饮食", "夜宵"],
  "porcelain": ["中国", "古代", "工艺", "器物"],
  "zhuozheng-garden": ["中国", "江南", "古代", "园林", "苏州"],
  "the-scream": ["欧洲", "现代", "绘画", "表现主义", "蒙克"],
  "count-of-monte-cristo": ["欧洲", "现代", "小说", "法国", "复仇"],
  "3idiots": ["印度", "现代", "电影", "教育", "喜剧"],
  "new-zealand": ["大洋洲", "现代", "国家", "自然"],
  "silicon": ["元素", "半导体", "工艺", "现代"],
  "bicycle": ["中国", "全球", "交通", "绿色"],
  "lawyer": ["全球", "现代", "法律", "服务"],
  "aids": ["全球", "现代", "慢性", "传染", "医学"],
  "motorcycle": ["全球", "现代", "交通", "机械"],
  "thanksgiving": ["美国", "现代", "西方", "节日", "家庭"],
  "terracotta-warriors": ["中国", "古代", "秦", "考古", "西安"],
  "camellia": ["植物", "中国", "东亚", "观赏", "文化"],
  "internet-of-things": ["全球", "现代", "科技", "网络", "传感"],
  "traditional-chinese-medicine": ["中国", "传统", "医学", "文化"],
  "italy": ["欧洲", "现代", "国家", "文艺复兴"],
  "babylonian-mythology": ["古代", "中东", "神话", "两河"],
  "stroke": ["全球", "现代", "慢性", "心脑血管"],
  "helicopter": ["全球", "现代", "航空", "交通"],
  "evangelion": ["日本", "现代", "机甲", "动画", "科幻"],
  "chopin": ["欧洲", "近代", "音乐", "钢琴", "浪漫"],
  "ed-sheeran": ["全球", "现代", "音乐", "流行", "英国"],
  "kangxi": ["中国", "古代", "清", "帝王"],
  "neptune-god": ["古代", "希腊", "神话", "海洋"],
  "celadon": ["中国", "古代", "宋", "器物", "工艺"],
  "great-barrier-reef": ["大洋洲", "现代", "自然", "海洋"],
  "amazon-rainforest": ["南美", "现代", "自然", "生态"],
  "qin-empire": ["中国", "古代", "秦", "历史"],
  "all-blacks": ["大洋洲", "现代", "新西兰", "体育", "橄榄球"],
  "hagia-sophia": ["古代", "中世纪", "建筑", "宗教", "土耳其"],
  "pisa-tower": ["欧洲", "中世纪", "建筑", "意大利", "宗教"],
  "van-gogh-self": ["欧洲", "现代", "绘画", "后印象"],
  "water-lilies": ["欧洲", "现代", "法国", "绘画", "印象派"],
  "vietnam": ["东南亚", "现代", "国家", "战争"],
  "xenon": ["元素", "稀有", "惰性", "现代"],
  "anxiety-disorder": ["全球", "现代", "心理", "精神"],
  "satellite": ["全球", "现代", "航天", "通讯"],
  "cosmos": ["全球", "现代", "科普", "宇宙", "天文学"],
  "song-dynasty": ["中国", "古代", "宋", "历史"],
  "myth-of-rome": ["古代", "欧洲", "神话", "罗马"],
  "the-persistence-of-memory": ["欧洲", "现代", "超现实", "绘画"],
};
let added = 0;
for (const c of cards) {
  if (TAGS[c.slug] && (!c.tags || c.tags.length < 2)) {
    const seen = new Set(c.tags || []);
    for (const t of TAGS[c.slug]) if (!seen.has(t)) { (c.tags = c.tags || []).push(t); seen.add(t); }
    added++;
    console.log(`tags: ${c.slug} (${c.tags.length} total)`);
  }
}
fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + "\n", "utf8");
console.log(`Done. added=${added}.`);