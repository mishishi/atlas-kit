#!/usr/bin/env node
// scripts/handwrite-history-r36.mjs
//
// R36 后 mmx retry 多次仍 parse 失败的 5 张卡片 hardcoded history
// (silk / lantern-festival / gene-editing / lawyer / cancer)
// 跟 R22 handwrite-history.mjs 同一套逻辑。

import fs from "node:fs";
import path from "node:path";

const cardsPath = path.resolve("data/cards.json");
const cards = JSON.parse(fs.readFileSync(cardsPath, "utf8"));

const HISTORY = {
  "silk": [
    { year: "前 3000 年", title: "新石器时代养蚕", body: "中国钱山漾遗址出土的丝织物表明, 距今约 5000 年中国人已开始养蚕缫丝。" },
    { year: "前 2 世纪", title: "丝绸之路开通", body: "汉代张骞通西域后, 丝绸经河西走廊远销中亚与欧洲, 成为东西方贸易的核心商品。" },
    { year: "552", title: "蚕种传入欧洲", body: "拜占庭僧侣将蚕卵藏在手杖中偷运回君士坦丁堡, 欧洲才开始本土丝绸生产。" },
    { year: "1872 年", title: "近代丝绸工业化", body: "法国里昂、日本群马和中国长三角先后建立机械化缫丝厂, 传统丝绸业进入工业化时代。" },
    { year: "2009 年", title: "中国蚕丝织造技艺申遗", body: "中国传统蚕桑丝织技艺列入联合国教科文组织人类非物质文化遗产代表作名录。" },
  ],
  "lantern-festival": [
    { year: "前 180 年", title: "汉代正月十五祭祀", body: "汉文帝刘恒在正月十五夜平定诸吕之乱, 此后每年此夜与民同乐, 元宵节初见雏形。" },
    { year: "618 年", title: "唐代正式定名", body: "唐代佛教密宗以正月十五为佛祖神变之日, 燃灯表佛, 元宵张灯习俗由此兴盛。" },
    { year: "1072 年", title: "宋代金吾不禁", body: "北宋东京汴梁元宵节取消宵禁五天, 百姓彻夜观灯游赏, 灯火规模空前。" },
    { year: "1403 年", title: "明代百官赐假", body: "明永乐年间正月十一至二十日百官赐假, 元宵节成为一年中最长的官方节庆。" },
    { year: "2008 年", title: "入选国家非遗", body: "元宵节(元宵灯会)列入第二批国家级非物质文化遗产名录, 自贡灯会等地方灯彩享誉国际。" },
  ],
  "gene-editing": [
    { year: "1970 年代", title: "限制性内切酶发现", body: "H.O. Smith 等分离出 II 型限制酶, 提供切割 DNA 的分子工具, 奠定基因编辑基础。" },
    { year: "1996 年", title: "ZFN 锌指核酸酶", body: "锌指核酸酶技术首次实现定向基因敲除, 但设计复杂成本高。" },
    { year: "2012 年", title: "CRISPR-Cas9", body: "Doudna 与 Charpentier 发表 CRISPR-Cas9 简化基因编辑论文, 引发全球实验室跟进。" },
    { year: "2018 年", title: "贺建奎事件争议", body: "中国研究者宣布诞生世界首例基因编辑婴儿, 引发全球科学伦理与监管争议。" },
    { year: "2023 年", title: "CRISPR 疗法获批", body: "Casgevy 成为全球首个获批上市的 CRISPR 基因编辑疗法, 用于治疗镰状细胞病和 β-地中海贫血。" },
  ],
  "lawyer": [
    { year: "前 5 世纪", title: "古希腊演说家", body: "雅典演说家如 Lysias 已为他人代写诉状与法庭辩护, 雏形律师职业出现。" },
    { year: "1215 年", title: "英国大宪章奠基", body: "英国《大宪章》确立正当程序原则, 推动职业辩护人阶层的形成。" },
    { year: "1872 年", title: "中国近代律师", body: "清政府《诉讼律草案》引入律师制度, 上海出现首批执业律师。" },
    { year: "1956 年", title: "中国律师协会成立", body: "中华全国律师协会在北京成立, 律师职业在中国正式确立。" },
    { year: "1996 年", title: "中国律师法颁布", body: "《中华人民共和国律师法》通过, 律师执业资格、权利义务与责任首次以法律形式明确。" },
  ],
  "cancer": [
    { year: "前 1600 年", title: "古埃及最早记载", body: "埃德温·史密斯纸草文记载了乳房肿块的病例描述, 是已知最早对癌症的文字记录。" },
    { year: "1761 年", title: "现代病理学奠基", body: "Giovanni Morgagni 通过尸体解剖建立了器官病变与疾病的系统对应, 癌症研究进入科学时代。" },
    { year: "1911 年", title: "病毒致癌发现", body: "Peyton Rous 发现鸡肉瘤病毒, 证明癌症可由病毒引起, 开启肿瘤病毒学。" },
    { year: "1971 年", title: "美国国家癌症法案", body: "尼克松签署《国家癌症法案》, 启动「抗癌战争」并大幅增加联邦研究经费。" },
    { year: "2020 年代", title: "免疫治疗突破", body: "PD-1/PD-L1 抑制剂、CAR-T 细胞疗法等免疫治疗在多种癌症中显示长期生存获益, 改写治疗范式。" },
  ],
};

let added = 0;
for (const c of cards) {
  if (HISTORY[c.slug] && (!c.history || c.history.length === 0)) {
    c.history = HISTORY[c.slug];
    added++;
  }
}

if (added > 0) {
  fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + "\n", "utf8");
  console.log(`Added hand-written history for ${added} cards:`);
  for (const s of Object.keys(HISTORY)) {
    const c = cards.find((x) => x.slug === s);
    if (c.history.length > 0) console.log(`  + ${s} (${c.history.length} nodes)`);
  }
} else {
  console.log("Nothing to add (all cards already have history).");
}