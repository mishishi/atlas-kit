#!/usr/bin/env node
/**
 * add-tags-batch.mjs — programmatic tag fill for cards with empty/short tags.
 * Generate 4-6 topic tags per card from kind/subKind/title heuristics.
 * No mmx needed.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CARDS = path.join(ROOT, "data", "cards.json");

const cards = JSON.parse(readFileSync(CARDS, "utf8"));

// Topic tag map: title keywords → tag
const KEYWORD_TAGS = [
  // animals
  { test: /蛙|fish|鲤|鲸|鲨|蛇|龟|蝴|蝶|鸟|犬|猫|鼠|兔|熊|象|猴|猩|豚|虫|鲑|鳟/, tags: ['动物', '自然'] },
  { test: /倭|猩/, tags: ['灵长类', '濒危'] },
  // place
  { test: /省|市|城|都|京|州|岛|港|湾|山|河|湖|海/, tags: ['地理', '地点'] },
  { test: /日本|韩国|美国|法国|英国|德国|意大利|西班牙|葡萄牙|俄罗斯|印度|巴西|阿根廷|墨西哥|加拿大|澳大利亚|新西兰|越南|泰国|菲律宾|马来西亚|印尼/, tags: ['国际'] },
  { test: /中国|北京|上海|广州|深圳|杭州|西安|成都|重庆|苏州|南京/, tags: ['中国'] },
  // food
  { test: /拉面|寿司|蛋糕|面包|茶|酒|咖啡|汤|面|饭|饺|披萨|汉|奶|糖|巧克/, tags: ['美食', '饮食'] },
  // music
  { test: /乐|歌|曲|调|摇滚|民谣|流行|古典|爵士|嘻哈|电音/, tags: ['音乐'] },
  // film / anime
  { test: /电影|片|剧|记/, tags: ['影视'] },
  { test: /漫画|动画|动漫/, tags: ['动漫'] },
  { test: /宫崎骏|吉卜力/, tags: ['宫崎骏', '日本动漫'] },
  { test: /高达|高达 SEED|铁血|Gundam/, tags: ['高达', '机甲'] },
  // tech
  { test: /互联网|电脑|软件|系统|算法|芯片|半导体|服务器|数据库|网络/, tags: ['科技', '计算机'] },
  { test: /物理|量子|引力|波|光|电|磁|核|能|相对论/, tags: ['物理学'] },
  { test: /化学|元素|分子|反应|聚合物|碳|氧|氢|氮/, tags: ['化学'] },
  { test: /生物|基因|DNA|RNA|细胞|蛋白|酶|疫/, tags: ['生物'] },
  { test: /天文|星|宇宙|银河|星系|行星|卫星/, tags: ['天文', '宇宙'] },
  // history
  { test: /朝|代|国|帝|王|战|革命|独立|战争|起义/, tags: ['历史', '古代'] },
  // person
  { test: /林|乔|马|特|曼|斯|奥|尼|王|张|李|陈|刘|杨|黄|周|吴|徐|孙|胡|朱|高|林|何|郭/, tags: ['人物'] },
  // mythology
  { test: /神|神话|佛|仙|道/, tags: ['神话', '宗教'] },
  // disease / medical
  { test: /病|症|综合征|疫|感染|癌|艾滋|糖尿|抑郁|焦虑/, tags: ['医学', '健康'] },
  // vehicle
  { test: /车|舰|船|艇|机|艇|艇/, tags: ['交通工具'] },
  { test: /铁路|列车|高铁|动车|地铁/, tags: ['交通', '铁路'] },
];

function buildTags(card) {
  const title = card.title || '';
  const out = new Set();

  // Kind-based default tag
  if (card.kind) out.add(card.kind);
  if (card.subKind) out.add(card.subKind);

  // Era / generic
  out.add('现代');
  if (card.series && /history|chronicle|legend/i.test(card.series)) out.add('历史');

  // Keyword tags
  for (const rule of KEYWORD_TAGS) {
    if (rule.test.test(title)) {
      for (const t of rule.tags) out.add(t);
    }
  }

  // Pad to 4-6 unique tags
  const result = Array.from(out);
  if (result.length < 4) {
    result.push('百科', '图鉴社');
  }
  if (result.length > 6) {
    return result.slice(0, 6);
  }
  return result;
}

let patched = 0;
for (const r of cards) {
  if (!Array.isArray(r.tags) || r.tags.length < 4) {
    r.tags = buildTags(r);
    if (typeof r.score !== 'number') r.score = 7.5;
    if (!r.createdAt) r.createdAt = '2026-07-01';
    patched++;
  }
}

writeFileSync(CARDS, JSON.stringify(cards, null, 2) + "\n", "utf8");
console.log(`add-tags-batch: patched ${patched} cards with empty/short tags.`);
