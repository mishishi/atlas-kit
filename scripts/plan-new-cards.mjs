#!/usr/bin/env node
// scripts/plan-new-cards.mjs
//
// 读取 data/cards.json,根据 kind 缺口 + 内置候选池,自动生成
// 新的主题列表。输出到 tmp/new-cards-plan.json,供后续
// generate-card.mjs / batch-generate.mjs 消费。
//
// 候选池覆盖 prompt-template/categories/ 目录下所有 24 个 kind。
// 默认行为: 只补 "current > 0 && current < 5" 的 kind(目前
// 只有 architecture 差 4 张)。加 --include-empty 才把
// current=0 的全新 kind 纳入计划。
//
// 用法:  node scripts/plan-new-cards.mjs
//        node scripts/plan-new-cards.mjs --kind architecture --count 4
//        node scripts/plan-new-cards.mjs --include-empty
//        node scripts/plan-new-cards.mjs --dry-run
//        node scripts/plan-new-cards.mjs --kinds movie,book --include-empty  # R34 多个 empty kind
//        node scripts/plan-new-cards.mjs --kind movie --include-empty         # 等价于 --kinds movie

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const onlyKind = (args.includes("--kind") ? args[args.indexOf("--kind") + 1] : null);
// R34: --kinds 是 --kind 的复数版(逗号分隔),跟 finish-card 的 --only-kinds 风格一致
const onlyKindsArg = (args.includes("--kinds") ? args[args.indexOf("--kinds") + 1] : null);
const onlyKinds = onlyKindsArg
  ? onlyKindsArg.split(",").map((s) => s.trim()).filter(Boolean)
  : onlyKind
    ? [onlyKind]
    : null;
const forceCount = (args.includes("--count") ? parseInt(args[args.indexOf("--count") + 1], 10) : null);
const includeEmpty = args.includes("--include-empty");
const dryRun = args.includes("--dry-run");

// 1. kind 目标张数
const KIND_TARGET = 5;

