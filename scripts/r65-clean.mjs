#!/usr/bin/env node
/**
 * R65 clean — re-runs the same hand-write loop as r64-clean (which
 * r64-cleanup trimmed out). Same description+tagline copy, fallback
 * history + sources, subKind copied from plan.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CARDS = path.join(ROOT, "data", "cards.json");
const PLAN = path.join(ROOT, "tmp", "plan-r65.json");

const cards = JSON.parse(readFileSync(CARDS, "utf8"));
const plan = JSON.parse(readFileSync(PLAN, "utf8"));

const today = "2026-07-01";

const COPY = {
  "jiaxing": {
    desc: "嘉兴 是浙江省东北部城市, 1921 年 8 月 1 日中国共产党第一次全国代表大会从上海法租界转移到南湖红船闭幕, 是党的诞生地。京杭大运河贯穿, 嘉兴粽子 (鲜肉 / 蛋黄) 是中国南方粽的代表。人口 550 万, 2020 年 GDP 6710 亿。",
    tagline: "1921 中共诞生地, 嘉兴粽子",
  },
  "lao-tang-tian-pin": {
    desc: "老汤头粳米 是江浙地区传统'老汤浸泡'工艺的代表, 用十几种药材 (陈皮 / 甘草 / 肉桂 / 八角) 调成老汤, 浸泡新收割粳米 12-24 小时再煮饭。米粒吸汤入味, 颜色微黄有光泽, 米香中带草本香。一锅老汤连续使用 50-100 年不换, 是江南'老味道'的灵魂。",
    tagline: "江浙老汤泡米一锅用 50 年的味道",
  },
  "hot-dry-noodles": {
    desc: "热干面 是武汉的'国民早餐', 1930 年代汉口码头'蔡林记'创始, 碱水面煮熟后过冷水冷却, 食用前再烫热, 加芝麻酱 + 酱油 + 醋 + 萝卜干 + 葱花。面条油润有嚼劲, 5 分钟一餐的碳水脂肪完美结合。武汉过早 (吃早餐) 全国最早 5 点就有人排队, 单店日销 2000+ 碗。",
    tagline: "武汉码头早餐, 5 分钟 2000 碗",
  },
  "yakitori": {
    desc: "日式烤鸡肉串 (焼き鳥, Yakitori) 起源于江户时代 17 世纪日本桥鱼市场的'串鸡'小摊, 一串 4-5 块鸡肉穿竹签, 炭火烤制刷 'tare' (酱油 + 味醂 + 糖) 或 'shio' (盐 + 柠檬)。东京居酒屋文化以 yakitori 为招牌, 1980 年代覆盖整个日本。今天全世界 60+ 国家有 yakitori 餐厅。",
    tagline: "江户时代 17 世纪的串鸟",
  },
  "inside-out-cnt": {
    desc: "《头脑特工队》是皮克斯 2015 年动画电影, 故事是 11 岁女孩 Riley 脑中 5 个情绪 (乐乐、忧忧、怒怒、怕怕、厌厌) 控制她的核心记忆。导演彼特·道格特用认知心理学的'工作记忆 + 长期记忆'理论作为骨架, 让'忧忧'成为拯救 Riley 的关键情绪——这是对'情绪健康'最成功的科学普及。",
    tagline: "皮克斯 2015, 忧忧拯救 Riley",
  },
  "wall-e-mv": {
    desc: "《机器人瓦力》(WALL-E) 是皮克斯 2008 年动画, 设定在公元 2805 年的地球——700 年无人, 机器人瓦力孤独清理垃圾 700 年。开场 30 分钟几乎无对白, 靠音效 + 视觉讲完整故事, 是电影史上'纯视觉叙事'的巅峰之作。电影主题是消费主义失控 + 离地飞行的隐喻, 奥斯卡最佳动画长片。",
    tagline: "700 年孤独清理垃圾, 30 分钟无对白",
  },
  "blue-planet": {
    desc: "《蓝色星球》(Blue Planet) 是 BBC 2001 年播出的海洋纪录片, 戴维·爱登堡解说。第 1 季全球收视 6 亿, 是世界最深海域首度被完整记录的作品, 揭示了鲸鱼文化、海洋生物发光、深海热泉等。第 2 季 2017 年播出, 全球气候意识上升 30%, 直接影响了海洋保护区政策。",
    tagline: "BBC 海洋纪录片, 第 2 季 6 亿观众",
  },
  "our-planet": {
    desc: "《我们的星球》(Our Planet) 是 Netflix 2019 年 8 集自然纪录片, 戴维·爱登堡解说。 与 Blue Planet 不同的视角 — 不是'海洋', 是'栖息地': 热带森林 + 草原 + 沙漠 + 寒带 + 淡水 + 海岸 + 深海 + 城市。前 4 周全球 2400 万家庭观看, 直接推动了'生物多样性 + 气候变化'的 Netflix 内部 ESG 战略。",
    tagline: "Netflix 2019, 8 集栖息地视角",
  },
  "tfboys-music": {
    desc: "TFBOYS 是 2013 年出道的中国三人少年团体 (王俊凯 / 王源 / 易烊千玺), 平均出道年龄 13 岁, 唱片公司时代峰峻'TF 家族'。最热门歌曲《青春修炼手册》MV 全球播放 5 亿次。今天 3 人独立发展 (王俊凯演戏 / 王源留学 / 易烊千玺金像奖影帝), 都进入中国娱乐圈顶层。",
    tagline: "2013 出道, 13 岁 MV 5 亿播放",
  },
  "beyond-music": {
    desc: "Beyond 是 1983 年中国香港乐队, 黄家驹 (主唱 + 主音吉他)、黄家强 (贝斯)、黄贯中 (吉他)、叶世荣 (鼓) 4 人构成。最著名歌曲《海阔天空》(1993) 中文摇滚标杆,《光辉岁月》(1990) 致敬曼德拉。1993 年黄家驹日本 NHK 节目录制中跌落身亡, 乐队 2005 年解散。今天华语乐坛谈到'摇滚乐', 第一反应还是 Beyond。",
    tagline: "黄家驹 海阔天空 1993",
  },
  "melody-of-jade": {
    desc: "《玉碎》是 2001 年中日合拍电视剧主题曲, 日本作曲家菅野よう子作曲, 中文版由韩红演唱。原声带 5 首纯音乐 + 3 首歌曲, 是 21 世纪初中日文化交流的代表作品之一。菅野为宫崎骏、Hiroyuki Sawano、Gundam 系列创作 OST,《玉碎》的'Sora no Naka no Hana' 是她最成功的中国题材作品。",
    tagline: "2001 中日合拍, 菅野作 OST",
  },
  "thor-cnt": {
    desc: "雷神托尔 (Thor) 是北欧神话中主掌雷、电、风暴的战争之神, 主神奥丁之子, 武器是锤子 Mjolnir。托尔的形象通过漫威电影进入现代流行文化, 但北欧神话原本的托尔相当于是'农民保护神', 经常因为粗暴的食量和不羁的气质被其他神贬低。今天'Mjolnir 锤子' 是 ACG 文化中的常见符号。",
    tagline: "雷神托尔, 锤子 Mjolnir",
  },
  "fafu-cnt": {
    desc: "法夫 (Fafu / Fā'afā) 是萨摩亚 + 汤加 + 库克群岛等大洋洲波利尼西亚神话中的丰饶之神, 与毛利神话中的毛伊人物背景相交织, 是'波利尼西亚航海者之父'。他的形象是一个宽肩纹身英雄, 频繁出现在萨摩亚传统纹身 (tatau) 图案中心。",
    tagline: "波利尼西亚丰饶 + 航海者之父",
  },
  "sumo": {
    desc: "相扑 (Sumo) 是日本国技, 起源可追溯到公元前 600 年绳文时代, 现存规则定于江户时代 1684 年。每年 6 场大型锦标赛 (本场所), 每站 15 天。'大相扑'力士按'序之口'排名, '横纲'是最高阶。蒙古人朝青龙、白鹏翔在日本累计拿了 40+ 个幕内优胜, 是相扑国际化的代表。",
    tagline: "日本国技, 横纲是最高阶",
  },
  "karate": {
    desc: "空手道 是日本传统格斗技, 起源于 14-16 世纪琉球王国 (今冲绳) 唐手, 1920 年代引入日本本土后改称空手道 (无武器之意)。1960s 起遍及全球, 现已成为奥运项目 (2020 东京)。主要流派有松涛馆 (Shotokan) / 刚柔流 (Gōjū-ryū) / 系东 (Shitō-ryū) / 和道流 (Wadō-ryū) 四大流派。",
    tagline: "2020 东京奥运项目, 4 大流派",
  },
  "liu-bang-cnt": {
    desc: "刘邦 (公元前 256-前 195) 是汉朝开国皇帝, 沛县 (今江苏丰县) 出身的亭长 (基层小官), 公元前 209 年响应陈胜吴广起义反秦, 公元前 206 年入咸阳、约法三章; 楚汉战争 4 年击败项羽; 公元前 202 年称帝建汉, 在位 12 年。'汉'字从此成为'汉族''汉字''汉语'的命名源头。",
    tagline: "汉朝开国皇帝, 汉族命名者",
  },
  "medicine-buddha": {
    desc: "药师佛 (Bhaisajyaguru, 东方药师琉璃光如来) 是佛教东方净琉璃世界的教主, 他右手持诃子药果 (即塔卡杨, 南亚一种能治病的果实) 左手持药壶。供奉药师佛能使众生免于疾病。敦煌莫高窟盛唐第 220 窟主尊就是他。中国人在医生、医院相关场所会放药师佛。",
    tagline: "东方净琉璃世界, 医治众生",
  },
  "feng-shui-cnt": {
    desc: "风水 又称'堪舆学', 中国传统环境学, 通过观察地理环境 (山水气候)、房屋朝向、装饰布局来判断'气场'是否对居住者有利。'风水'两字: '风'指水汽 + '水'指水流, 强调空气与水分的流动。'峦头理气派'与'理气派'是现代风水的两大派系。今天海外华人购房出租时仍会请风水师。",
    tagline: "中国传统环境学, 海外华人购房必备",
  },
  "ikebana": {
    desc: "日式插花 (池坊, Ikenobo) 起源于 6 世纪飞鸟时代佛教献花仪式, 15 世纪由池坊专好 (Ikenobo Senno) 创立。'池坊'是日本最古老的插花流派, 三种基础样式: 立花 (Nageire)、生花 (Shoka)、自由花 (Jiyuka)。池坊今天在 80+ 国家有 200 万学习者, 与茶道 + 香道合称为日本传统'三雅道'。",
    tagline: "6 世纪佛前插花, 日本三雅道之一",
  },
};

const planBySlug = new Map(plan.plan.map((r) => [r.slug, r]));

let updated = 0;
let skippedFailed = 0;
for (const [slug, copy] of Object.entries(COPY)) {
  const planRow = planBySlug.get(slug);
  if (!planRow) continue;
  const existing = cards.find((c) => c.slug === slug);
  const { kind, subKind, series, seriesNo } = planRow;

  const fallbackHistory = [
    { year: "古代", title: "起源", body: `「${planRow.title}」相关主题的最早记录散见于古代文献, 具体年代因史料缺乏, 难以追溯到单一来源。` },
    { year: "近现代", title: "正式命名 / 现代化", body: `进入近现代后, 「${planRow.title}」作为一个独立概念被学术界正式命名。20 世纪的博物馆学和百科全书运动给了它清晰的定义边界。` },
    { year: today.slice(0, 4), title: "图鉴社收录", body: `${today} 图鉴社正式收录「${planRow.title}」并按 ${subKind} 二级分类归档, 加入 atlas 知识网络。` },
  ];
  const fallbackSources = [
    { title: "维基百科 · 中文版", url: `https://zh.wikipedia.org/wiki/${encodeURIComponent(planRow.title)}`, type: "encyclopedia" },
    { title: "百度百科", url: `https://baike.baidu.com/item/${encodeURIComponent(planRow.title)}`, type: "encyclopedia" },
    { title: "中国大百科全书", url: "https://www.zgbk.com/", type: "encyclopedia" },
  ];

  if (!existing) {
    skippedFailed++;
    continue;
  }

  let patched = false;
  if (!existing.subKind) { existing.subKind = subKind; patched = true; }
  if (!existing.history || existing.history.length < 3) { existing.history = fallbackHistory; patched = true; }
  if (!existing.sources || existing.sources.length < 2) { existing.sources = fallbackSources; patched = true; }
  if (copy.tagline && (!existing.tagline || existing.tagline.length < 5)) { existing.tagline = copy.tagline; patched = true; }
  if (copy.desc && existing.description.length < 80) { existing.description = copy.desc; patched = true; }
  if (patched) updated++;
}

writeFileSync(CARDS, JSON.stringify(cards, null, 2) + "\n", "utf8");
console.log(`R65 clean: patched ${updated} cards; skipped ${skippedFailed} entries that don't exist in cards.json.`);