#!/usr/bin/env node
// Hand-write history + sources for the 9 R59 mmx-stubborn cards.
// These were cards where draft-history / draft-sources returned
// unparseable JSON or too few nodes after 3 retries.
//
// Scope:
//   HISTORY (7): code-geass, x-japan, qianlong, zeus, apollo,
//                papercut, art-of-war
//   SOURCES (2): voyager, zu-hongchen
//
// zu-hongchen: 我没法验证这个人物的真实性 (1985 生,北大历史系,
// 似乎是现代历史学者, 但我不认识)。handwritten history 来自
// mmx 之前的 draft, 留作原样, 不在这次 hand-fix 范围。
// Sources for zu-hongchen skipped — 无可靠 source, 等用户验证
// 人物后再补。

import fs from "node:fs";
import path from "node:path";

const cardsPath = path.resolve("data/cards.json");
const cards = JSON.parse(fs.readFileSync(cardsPath, "utf8"));

const HISTORY = {
  "code-geass": [
    { year: "2006 年 10 月", title: "首播", body: "《Code Geass 反叛的鲁路修》于日本 TBS 系列电视台开播, 由日升动画与 Code Geass 制作委员会制作, 谷口悟朗监督, 总共两季 50 集。" },
    { year: "2007 年", title: "R2 播出", body: "续篇《R2》于 2008 年 4 月至 9 月播出, 引入「超合众国」与「黑色骑士团」政治格局, 鲁路修身份反转成为剧情核心。" },
    { year: "2008 年", title: "剧场版上映", body: "总集篇与全新剧场版《Code Geass: Lelouch of the Resurrection》前传陆续推出, 角色人气持续推升周边产业。" },
    { year: "2017-2019 年", title: "续作企划", body: "日升宣布启动多部续作企划, 《夺回的 Zed》《亡国的阿基德》OVA 系列陆续推出, 扩展世界观至 2020 年代。" },
    { year: "2019 年", title: "新剧场版", body: "《Code Geass: Lelouch of the Resurrection》剧场版上映, 时隔十年延续鲁路修的故事, 全球票房表现亮眼。" },
  ],
  "x-japan": [
    { year: "1982 年", title: "X 乐队成立", body: "YOSHIKI 与 Toshi 在日本千叶县馆山市组建 X (后改名 X Japan), 早期成员包括 hide、PATA、TAIJI, 视觉系摇滚风格确立。" },
    { year: "1989 年", title: "首张专辑《Vanishing Vision》", body: "乐队签约 Extasy Records, 推出首张同名专辑, 单曲《Kurenai》登上 Oricon 独立榜冠军, 奠定视觉系摇滚标杆。" },
    { year: "1991 年", title: "主流出道《Blue Blood》", body: "乐队转投主流厂牌 Sony, 推出《Blue Blood》专辑, 单曲《Endless Rain》成为视觉系经典, 1992 年登上武道馆。" },
    { year: "1997 年", title: "hide 逝世", body: "吉他手 hide 于 5 月 2 日意外离世, 震动日本乐坛; 乐队于 1997 年发行《The Last Live ~ 最后之夜》, 同年宣布解散。" },
    { year: "2007 年", title: "重组复出", body: "乐队 2007 年宣布重组, 在东京巨蛋连开三场, 2010 年起全球巡演, 2017 年入驻摇滚名人堂, 2018 年纪录片《We Are X》获国际奖项。" },
  ],
  "qianlong": [
    { year: "1711 年", title: "出生于雍亲王府", body: "爱新觉罗·弘历 (乾隆帝) 出生于北京雍亲王府 (今雍和宫), 父亲雍正帝当时为雍亲王, 自幼聪慧, 受康熙帝喜爱。" },
    { year: "1735 年", title: "即位改元", body: "雍正十三年八月雍正帝驾崩, 弘历即位, 翌年改元乾隆, 时年 25 岁, 成为中国历史上实际执掌皇权最久的皇帝 (60 年)。" },
    { year: "1740 年代", title: "平定准噶尔", body: "乾隆帝承父祖基业, 先后平定准噶尔、回部, 完成西北边疆统一, 奠定现代中国版图基础, 同时编纂《四库全书》。" },
    { year: "1790 年", title: "十全武功", body: "乾隆帝晚年自称「十全老人」, 自诩两平准噶尔、一定回部、两服廓尔喀等「十全武功」, 实际耗损国库, 白莲教起义为衰世开端。" },
    { year: "1796 年", title: "禅位嘉庆", body: "乾隆六十年 (嘉庆元年) 正月, 85 岁乾隆帝正式禅位太子颙琰, 自称「太上皇」, 但仍训政至嘉庆四年 (1799 年) 驾崩, 享年 89 岁。" },
  ],
  "zeus": [
    { year: "前 8 世纪", title: "《神谱》确立地位", body: "希腊诗人赫西俄德《神谱》系统化整理希腊神话, 确立宙斯推翻父神克洛诺斯、与兄弟波塞冬、哈迪斯三分天下的宇宙秩序。" },
    { year: "前 5 世纪", title: "奥林匹亚神庙", body: "古希腊人在伯罗奔尼撒半岛奥林匹亚建宙斯神庙 (Temple of Zeus), 内有菲狄亚斯雕刻的宙斯坐像, 被列入古代世界七大奇迹之一。" },
    { year: "前 4 世纪", title: "罗马传入", body: "罗马征服希腊后, 宙斯与朱庇特 (Jupiter) 融合, 罗马万神殿中将宙斯的主要属性 (雷电、权威、天空) 归于朱庇特。" },
    { year: "公元 5 世纪", title: "基督教化", body: "罗马帝国基督教化后, 宙斯崇拜逐渐衰落, 奥林匹亚神庙于公元 426 年被狄奥多西二世下令关闭, 古代多神教时代终结。" },
    { year: "现代", title: "文化影响延续", body: "宙斯作为西方文化最具影响力的神祇之一, 在文学、艺术、影视中持续被重新诠释, 漫威电影宇宙的雷神索尔原型即源自宙斯之子形象。" },
  ],
  "apollo": [
    { year: "前 8 世纪", title: "《伊利亚特》确立", body: "荷马史诗《伊利亚特》系统化阿波罗形象: 光明之神、音乐之神、预言之神, 同时也是弓箭之神与瘟疫之神, 形象复杂多面。" },
    { year: "前 6 世纪", title: "德尔斐神谕所", body: "希腊人在德尔斐 (Delphi) 建立阿波罗神谕所 (Oracle of Delphi), 由女祭司皮提亚传达神谕, 影响希腊城邦决策数百年, 地位堪比政治中心。" },
    { year: "前 5 世纪", title: "雅典神庙", body: "雅典卫城建阿波罗神庙 (Temple of Apollo Patroos), 希腊化时期阿波罗崇拜与太阳神赫利俄斯逐渐融合, 罗马时期等同于太阳神。" },
    { year: "公元 5 世纪", title: "基督教化", body: "罗马帝国基督教化后, 阿波罗崇拜逐渐被圣徒崇拜取代, 神庙被改建或废弃, 但希腊罗马艺术中的阿波罗形象成为文艺复兴灵感的源泉。" },
    { year: "现代", title: "NASA 阿波罗计划", body: "1960 年代美国 NASA 阿波罗载人登月计划以阿波罗命名, 1969 年阿波罗 11 号首次载人登月, 「阿波罗」成为人类探索精神的文化符号。" },
  ],
  "papercut": [
    { year: "汉代", title: "纸与剪纸雏形", body: "东汉蔡伦改进造纸术后, 纸张普及为民间工艺材料, 1957 年新疆吐鲁番出土的北朝对马团花剪纸证明 5-6 世纪剪纸已具成熟形式。" },
    { year: "唐代", title: "宫廷与民间并盛", body: "唐代剪纸用于装饰、招魂、祭祀, 杜甫诗「暖汤濯我足, 剪纸招吾魂」记载民间招魂习俗; 宫廷则用于春日赐幡胜。" },
    { year: "宋代", title: "剪纸艺术化", body: "宋代剪纸开始艺术化、专业化, 出现专门剪纸艺人, 题材扩展至花鸟、人物、戏曲故事, 河北蔚县剪纸雏形出现。" },
    { year: "明清", title: "南北流派形成", body: "明清时期剪纸分南北两派: 北方粗犷豪放 (陕北、河北), 南方细腻秀丽 (扬州、佛山), 各地形成不同地域风格与节庆习俗。" },
    { year: "2009 年", title: "入选人类非遗", body: "2009 年中国剪纸入选《人类非物质文化遗产代表作名录》, 蔚县、阜阳、丰县、潮阳、佛山、扬州、安塞、陇东等多地剪纸列入国家级非遗。" },
  ],
  "art-of-war": [
    { year: "前 5 世纪", title: "孙武著书", body: "春秋末期齐国人孙武 (约前 545-约前 470 年) 应吴王阖闾之邀献《孙子兵法》十三篇, 经伍子胥举荐, 训练吴国宫女, 著成此书。" },
    { year: "前 484 年", title: "吴国称霸", body: "孙武辅佐吴王阖闾伐楚, 柏举之战 (前 506 年) 以 3 万破楚 20 万, 攻入郢都; 之后孙武事迹散见史书, 后世称「兵圣」。" },
    { year: "前 3 世纪", title: "《银雀山汉墓》出土", body: "1972 年山东临沂银雀山汉墓出土竹简《孙子兵法》与失传千年的《孙膑兵法》, 证实孙武、孙膑分别为两人, 孙武为原作者。" },
    { year: "唐代", title: "传入日本", body: "唐代《孙子兵法》随遣唐使传入日本, 平安时代日本军学引用甚多, 之后历代军事家如德川家康奉为圭臬, 衍生出「风林火山」旗号。" },
    { year: "现代", title: "全球军事与商业经典", body: "20 世纪以来《孙子兵法》译本超过 30 种语言, 西点军校、海湾战争美军将领、20 世纪 80 年代日本企业家均引为经典, 「不战而屈人之兵」为现代战略思想基础。" },
  ],
};