// 2. 全 24 个 kind 候选池(跟 prompt-template/categories/ 对齐)
//    排序:更主流 / 视觉冲击强 / 数据丰富的排在前面
const KIND_CANDIDATES = {
  // === 老 12 kind(已有数据)===
  pet: [
    { title: "柴犬", slug: "shiba-inu" },
    { title: "金毛寻回犬", slug: "golden-retriever" },
    { title: "暹罗猫", slug: "siamese-cat" },
    { title: "荷兰猪", slug: "guinea-pig" },
    { title: "虎皮鹦鹉", slug: "budgerigar" },
  ],
  animal: [
    { title: "金丝猴", slug: "golden-snub-nosed-monkey" },
    { title: "扬子鳄", slug: "chinese-alligator" },
    { title: "黑颈鹤", slug: "black-necked-crane" },
    { title: "普氏原羚", slug: "przewalskis-gazelle" },
    { title: "中华白海豚", slug: "chinese-white-dolphin" },
  ],
  plant: [
    { title: "牡丹", slug: "peony" },
    { title: "菊花", slug: "chrysanthemum" },
    { title: "红豆杉", slug: "yew" },
    { title: "珙桐", slug: "dove-tree" },
    { title: "水杉", slug: "dawn-redwood" },
  ],
  city: [
    { title: "成都", slug: "chengdu" },
    { title: "洛阳", slug: "luoyang" },
    { title: "大理", slug: "dali" },
    { title: "厦门", slug: "xiamen" },
    { title: "拉萨", slug: "lhasa" },
  ],
  person: [
    { title: "王羲之", slug: "wang-xizhi" },
    { title: "李清照", slug: "li-qingzhao" },
    { title: "曹雪芹", slug: "cao-xueqin" },
    { title: "祖冲之", slug: "zu-chongzhi" },
    { title: "林则徐", slug: "lin-zexu" },
  ],
  festival: [
    { title: "元宵节", slug: "lantern-festival" },
    { title: "七夕", slug: "qixi" },
    { title: "重阳节", slug: "double-ninth" },
    { title: "腊八节", slug: "laba-festival" },
    { title: "寒食节", slug: "hanshi" },
  ],
  food: [
    { title: "西湖醋鱼", slug: "west-lake-vinegar-fish" },
    { title: "佛跳墙", slug: "fotiaoqiang" },
    { title: "臭豆腐", slug: "stinky-tofu" },
    { title: "兰州牛肉面", slug: "lanzhou-beef-noodles" },
    { title: "东坡肉", slug: "dongpo-pork" },
  ],
  phenomenon: [
    { title: "海市蜃楼", slug: "mirage" },
    { title: "日食", slug: "solar-eclipse" },
    { title: "流星雨", slug: "meteor-shower" },
    { title: "龙卷风", slug: "tornado" },
    { title: "极昼极夜", slug: "polar-day-night" },
  ],
  history: [
    { title: "虎门销烟", slug: "humen-opium-destruction" },
    { title: "赤壁之战", slug: "battle-of-red-cliffs" },
    { title: "文景之治", slug: "reign-of-wen-jing" },
    { title: "开元盛世", slug: "kaiyuan-prosperity" },
    { title: "淝水之战", slug: "battle-of-fei-river" },
  ],
  object: [
    { title: "司母戊鼎", slug: "houmuwu-ding" },
    { title: "铜奔马", slug: "galloping-horse-treading-on-a-swallow" },
    { title: "金缕玉衣", slug: "jade-burial-suit" },
    { title: "四羊方尊", slug: "si-yang-fang-zun" },
    { title: "曾侯乙编钟", slug: "bells-of-zenghouyi" },
  ],
  tech: [
    { title: "可控核聚变", slug: "nuclear-fusion" },
    { title: "脑机接口", slug: "brain-computer-interface" },
    { title: "基因编辑", slug: "gene-editing" },
    { title: "光刻机", slug: "lithography-machine" },
    { title: "暗物质探测", slug: "dark-matter-detection" },
  ],
  other: [
    { title: "敦煌壁画", slug: "dunhuang-murals" },
    { title: "京剧", slug: "peking-opera" },
    { title: "茶马古道", slug: "tea-horse-road" },
    { title: "妈祖信仰", slug: "mazu-worship" },
    { title: "二十四节气", slug: "twenty-four-solar-terms" },
  ],
  // === architecture(目前唯一 current=1,需补 4 张)===
  architecture: [
    { title: "布达拉宫", slug: "potala-palace" },
    { title: "应县木塔", slug: "yingxian-wooden-pagoda" },
    { title: "赵州桥", slug: "zhaozhou-bridge" },
    { title: "黄鹤楼", slug: "yellow-crane-tower" },
    { title: "天坛", slug: "temple-of-heaven" },
    { title: "平遥古城", slug: "pingyao-ancient-city" },
    { title: "大雁塔", slug: "giant-wild-goose-pagoda" },
    { title: "岳阳楼", slug: "yueyang-tower" },
  ],
  // === 新加 11 个 kind(cards.json 暂未启用,--include-empty 才考虑)===
  artwork: [
    { title: "蒙娜丽莎", slug: "mona-lisa" },
    { title: "星夜", slug: "starry-night" },
    { title: "最后的晚餐", slug: "the-last-supper" },
    { title: "格尔尼卡", slug: "guernica" },
    { title: "戴珍珠耳环的少女", slug: "girl-with-pearl-earring" },
  ],
  book: [
    { title: "红楼梦", slug: "dream-of-the-red-chamber" },
    { title: "战争与和平", slug: "war-and-peace" },
    { title: "尤利西斯", slug: "ulysses" },
    { title: "百年孤独", slug: "one-hundred-years-of-solitude" },
    { title: "追忆似水年华", slug: "in-search-of-lost-time" },
  ],
  "chemical-element": [
    { title: "碳", slug: "carbon" },
    { title: "金", slug: "gold" },
    { title: "氧", slug: "oxygen" },
    { title: "铁", slug: "iron" },
    { title: "铀", slug: "uranium" },
  ],
  country: [
    { title: "法国", slug: "france" },
    { title: "埃及", slug: "egypt" },
    { title: "巴西", slug: "brazil" },
    { title: "冰岛", slug: "iceland" },
    { title: "肯尼亚", slug: "kenya" },
  ],
  disease: [
    { title: "疟疾", slug: "malaria" },
    { title: "肺结核", slug: "tuberculosis" },
    { title: "天花", slug: "smallpox" },
    { title: "糖尿病", slug: "diabetes" },
    { title: "阿尔茨海默症", slug: "alzheimers-disease" },
  ],
  movie: [
    { title: "教父", slug: "the-godfather" },
    { title: "七武士", slug: "seven-samurai" },
    { title: "公民凯恩", slug: "citizen-kane" },
    { title: "霸王别姬", slug: "farewell-my-concubine" },
    { title: "千与千寻", slug: "spirited-away" },
  ],
  mythology: [
    { title: "北欧神话", slug: "norse-mythology" },
    { title: "希腊神话", slug: "greek-mythology" },
    { title: "印度教神话", slug: "hindu-mythology" },
    { title: "日本神话", slug: "japanese-mythology" },
    { title: "埃及神话", slug: "egyptian-mythology" },
  ],
  profession: [
    { title: "医生", slug: "physician" },
    { title: "建筑师", slug: "architect" },
    { title: "厨师", slug: "chef" },
    { title: "宇航员", slug: "astronaut" },
    { title: "农民", slug: "farmer" },
  ],
  "space-object": [
    { title: "仙女座星系", slug: "andromeda-galaxy" },
    { title: "蟹状星云", slug: "crab-nebula" },
    { title: "黑洞", slug: "black-hole" },
    { title: "火星", slug: "mars" },
    { title: "木卫二", slug: "europa" },
  ],
  sport: [
    { title: "足球", slug: "football" },
    { title: "篮球", slug: "basketball" },
    { title: "围棋", slug: "go" },
    { title: "马拉松", slug: "marathon" },
    { title: "乒乓球", slug: "table-tennis" },
  ],
  vehicle: [
    { title: "福特 T 型车", slug: "ford-model-t" },
    { title: "协和飞机", slug: "concorde" },
    { title: "福特野马", slug: "ford-mustang" },
    { title: "F-22 猛禽", slug: "f-22-raptor" },
    { title: "雪铁龙 2CV", slug: "citroen-2cv" },
  ],
};

