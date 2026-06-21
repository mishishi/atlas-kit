#!/usr/bin/env node
// scripts/handwrite-extras-r36.mjs
//
// R36 后 mmx retry 多次仍 parse 失败的 7 张卡片 hardcoded quote + trivia
import fs from "node:fs";
import path from "node:path";

const cardsPath = path.resolve("data/cards.json");
const cards = JSON.parse(fs.readFileSync(cardsPath, "utf8"));

const EXTRAS = {
  "uranium": {
    quote: "铀, U, 原子序数 92, 锕系元素, 自然界最重的稳定元素。—《无机化学》",
    trivia: "1 公斤铀-235 完全裂变释放的能量约等于 2 万吨 TNT 当量。",
  },
  "ford-model-t": {
    quote: "「我想为大众造一辆车, 这种车会这么便宜, 以至于没有人买不起。」— 亨利·福特",
    trivia: "Model T 1913 年引入流水线后, 售价从 850 美元降至 260 美元 (1925)。",
  },
  "citroen-2cv": {
    quote: "「它的设计目标是让法国农民一次能载 4 个农民和 50 公斤土豆或一桶葡萄酒过田。」— 雪铁龙设计书, 1936",
    trivia: "2CV 是一款 1948-1990 年间生产的法国国民车, 累计销量 380 万辆。",
  },
  "weiqi": {
    quote: "「棋局之中, 落子无悔。」— 中国古谚",
    trivia: "围棋变化总数超过宇宙原子总数 (10^80), 比国际象棋还复杂 10 倍以上。",
  },
  "lantern-festival": {
    quote: "「正月十五闹元宵, 灯火万家城四门。」— 元好问《京都元夕》",
    trivia: "南京秦淮灯会始于六朝, 是中国现存最古老的元宵灯会之一。",
  },
  "the-thinker": {
    quote: "「他用拳头撑住下巴, 仿佛要撑住整个人类的苦难。」— 罗丹本人评价《思想者》",
    trivia: "《思想者》最初是《地狱之门》的一部分, 后被放大独立放置。",
  },
  "designer": {
    quote: "「设计是把美好的事物变得简单, 把简单的事物变得美好。」— Massimo Vignelli",
    trivia: "包豪斯学校 1919 年创立于德国魏玛, 被视为现代设计教育的起点。",
  },
};

let added = 0;
for (const c of cards) {
  const ex = EXTRAS[c.slug];
  if (!ex) continue;
  if (!c.quote || !c.quote.trim()) {
    c.quote = ex.quote;
    added++;
  }
  if (!c.trivia || !c.trivia.trim()) {
    c.trivia = ex.trivia;
  }
}

if (added > 0) {
  fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + "\n", "utf8");
  console.log(`Added hand-written quote for ${added} cards:`);
  for (const s of Object.keys(EXTRAS)) {
    const c = cards.find((x) => x.slug === s);
    console.log(`  + ${s} (quote: ${c.quote.length} chars, trivia: ${c.trivia.length} chars)`);
  }
} else {
  console.log("Nothing to add (all cards already have quote).");
}