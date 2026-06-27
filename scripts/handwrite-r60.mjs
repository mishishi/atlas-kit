#!/usr/bin/env node
// Hand-write history for the 2 R60 mmx-stubborn cards.
import fs from "node:fs";
import path from "node:path";
const cardsPath = path.resolve("data/cards.json");
const cards = JSON.parse(fs.readFileSync(cardsPath, "utf8"));
const HISTORY = {
  "china": [
    { year: "前 2070 年", title: "夏朝建立", body: "据传世史书, 禹之子启建立夏朝, 标志中国从原始部落联盟进入王朝时代, 河南二里头遗址被部分学者认为是夏代都城。" },
    { year: "前 221 年", title: "秦统一六国", body: "秦始皇嬴政于前 221 年灭齐, 完成春秋战国 500 余年分裂, 建立中国第一个中央集权的多民族国家, 书同文、车同轨、行郡县。" },
    { year: "公元 755-763 年", title: "安史之乱", body: "唐玄宗天宝年间节度使安禄山、史思明先后叛乱, 唐朝由盛转衰, 北方人口大量南迁, 经济文化重心开始南移。" },
    { year: "1840 年", title: "鸦片战争", body: "1840 年英国发动鸦片战争, 清政府战败签订《南京条约》, 中国进入百年屈辱近代史, 随后洋务运动、戊戌变法、辛亥革命接连而起。" },
    { year: "1949 年", title: "中华人民共和国成立", body: "1949 年 10 月 1 日毛泽东在北京天安门城楼宣告中华人民共和国成立, 中国大陆进入社会主义建设时期, 1978 年改革开放开启经济起飞。" },
  ],
  "rocket": [
    { year: "13 世纪", title: "中国火药火箭", body: "中国宋朝发明火药后, 13 世纪已使用火药箭 (即原始火箭) 用于军事, 后经丝绸之路传入阿拉伯世界与欧洲, 成为现代火箭技术起源之一。" },
    { year: "1926 年", title: "戈达德首飞液体火箭", body: "美国物理学家罗伯特·戈达德于 1926 年 3 月 16 日在马萨诸塞州发射了世界第一枚液体燃料火箭, 飞行 2.5 秒, 高度 12.5 米, 现代航天时代开启。" },
    { year: "1957 年", title: "苏联 Sputnik 1", body: "1957 年 10 月 4 日苏联用 R-7 火箭将人类首颗人造卫星 Sputnik 1 送入轨道, 开启太空竞赛, 火箭技术从军事走向民用航天。" },
    { year: "1969 年", title: "阿波罗 11 号登月", body: "1969 年 7 月 16 日美国土星五号火箭将阿波罗 11 号送入月球轨道, 阿姆斯特朗成为首个登月的人类, 大推力运载火箭技术达到顶峰。" },
    { year: "2020 年代", title: "可重复使用火箭", body: "SpaceX 猎鹰 9 号、星际飞船等可重复使用火箭降低发射成本 10 倍以上, 中国长征八号甲、朱雀三号等亦跟进研发, 商业航天时代开启。" },
  ],
};
let added = 0;
for (const c of cards) {
  if (HISTORY[c.slug] && (!c.history || !c.history.length)) {
    c.history = HISTORY[c.slug];
    added++;
    console.log(`history: ${c.slug} (${c.history.length} nodes)`);
  }
}
fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + "\n", "utf8");
console.log(`Done. added=${added}.`);