// 3. kind → 默认 series slug
//    对老 12 kind 跟 cards.json 实际一致
//    对新 11 kind 暂时归到 atlas-miscellany 等系列(待 cards.json 真实数据再细化)
const KIND_DEFAULT_SERIES = {
  pet: "pet-breed-guide",
  animal: "wild-fauna-atlas",
  city: "city-encyclopedia",
  festival: "festival-almanac",
  food: "culinary-corner",
  person: "history-and-figures",
  history: "history-and-figures",
  phenomenon: "frontiers-and-wonders",
  tech: "frontiers-and-wonders",
  object: "craft-and-botanical",
  other: "craft-and-botanical",
  architecture: "craft-and-botanical",
  plant: "craft-and-botanical",
  // 新 11 kind — 暂归到 craft-and-botanical (跟 architecture / object 同源)
  // 后续可拆分出 art-literature-museum / natural-sciences 等系列
  artwork: "craft-and-botanical",
  book: "craft-and-botanical",
  "chemical-element": "frontiers-and-wonders",
  country: "frontiers-and-wonders",
  disease: "frontiers-and-wonders",
  movie: "craft-and-botanical",
  mythology: "craft-and-botanical",
  profession: "history-and-figures",
  "space-object": "frontiers-and-wonders",
  sport: "history-and-figures",
  vehicle: "craft-and-botanical",
};

// 4. 兜底调色板(米黄 + 沙金 + 深褐,跟 architecture 同源;对 kind 不够丰富的默认)
function defaultPaletteFor(kind) {
  return ["#F5F0E6", "#B88952", "#8C7F6E"];
}

// === main ===
const cards = JSON.parse(fs.readFileSync(path.resolve("data/cards.json"), "utf8"));

// 1. 统计 kind 分布
const byKind = {};
cards.forEach((c) => { byKind[c.kind] = (byKind[c.kind] || 0) + 1; });

// 2. 找缺口
//    默认:只补 current > 0 的 kind(目前只有 architecture)
//    --include-empty: 把 current=0 的 kind 也纳入,每 kind 5 张
//    R34: --kinds 是 allowlist(逗号分隔),--include-empty 模式下只扫这些 kind;
//         不传 --kinds 时退回原有 behavior(--kind 单数,或不传扫所有)
const gaps = Object.keys(KIND_CANDIDATES)
  .filter((k) => (onlyKinds ? onlyKinds.includes(k) : true))
  .filter((k) => includeEmpty || (byKind[k] || 0) > 0)
  .map((k) => ({
    kind: k,
    current: byKind[k] || 0,
    need: forceCount !== null
      ? forceCount
      : Math.max(0, KIND_TARGET - (byKind[k] || 0)),
  }))
  .filter((g) => g.need > 0);

// 3. 已用 slug 集合
const usedSlugs = new Set(cards.map((c) => c.slug));

// 4. 从候选池取
const plan = [];
const warnings = [];
for (const gap of gaps) {
  const candidates = KIND_CANDIDATES[gap.kind] || [];
  const available = candidates.filter((c) => !usedSlugs.has(c.slug));
  if (available.length < gap.need) {
    warnings.push(
      `${gap.kind} 候选池只有 ${available.length} 项,目标需要 ${gap.need} 张。` +
      `请编辑 scripts/plan-new-cards.mjs 的 KIND_CANDIDATES.${gap.kind} 补充候选。`,
    );
  }
  const take = available.slice(0, gap.need);
  for (const c of take) {
    plan.push({
      kind: gap.kind,
      title: c.title,
      slug: c.slug,
      series: KIND_DEFAULT_SERIES[gap.kind] || "craft-and-botanical",
      palette: defaultPaletteFor(gap.kind),
    });
  }
}

// 5. 算 seriesNo (同 series 内的下一个号)
const seriesCount = {};
for (const c of cards) seriesCount[c.series] = (seriesCount[c.series] || 0) + 1;
plan.forEach((p) => {
  const next = (seriesCount[p.series] || 0) + 1;
  p.seriesNo = String(next).padStart(3, "0");
  seriesCount[p.series] = next;
});

const out = {
  generatedAt: new Date().toISOString(),
  source: "scripts/plan-new-cards.mjs",
  includeEmpty,
  plan,
  warnings,
};

if (dryRun) {
  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
}

const outDir = path.resolve("tmp");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "new-cards-plan.json");
fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");

console.log(`Wrote ${plan.length} new card(s) to ${outPath}:`);
plan.forEach((p) => {
  console.log(`  - ${p.kind}/${p.series}/${p.seriesNo}  ${p.title}  (slug: ${p.slug})`);
});
if (warnings.length) {
  console.log(`\nWarnings:`);
  warnings.forEach((w) => console.log(`  ! ${w}`));
}
