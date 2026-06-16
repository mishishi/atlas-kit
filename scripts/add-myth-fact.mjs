// Hand-written myth/fact pairs for the 10 most-misunderstood cards.
// Run once: `node scripts/add-myth-fact.mjs` (idempotent — skips cards
// that already have myth/fact). Each pair is editorial: short, factual,
// and addresses a real misconception a curious reader might have.
//
// Source notes per pair:
//   - 寒食 vs 清明: 《荆楚岁时记》(宗懔, 6th c.) records 寒食禁火三日
//     starting from 冬至第 105 日, NOT 清明前一日. 唐代(玄宗开元二十年
//     732)才正式将 寒食 上巳合并为三节, 清明"扫墓"是宋元后普及.
//   - 西湖龙井 vs 龙井: GB/T 8322-2008 划定西湖产区仅 168 km² (西湖区
//     行政范围), 其它"龙井茶"产区是钱塘/越州, 同名不同质.
//   - 故宫 vs 紫禁城: 1925 年 10 月 10 日 溥仪出宫后, 故宫博物院挂牌
//     成立, "故宫"成为博物馆名. "紫禁城"是明清两代皇家禁苑旧名.
//   - 三星堆 ≠ 夏商周: 碳 14 测年三星堆一二期约前 2800-前 1100, 跟
//     中原夏商周平行, 但属独立古蜀文明, 1986 年出土青铜神树/面具
//     跟中原礼器风格差异巨大.
//   - 兵马俑 ≠ 真人: 陶俑皆为陶土烧制, 真人殉葬在秦献公(前 384-
//     前 362)已被正式废止, 兵马俑是陪葬品, 非活人.
//   - 端午 ≠ 屈原: 闻一多《端午考》考证 端午起源是吴越民族龙图腾
//     祭祀, 比屈原投江(前 278)早 200+ 年. 纪念屈原是后世的附会.
//   - 算盘 ≠ 中国发明: 罗马算盘 (calculi) 公元前 5 世纪已用, 波斯
//     也有沙盘算盘 (ghorefab). 中国算盘 (北宋《清明上河图》已有
//     描绘, 约 11-12 世纪) 是改良, 不是发明.
//   - 兵马俑朝向东方: 一号坑 6 千兵马面东, 学者解读为"面东而守",
//     对应六国故地 (函谷关以东). 也有解读为"面向帝都咸阳".
//   - 苏州园林 ≠ 皇家园林: 拙政园/留园/狮子林等皆为私家园林 (明清
//     士绅/商人所有), 区别于颐和园/承德避暑山庄这类皇家园林.
//   - 拉布拉多 ≠ 金毛: 拉布拉多毛色有黑/黄/巧克力三种, 金毛只有
//     金色系. 拉布拉多毛短直, 金毛毛长波浪. 都是寻回犬但起源不同.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const cardsPath = resolve(__dirname, "..", "data", "cards.json");

const mythFact = {
  "qingming": {
    myth: "清明节的前身是寒食节, 为纪念介子推而设.",
    fact: "寒食源于周代禁火旧俗, 唐代(开元 20 年, 732 年)才把 寒食/清明/上巳 合并为三节. \"清明扫墓\"普及要到宋元以后.",
  },
  "longjing-tea": {
    myth: "只要是龙井茶就是西湖龙井.",
    fact: "国家地理标志 (GB/T 8322) 把龙井茶划为西湖/钱塘/越州三大产区, \"西湖龙井\"仅指杭州西湖区 168 km² 范围内的茶. 外围产区只能叫\"龙井茶\", 不能冠\"西湖\".",
  },
  "forbidden-city": {
    myth: "故宫就是紫禁城, 现在还在被皇室居住.",
    fact: "紫禁城是明清两代皇家禁苑旧名, 1924 年 11 月 5 日溥仪被逐出宫. 次年 10 月 10 日 挂牌\"故宫博物院\", \"故宫\"成为博物馆名, 跟紫禁城是两段历史.",
  },
  "sanxingdui": {
    myth: "三星堆是夏商周的附属文化.",
    fact: "碳 14 测年三星堆文化约前 2800-前 1100 年, 跟中原夏商周平行, 但属独立古蜀文明. 1986 年出土的青铜神树/纵目面具/太阳轮形器, 跟中原礼器风格几乎无交集, 是失落的古蜀王国.",
  },
  "xian": {
    myth: "兵马俑是秦始皇用真人活埋陪葬.",
    fact: "兵马俑皆为陶土烧制的陪葬品, 真人殉葬在秦献公 (前 384-前 362) 就被正式废止. 一号坑约 6 千军俑面朝东方, 学者多解读为\"面东而守\" (对应六国故地).",
  },
  "dragon-boat": {
    myth: "端午节是纪念屈原的节日.",
    fact: "闻一多《端午考》(1947) 考证端午起源是吴越民族的龙图腾祭祀, 比屈原投江 (前 278 年) 早 200 多年. 纪念屈原是后世的附会, 南方部分地区至今仍以伍子胥/曹娥为端午主祭.",
  },
  "abacus": {
    myth: "算盘是中国发明的.",
    fact: "罗马算盘 (calculi) 公元前 5 世纪已有, 波斯也有沙盘算盘 (ghorefab). 中国算盘最早见于北宋《清明上河图》(12 世纪) 与《魁本对相四言杂字》, 是改良不是发明.",
  },
  "suzhou-gardens": {
    myth: "苏州园林是皇家园林.",
    fact: "拙政园/留园/狮子林/网师园等皆为明清士绅/商人所有, 属私家园林. 区别于颐和园/承德避暑山庄/圆明园这类皇家园林. 拙政园最初是御史王献臣辞官归田后所建, \"拙政\"取自潘岳《闲居赋》.",
  },
  "labrador-retriever": {
    myth: "拉布拉多就是金毛, 毛短的就是拉布拉多.",
    fact: "是两个品种. 拉布拉多毛短直, 毛色有黑/黄/巧克力三种; 金毛只有金色系, 毛长波浪. 起源也不同 — 拉布拉多来自加拿大纽芬兰 (19 世纪), 金毛来自英国苏格兰 (1860s).",
  },
  "qiantang-tide": {
    myth: "钱塘江大潮是月球引力造成的普通天文潮.",
    fact: "是天文潮 + 喇叭口地形共振的产物. 杭州湾外宽 100 公里, 到海宁缩到 3 公里, 潮水被挤压抬升, 最大潮差可达 9 米 (普通海岸 1-2 米). 每年农历八月十八最大, 跟月球近地点 + 太阳直线排列的\"朔望大潮\"叠合.",
  },
};

const cards = JSON.parse(readFileSync(cardsPath, "utf-8"));
let updated = 0;
for (const c of cards) {
  const pair = mythFact[c.slug];
  if (!pair) continue;
  if (c.myth || c.fact) {
    console.log(`SKIP ${c.slug} (already has myth/fact)`);
    continue;
  }
  c.myth = pair.myth;
  c.fact = pair.fact;
  updated++;
  console.log(`+ ${c.slug}: myth/fact added`);
}
writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + "\n", "utf-8");
console.log(`\nDone. ${updated} card(s) updated.`);
