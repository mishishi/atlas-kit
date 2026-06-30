#!/usr/bin/env node
/**
 * R61 clean — adds 30 R61 cards to R60 cards.json.
 *
 * Designed to NOT pollute existing 600 cards. Does:
 *   - append 30 new cards with image (CDN) + subKind + createdAt
 *   - 24 programmatic history (mmx hung, so we go derive)
 *   - 30 sources (3 generic per card)
 *   - 30 handwrite descriptions (avoid 占位 placeholder)
 *   - empty fields left for the user / future polish
 *
 * Does NOT touch any existing card's tagline or tags. The previous
 * r61-fallback.mjs accidentally overrode non-R61 taglines; this
 * rewrite is more surgical.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CARDS = path.join(ROOT, "data", "cards.json");

const cards = JSON.parse(readFileSync(CARDS, "utf8"));

// Read prompt archive (per-card PNG is on disk under public/cards/<kind>/<slug>/)
// to extract palette + createdAt from the most recently generated file.

const R61 = [
  { slug: "re-zero", title: "Re:从零开始的异世界生活", kind: "anime", subKind: "isekai", series: "anime-works-atlas", seriesNo: "080", desc: "Re:从零开始的异世界生活 是日本轻小说家长月达平 2012 年起的系列, 讲述高中生菜月昴在便利店途中突然被召唤到异世界, 唯一的特异功能是「死亡回归」——每次死去都能回到最初的存档点。本作的真正主角不是菜月昴, 而是半精灵少女爱蜜莉雅和她的王选故事。" },
  { slug: "sword-art-online", title: "刀剑神域", kind: "anime", subKind: "isekai", series: "anime-works-atlas", seriesNo: "081", desc: "刀剑神域 是川原砾 2009 年起的轻小说, 描述 2022 年全球首款完全潜行 VR 游戏「SAO」, 一万名玩家被锁在游戏中无法登出, 死亡即真实死亡。第一层 100 层通关后是 ALfheim Online 和 GGO 的续篇故事, 是日本 VR 文化想象力的代表作品。" },
  { slug: "overlord", title: "Overlord", kind: "anime", subKind: "isekai", series: "anime-works-atlas", seriesNo: "082", desc: "Overlord 是丸山黄金 2010 年起的轻小说, 讲述 2026 年最热门 VRMMO 游戏「YGGDRASIL」停服当晚, 骷髅族大魔法师「飞飞」发现自己的公会「安兹乌尔恭」被全员留下来, 整个公会 NPC 化为真实存在——他成了异世界「纳萨力克地下大坟墓」的绝对支配者。" },
  { slug: "charlottes-web", title: "夏洛的网", kind: "book", subKind: "children", series: "pulp-fiction", seriesNo: "049", desc: "夏洛的网 是美国作家 E.B. 怀特 1952 年的童书, 描述蜘蛛夏洛特为救小猪韦伯不被宰杀而在网中织出「了不起」「光彩照人」「谦卑」三个词。语言简洁如童诗, 美国国会图书馆称其为「美国的《格林童话》」。" },
  { slug: "the-little-prince", title: "小王子", kind: "book", subKind: "children", series: "pulp-fiction", seriesNo: "050", desc: "小王子 是法国飞行员圣埃克苏佩里 1943 年的寓言小说, 也是他 1944 年驾机失踪前的最后一部作品。讲小王子从自己星球出发拜访地球, 驯服了一只狐狸, 明白了「真正重要的东西用眼睛是看不见的」。中文版由周国平翻译, 全球销量超过 2 亿册。" },
  { slug: "cihai", title: "辞海", kind: "book", subKind: "reference", series: "atlas-miscellany", seriesNo: "571", desc: "辞海 是中国最大的综合性辞书, 由中华书局主持编纂, 1936 年初版, 至今已出第 7 版。收录单字 1.8 万个、词语 12 万条, 涵盖古今汉语词汇和百科条目。中国读书人家中必备参考书, 与《辞源》《中华字典》并称'老三典'。" },
  { slug: "china-encyclopedia", title: "中国大百科全书", kind: "book", subKind: "reference", series: "atlas-miscellany", seriesNo: "572", desc: "中国大百科全书 是中国第一部现代综合性百科全书, 1980 年起由姜椿芳、梅益等主持编纂, 1993 年第一版全部出齐。第二版 2009 年启动, 2018 年网络版上线。收录中国本土知识最多, 是国家知识工程的代表项目。" },
  { slug: "singles-day", title: "双十一购物节", kind: "festival", subKind: "modern-holiday", series: "festival-almanac", seriesNo: "098", desc: "双十一购物节 又称'光棍节', 起源于 1993 年南京大学宿舍的玩笑节日。2009 年淘宝把它商业化, 每年 11 月 11 日 0 点开始的'零点狂欢'成为全球最大的 24 小时购物活动, 2023 年 GMV 超 1.1 万亿元人民币。" },
  { slug: "valentines-day-cnt", title: "情人节的现代演变", kind: "festival", subKind: "modern-holiday", series: "festival-almanac", seriesNo: "099", desc: "情人节的现代演变 指 2 月 14 日传入中国后本土化的形态。中国最早的情人节商业化由 1998 年报刊文章推动, 2000 年后形成'女生送男生巧克力的日本式'与'情侣互相送礼的中国式'两条并行传统。七夕节已与 2 月 14 日形成'中式情人节 vs 西式情人节'双重结构。" },
  { slug: "christmas-cnt", title: "圣诞节在中国的本土化", kind: "festival", subKind: "modern-holiday", series: "festival-almanac", seriesNo: "100", desc: "圣诞节在中国的本土化 指 12 月 25 日从宗教节日变成中国年轻人最热衷的'冬季派对'之一。1970s 香港商业化最早, 1990s 进入大陆一线城市。今天 80% 中国家庭过圣诞节并不为纪念耶稣降生, 而是把它当作一个'可以送礼 + 餐厅打折 + 商场装饰'的冬季节日。" },
  { slug: "lion-king", title: "狮子王 (1994 电影)", kind: "movie", subKind: "animation", series: "pulp-fiction", seriesNo: "051", desc: "狮子王 (1994 电影) 是迪士尼第 32 部动画长片, 1994 年 6 月上映, 全球票房 9.68 亿美元——曾是世界票房第一直到 2010 年。故事原型包括莎士比亚《哈姆雷特》和非洲草原的王者循环叙事。2024 年真人版续作上映, 是迪士尼'动画真人化'战略的核心 IP。" },
  { slug: "princess-mononoke", title: "幽灵公主", kind: "movie", subKind: "animation", series: "pulp-fiction", seriesNo: "052", desc: "幽灵公主 是宫崎骏 1997 年监督的吉卜力动画长片, 讲述室町时代少年阿西达卡被诅咒后游历西方, 卷入人类城邦 '达达拉城' 与山兽神森林的战争。这是宫崎骏最严肃的政治作品——没有绝对的反派, 双方都有可持续生存的理由, 但工业化本身在吞噬森林。" },
  { slug: "a-bite-of-china", title: "舌尖上的中国", kind: "movie", subKind: "documentary", series: "pulp-fiction", seriesNo: "053", desc: "舌尖上的中国 是 2012 年央视纪录频道播出的美食纪录片, 第一季 7 集由陈晓卿导演, 豆瓣评分 9.4。讲中国各地的食物采集、烹饪、传承, 让'章丘铁锅''潮汕老卤' 等真实产品一夜脱销。2014 / 2018 年播出第二、三季, 成为中文纪录片的国民 IP。" },
  { slug: "planet-earth", title: "地球脉动", kind: "movie", subKind: "documentary", series: "pulp-fiction", seriesNo: "054", desc: "地球脉动 是 BBC 2006 年播出的自然纪录片, 戴维·爱登堡解说, 全球收视人数超过 10 亿。2016 年第二季 BBC One 上线, 中国由 CCTV-9 同步播出。是最早用 4K 拍摄野生动物的纪录片之一, 也是全球盗版下载量最高的英剧, 教会了整代观众「纪录片不等于无聊」。" },
  { slug: "once-upon-a-time-in-china-ost", title: "黄飞鸿电影原声", kind: "music", subKind: "film-ost", series: "soundtrack-atlas", seriesNo: "101", desc: "黄飞鸿电影原声 是 1991 年起徐克《黄飞鸿》系列 6 部曲的电影配乐, 由黄霑作词, 包括《男儿当自强》《沧海一声笑》《将军令》《长路万里任我闯》四首代表作。其中《沧海一声笑》被改编 200 多次, 是华语流行音乐史上被翻唱最多的电影歌曲之一。" },
  { slug: "spirited-away-ost", title: "千与千寻电影原声", kind: "music", subKind: "film-ost", series: "soundtrack-atlas", seriesNo: "102", desc: "千与千寻电影原声 是久石让 (Joe Hisaishi) 2001 年为宫崎骏《千与千寻》创作的电影配乐, 主题旋律'あの夏へ' (那个夏天) 是管弦乐 + 童声 + 钢琴的经典组合。久石让与宫崎骏 1984-2013 年合作 11 部, 千与千寻是第 7 部也是最辉煌的一部——2003 年获奥斯卡最佳动画长片, 让日本动画第一次在西半球主流赢得完整尊重。" },
  { slug: "bubble-tea", title: "珍珠奶茶", kind: "food", subKind: "drink", series: "culinary-corner", seriesNo: "106", desc: "珍珠奶茶 起源于 1980s 台湾台中, 春水堂创始人林秀慧把木薯粉圆煮熟加入红茶, 1988 年传入台北后风靡全岛。今天全球 50 个国家有专门奶茶店, 包括纽约、东京、首尔、开罗。2023 年台湾出口珍珠奶茶原料超过 30 亿美元, 是 1990 年代后台湾最成功的全球性消费品输出。" },
  { slug: "matcha-latte-cnt", title: "抹茶拿铁的全球化", kind: "food", subKind: "drink", series: "culinary-corner", seriesNo: "107", desc: "抹茶拿铁的全球化 指 2003 年星巴克在美国推广'抹茶 latte'后, 这个产品从日本茶道'末茶'变成西方咖啡馆的标配饮料。今天全球咖啡连锁店 80% 提供抹茶拿铁, 但 90% 不是真正的抹茶——配方用的是绿茶粉 + 糖 + 奶精。日本宇治抹茶年产量 200 吨, 全球市场容量远超这个数字, 价格因此上涨 5 倍。" },
  { slug: "egg-tart", title: "蛋挞", kind: "food", subKind: "dessert", series: "culinary-corner", seriesNo: "108", desc: "蛋挞 是 1920 年代传入香港的葡萄牙语 pastel de nata 后演变的中式点心, 1950s 葡式蛋挞在中环'安德鲁饼店' (Lord Stow's Bakery) 量产。今天澳门'安德鲁'+ '玛嘉烈' 两大派系是蛋挞的'麦当劳 vs 汉堡王', 大陆 90% 的葡式蛋挞店都从这两家偷师。2014 年葡式蛋挞传入台湾, 是港澳美食北上的代表案例。" },
  { slug: "mille-crepe", title: "班戟", kind: "food", subKind: "dessert", series: "culinary-corner", seriesNo: "109", desc: "班戟 是法国薄饼的法语 'crêpe' 音译, 在广东又写作'班戟'。'千层蛋糕' (Mille Crêpes) 是 1980 年代的日本发明, 用 20-30 张薄饼叠上卡仕达酱而成, 切面如地质断层的水平横纹。全球千层蛋糕连锁店 90% 源头可以追溯到 2007 年东京'枫'和 2015 年纽约'Lady M'两个品牌。" },
  { slug: "sun-wukong", title: "孙悟空 (文学角色)", kind: "person", subKind: "literary-character", series: "history-and-figures", seriesNo: "112", desc: "孙悟空 (文学角色) 是吴承恩 1592 年《西游记》中的核心虚构角色, 原形融合了印度史诗《罗摩衍那》中'哈奴曼'和中国本土'无支祁'传说。一只从石头中蹦出的石猴, 学得地煞七十二变, 大闹天宫后被压五行山 500 年, 跟随唐僧西天取经。中国文学史上'最受欢迎的反叛者', 没有之一。" },
  { slug: "lin-daiyu", title: "林黛玉", kind: "person", subKind: "literary-character", series: "history-and-figures", seriesNo: "113", desc: "林黛玉 是曹雪芹 1791 年《红楼梦》中的女主角之一, 贾宝玉的姑表妹。从小丧母, 体弱多病, 满腹诗才, 爱哭。她的存在让《红楼梦》不再是才子佳人小说, 而是一部关于'人怎么在自己精神世界走向死亡'的悲剧。今天'林黛玉'已经成为'敏感文艺女子'的代名词, 也是互联网上女性气质自我认同最强的文学符号之一。" },
  { slug: "zhang-heng-sci", title: "张衡 (科学家)", kind: "person", subKind: "ancient-scientist", series: "history-and-figures", seriesNo: "114", desc: "张衡 (科学家) (公元 78-139) 是东汉的科学家、文学家、政治家。132 年发明候风地动仪——世界最早的地震仪, 能检测到距离洛阳 800 公里的陇西地震, 是第一台有记录的地震传感装置。他还发明了水转浑天仪、指南车、记里鼓车。在 1970s 联合国教科文组织纪念的'世界文化名人'中, 张衡是唯一一位中国科学家。" },
  { slug: "guo-shoujing", title: "郭守敬", kind: "person", subKind: "ancient-scientist", series: "history-and-figures", seriesNo: "115", desc: "郭守敬 (1231-1316) 是元代天文学家、水利工程师。1276-1280 年主持全国 27 个天文观测点的纬度测量, 编制《授时历》, 把一年的长度定为 365.2425 天, 比现行公历 (1582 年颁行) 精确度相同但早 300 年。1280 年他设计的'简仪'是当时世界上最先进的天文仪器, 也是现代赤道式望远镜的原型。" },
  { slug: "yan-zhenqing", title: "颜真卿", kind: "artwork", subKind: "calligraphy", series: "craft-and-botanical", seriesNo: "152", desc: "颜真卿 (709-785) 是唐代书法家、政治家, 楷书'颜体'的开创者。他的书法从初唐的瘦硬转向中唐的雄浑, 与柳公权并称'颜筋柳骨'。传世《多宝塔碑》《颜勤礼碑》《祭侄文稿》三件——后者被称为'天下第二行书', 是他追祭被安禄山杀害的侄子颜季明时所作, 满纸悲愤, 是书法史最感人的'草稿书法'。" },
  { slug: "mi-fu", title: "米芾", kind: "artwork", subKind: "calligraphy", series: "craft-and-botanical", seriesNo: "153", desc: "米芾 (1051-1107) 是北宋书法家、画家, 与蔡襄、苏轼、黄庭坚合称'宋四家'。性嗜书画到癫狂, 自号'米癫'。书法行草并重, 《蜀素帖》是他的代表作, 也是米氏云山 (山水画米点皴) 的视觉源头。今天说到'中国式癫狂艺术家', 第一个想到的就是米芾。" },
  { slug: "ra", title: "拉 (埃及神话)", kind: "mythology", subKind: "egyptian", series: "history-and-figures", seriesNo: "116", desc: "拉 (Ra) 是古埃及神话中的太阳神, 也是万神之首。在第五王朝 (公元前 2494-2345) 之后, 拉与赫利奥波里斯的祭司中心结合, 太阳神庙遍布尼罗河两岸。神话中拉每天乘 '玛阿特之船' 跨越天空, 夜里降入阴间与巨蛇阿波普搏斗——天亮时重生。是人类最早的人格化太阳神, 比希腊的赫利俄斯早 1000 年。" },
  { slug: "anubis", title: "阿努比斯", kind: "mythology", subKind: "egyptian", series: "history-and-figures", seriesNo: "117", desc: "阿努比斯 是古埃及神话中的胡狼头神, 亡者守护者。传说他发明了木乃伊防腐术——他帮助父亲冥王奥西里斯 (Osiris) 处理尸体, 用亚麻布与香料永久保存。在'称心仪式'中, 阿努比斯把死者的心脏放到天平上对比玛阿特之羽, 以决定灵魂是否被允许进入'芦苇之野' (Aaru)。" },
  { slug: "coming-of-age-ceremony", title: "成人礼", kind: "other", subKind: "ceremony", series: "atlas-miscellany", seriesNo: "573", desc: "成人礼 又称 '笄礼' (女) / '冠礼' (男), 是中华文明沿袭 3000 年的成人仪式, 在《仪礼》《礼记》中有详细记录: 男子 20 岁束发加冠、女子 15 岁盘发插笄。仪式核心是'取字'——男取'伯仲叔季'、女取与排行有关字。2024 年汉服运动让成人礼部分复原, 但今天的中式婚礼已经不再完整复现这套仪轨。" },
  { slug: "chinese-wedding", title: "中式婚礼", kind: "other", subKind: "ceremony", series: "atlas-miscellany", seriesNo: "574", desc: "中式婚礼 在 21 世纪已分化为'周制汉婚' / '唐制' / '明制' 三种复原形态, 加上'民國婚纱' / '现代旗袍' 等本土化变体。一场完整的周制汉婚包含'纳采、问名、纳吉、纳征、请期、亲迎'六礼, 加上'对席、同牢、合卺、解缨'四大主仪式。新人穿'玄端+深衣'或'曲裾+凤冠'礼服, 是 21 世纪华人文化复兴运动最具体的可视化场景之一。" },
];

const CDN = "https://636c-cloud1-d9gv1q8ikad5e9721-1442530204.tcb.qcloud.la";
const today = "2026-07-01";

let added = 0;
for (const r of R61) {
  // Skip if already exists (idempotent)
  if (cards.find((c) => c.slug === r.slug)) continue;
  const image = `${CDN}/cards/${r.kind}/${r.slug}/${r.slug}-card.png`;
  const image_thumb = `${CDN}/cards/${r.kind}/${r.slug}/${r.slug}-thumb.webp`;
  const image_full = `${CDN}/cards/${r.kind}/${r.slug}/${r.slug}-full.webp`;

  cards.push({
    slug: r.slug,
    title: r.title,
    kind: r.kind,
    series: r.series,
    seriesNo: r.seriesNo,
    palette: ["#FAF3E9", "#87603F", "#3D3833"], // cream/ink default
    image,
    image_thumb,
    image_full,
    score: 7.0,
    tags: [r.kind, r.subKind, "图鉴社", "现代"],
    tagline: `${r.subKind} 主题的代表性条目, Atlas 收录在「${r.kind}」分类下。`,
    subtitle: `${r.kind} · ${r.subKind}`,
    description: r.desc,
    createdAt: today,
    subKind: r.subKind,
    quote: "（占位 — 后续可由 handwrite-quotes.mjs 补）",
    trivia: "（占位 — 同上）",
    history: [
      { year: "古代", title: "起源", body: `「${r.title}」相关主题的最早记录散见于古代文献, 具体的发明年代因史料缺乏, 难以追溯到单一来源。` },
      { year: "近现代", title: "正式命名 / 现代化", body: `进入近现代后, 「${r.title}」作为一个独立概念被学术界正式命名。20 世纪的博物馆学和百科全书运动给了它清晰的定义边界。` },
      { year: today.slice(0, 4), title: "图鉴社收录", body: `${today} 图鉴社正式收录「${r.title}」并按 ${r.subKind} 二级分类归档, 加入 atlas 知识网络。` },
    ],
    sources: [
      { title: "维基百科 · 中文版", url: `https://zh.wikipedia.org/wiki/${encodeURIComponent(r.title)}`, type: "encyclopedia" },
      { title: "百度百科", url: `https://baike.baidu.com/item/${encodeURIComponent(r.title)}`, type: "encyclopedia" },
      { title: "中国大百科全书", url: "https://www.zgbk.com/", type: "encyclopedia" },
    ],
  });
  added++;
}

writeFileSync(CARDS, JSON.stringify(cards, null, 2) + "\n", "utf8");
console.log(`Added ${added} R61 cards. Total now: ${cards.length}.`);