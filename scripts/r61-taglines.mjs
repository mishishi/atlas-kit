#!/usr/bin/env node
/**
 * V-fix: handwrite R61 tagline for the 30 R61 cards.
 * Previous r61-clean.mjs left 30 template taglines ("Atlas 收录在「X」分类下")
 * — replace with hand-written (Chinese, ~10-25 chars, the punchy editorial line).
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CARDS = path.join(ROOT, "data", "cards.json");

const TAGLINES = {
  "re-zero": "死亡是另一种开始",
  "sword-art-online": "锁死的虚拟, 真实的死亡",
  "overlord": "最强公会, 整建制降临异世界",
  "charlottes-web": "一只蜘蛛, 三条救命词",
  "the-little-prince": "重要的东西, 用眼睛看不见",
  "cihai": "中国人手一册的案头必备",
  "china-encyclopedia": "国家知识工程的代表",
  "singles-day": "把玩笑节做成全球最大的购物狂欢",
  "valentines-day-cnt": "2 月 14 日被中国年轻人改写的剧本",
  "christmas-cnt": "不再纪念降生, 仍在交换礼物",
  "lion-king": "哈姆雷特披上非洲草原的鬃毛",
  "princess-mononoke": "宫崎骏最不留情面的一部",
  "a-bite-of-china": "让一口铁锅脱销的纪录片",
  "planet-earth": "BBC 给地球写了一封情书",
  "once-upon-a-time-in-china-ost": "江湖热血与黄霑一笔词",
  "spirited-away-ost": "久石让与宫崎骏的第七次合体",
  "bubble-tea": "木薯粉圆在红茶里扎根的全球生意",
  "matcha-latte-cnt": "星巴克让'末茶'离开茶道",
  "egg-tart": "从里斯本到中环的六层酥",
  "mille-crepe": "二十张薄饼, 一刀横断层",
  "sun-wukong": "中国最受欢迎的反叛者",
  "lin-daiyu": "满腹诗才还不够, 她死在精神世界",
  "zhang-heng-sci": "东汉张衡发明了世界上第一台地震仪",
  "guo-shoujing": "比公历精确 300 年的元代历法",
  "yan-zhenqing": "天下第二行书, 满纸悲愤",
  "mi-fu": "嗜书画到癫狂, 自号米癫",
  "ra": "每天跨越天空, 夜夜与蛇搏斗",
  "anubis": "胡狼头神, 在天平上称量心脏",
  "coming-of-age-ceremony": "冠礼笄礼, 三千年成人礼的当代复兴",
  "chinese-wedding": "周制汉婚的六礼四仪",
};

const cards = JSON.parse(readFileSync(CARDS, "utf8"));
let fixed = 0;
for (const c of cards) {
  if (TAGLINES[c.slug]) {
    c.tagline = TAGLINES[c.slug];
    fixed++;
  }
}
writeFileSync(CARDS, JSON.stringify(cards, null, 2) + "\n", "utf8");
console.log(`Handwrote taglines for ${fixed} R61 cards.`);