const SOURCES = {
  "voyager": [
    { title: "NASA Voyager 官方任务页", url: "https://voyager.jpl.nasa.gov/", type: "official" },
    { title: "维基百科: 旅行者 1 号 / 2 号", url: "https://zh.wikipedia.org/wiki/%E6%97%85%E8%A1%8C%E8%80%85%E5%8F%B7", type: "encyclopedia" },
    { title: "卡尔·萨根《暗淡蓝点》", url: "https://zh.wikipedia.org/wiki/%E6%9A%97%E6%B7%A1%E8%93%9D%E7%82%B9", type: "book" },
    { title: "NASA 星际探测器专题", url: "https://science.nasa.gov/mission/voyager/", type: "official" },
  ],
  // zu-hongchen: skip — 人物真实性未核实, 无可靠 source。
};

let historyAdded = 0, sourcesAdded = 0, skipped = 0;
for (const c of cards) {
  if (HISTORY[c.slug] && (!c.history || !c.history.length)) {
    c.history = HISTORY[c.slug];
    historyAdded++;
    console.log(`history: ${c.slug} (${c.history.length} nodes)`);
  }
  if (SOURCES[c.slug] && (!c.sources || !c.sources.length)) {
    c.sources = SOURCES[c.slug];
    sourcesAdded++;
    console.log(`sources: ${c.slug} (${c.sources.length} sources)`);
  }
  if (c.slug === "zu-hongchen" && (!c.sources || !c.sources.length)) {
    skipped++;
    console.log(`SKIP sources: zu-hongchen — 人物真实性待核实`);
  }
}

fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + "\n", "utf8");
console.log(`\nDone. history_added=${historyAdded} sources_added=${sourcesAdded} skipped=${skipped}.`);
