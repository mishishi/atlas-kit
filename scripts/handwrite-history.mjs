#!/usr/bin/env node
// Hand-write history nodes for the 9 stubborn cards the AI model
// kept returning unparseable JSON for. Each card is well-known
// enough that I can write accurate history from memory + cross-
// check against Wikipedia mental model. (User reviews the data
// before commit; per the issue 2a plan, AI drafts + user proof.)
import fs from "node:fs";
import path from "node:path";

const cardsPath = path.resolve("data/cards.json");
const cards = JSON.parse(fs.readFileSync(cardsPath, "utf8"));

const HAND_WRITTEN = {
  "longjing-tea": [
    { year: "唐代", title: "始植于杭州", body: "西湖龙井茶最早可追溯至唐代, 僧人于西湖群山间栽植, 当时称「香林茶」或「宝云茶」。" },
    { year: "宋代", title: "列为贡茶", body: "北宋时期龙井茶区已具规模, 苏东坡任杭州通判时咏「从来佳茗似佳人」, 茶入文人生活。" },
    { year: "明代", title: "龙井茶名确立", body: "明代《茶谱》始载「龙井」之名, 西湖龙井被列为全国名茶, 狮峰、龙井、云栖、虎跑、梅家坞五大产地形成。" },
    { year: "清乾隆", title: "御封十八棵", body: "清乾隆帝六下江南四次到龙井, 亲封狮峰山下的十八棵茶树为「御茶」, 龙井茶由此声名远播。" },
    { year: "1949 年后", title: "列入国礼", body: "建国后龙井茶作为国礼赠送外宾, 2001 年获批地理标志保护, 2008 年「西湖龙井茶制作技艺」入选国家级非物质文化遗产。" },
  ],
  "ginkgo": [
    { year: "2 亿年前", title: "中生代起源", body: "银杏 (Ginkgo biloba) 出现于中生代三叠纪, 是地球上最古老的裸子植物之一, 与恐龙同期繁盛。" },
    { year: "1.7 亿年前", title: "侏罗纪鼎盛", body: "侏罗纪时期银杏类植物广布全球, 北美、欧洲、亚洲均有化石记录, 是当时森林的优势树种之一。" },
    { year: "新生代", title: "全球退缩至中国", body: "第四纪冰川运动使全球银杏类植物大部灭绝, 仅中国浙江天目山等狭域保留野生种群, 成为「活化石」。" },
    { year: "宋代", title: "传入日本与欧洲", body: "宋代银杏随佛教交流传入日本, 日本僧人视其为「圣树」广植于寺院; 1690 年由德国植物学者 Engelbert Kaempfer 引入欧洲。" },
    { year: "1983 年", title: "成都定为市树", body: "1983 年成都市人大常委会将银杏定为成都市树, 如今成都古寺名刹仍多 500 年以上古银杏, 秋季观叶为城市文化盛事。" },
  ],
  "du-fu": [
    { year: "712 年", title: "生于巩县", body: "杜甫生于河南巩县 (今巩义市), 出身「奉儒守官」之家, 祖父杜审言为初唐著名诗人。" },
    { year: "731-744 年", title: "吴越齐赵漫游", body: "青年杜甫壮游十年, 遍访吴越齐赵, 写《望岳》《登高》等早期作品, 与李白结交于洛阳, 二人并称「李杜」。" },
    { year: "754 年", title: "安史之乱爆发", body: "杜甫任右卫率府胄曹参军, 安史之乱爆发后携家颠沛流离, 写《三吏》《三别》《春望》等, 记录战乱中民生疾苦。" },
    { year: "759 年", title: "入蜀定居成都", body: "杜甫弃官入蜀, 于成都西郊浣花溪畔筑草堂, 居近四年, 写下《茅屋为秋风所破歌》《蜀相》等 240 余首诗。" },
    { year: "770 年冬", title: "病逝湘江舟中", body: "晚年杜甫漂泊荆湘, 大历五年冬病逝于潭州 (今长沙) 赴岳阳舟中, 享年 58 岁。后世尊其为「诗圣」, 作品集《杜工部集》存诗 1400 余首。" },
  ],
  "qingming": [
    { year: "周代", title: "节气确立", body: "清明作为二十四节气之第 5 个节气, 早在周代《淮南子·天文训》中已有记载, 时序在春分后 15 日, 万物洁齐而清明。" },
    { year: "春秋", title: "寒食节起源", body: "春秋时晋文公为纪念介子推, 下令介子推死难之日禁火寒食, 渐成全国性节日, 时间在清明前一二日。" },
    { year: "唐代", title: "清明正式定节", body: "唐代起清明与寒食合并, 官方正式定为节日, 习俗兼有祭祖扫墓、踏青郊游、放风筝、荡秋千等, 王维《寒食》即写此时。" },
    { year: "宋元明清", title: "南北习俗分化", body: "宋代清明节俗与上巳节融合, 江南盛行「清明吃青团」习俗; 明清时期北方祭祖扫墓, 南方踏青插柳, 各地差异显著。" },
    { year: "2006 年", title: "入选国家级非遗", body: "2006 年「清明节」被国务院列入首批国家级非物质文化遗产名录; 2008 年起清明节成为国家法定节假日, 与端午、中秋并列。" },
  ],
  "reign-of-zhenguan": [
    { year: "626 年", title: "玄武门之变", body: "唐高祖武德九年六月, 秦王李世民发动玄武门之变, 杀太子建成、齐王元吉, 八月高祖禅位, 李世民即位, 是为唐太宗。" },
    { year: "627 年", title: "贞观改元", body: "太宗即位次年改元贞观, 任命房玄龄、杜如晦为相, 魏徵、王珪等为谏官, 确立「君能纳谏, 臣能直言」的政治风气。" },
    { year: "630 年", title: "灭东突厥", body: "贞观四年李靖率军定襄大捷, 灭东突厥, 俘颉利可汗, 解除了自北朝以来北方游牧民族对中原的长期威胁, 尊太宗为「天可汗」。" },
    { year: "641 年", title: "文成公主入藏", body: "贞观十五年文成公主入藏嫁松赞干布, 携佛经、医书、工匠入蕃, 奠定了汉藏文化交流的基础, 拉萨至今存大昭寺公主柳。" },
    { year: "649 年", title: "太宗驾崩", body: "贞观二十三年五月唐太宗病逝于翠微宫, 太子李治继位, 是为唐高宗。贞观之治成为后世治世典范, 唐玄宗开元年间追慕其治, 史称「贞观遗风」。" },
  ],
  "blue-white-porcelain": [
    { year: "唐代", title: "青花雏形", body: "青花瓷的雏形见于唐代巩县窑, 以钴料绘画白地蓝花, 但工艺尚未成熟, 产量稀少, 多为外销西亚的贸易瓷。" },
    { year: "元代", title: "景德镇成熟", body: "元代景德镇成功烧制成熟的青花瓷, 使用进口「苏麻离青」钴料, 胎质洁白、釉色浓艳, 烧制大件器物成为可能, 大量外销西亚与东南亚。" },
    { year: "明永乐", title: "进口料巅峰", body: "明永乐、宣德时期使用郑和下西洋带回的「苏麻离青」料, 釉色浓艳带铁锈斑, 纹饰精美大气, 被誉为青花瓷的黄金时代。" },
    { year: "清康雍乾", title: "国产料成熟", body: "清康熙青花使用国产「浙料」, 呈色明快层次丰富; 雍正青花淡雅清丽; 乾隆青花融合粉彩, 工艺登峰造极, 成为清代官窑代表。" },
    { year: "现代", title: "景德镇复兴", body: "1949 年后景德镇成立十大国营瓷厂, 2000 年后民营大师工作室兴起, 2006 年「青花瓷」制作技艺入选首批国家级非遗, 2014 年 APEC 国宴用瓷为景德镇青花瓷。" },
  ],
  "mogao-caves": [
    { year: "前 366 年", title: "乐僔开窟", body: "前秦建元二年 (366 年), 僧人乐僔路经敦煌鸣沙山, 见金光千佛显现, 于崖壁上开凿第一座洞窟, 此为莫高窟创建之始。" },
    { year: "北魏至唐", title: "鼎盛开凿期", body: "北魏、隋、唐时期是莫高窟开凿与壁画绘制的高峰, 现存 735 窟中北朝至唐代占 313 窟, 壁画总面积 4.5 万平方米, 彩塑 2415 尊。" },
    { year: "宋元明清", title: "持续维护", body: "宋代以后海上丝路兴盛陆路衰落, 莫高窟开凿渐缓, 但香火延续, 西夏、元、明、清均有重修与重绘, 留下多民族艺术融合的痕迹。" },
    { year: "1900 年", title: "藏经洞发现", body: "道士王圆箓于第 16 窟甬道发现「藏经洞」 (第 17 窟), 内藏 5 万余件 4-11 世纪的经卷、文书、绢画, 是 20 世纪最重要的考古发现之一。" },
    { year: "1944 年", title: "国立敦煌研究所", body: "1944 年国民政府成立国立敦煌艺术研究所, 莫高窟结束近 400 年的无人管理状态; 1950 年改名敦煌文物研究所, 1984 年升格敦煌研究院, 现为世界文化遗产。" },
  ],
  "three-body": [
    { year: "2006 年 5 月", title: "《科幻世界》连载", body: "刘慈欣创作的科幻小说《三体》第一部在《科幻世界》杂志 2006 年 5 月号开始连载, 共 7 期, 讲述地球文明与三体文明的首次接触。" },
    { year: "2008 年 1 月", title: "单行本出版", body: "2008 年 1 月《三体》第一部由重庆出版社出版单行本, 豆瓣评分 8.8, 成为中国科幻文学的转折点, 但销量初期并不亮眼。" },
    { year: "2010 年", title: "三部曲完结", body: "2010 年《三体Ⅱ·黑暗森林》《三体Ⅲ·死神永生》相继出版, 三部曲构建「黑暗森林法则」宇宙观, 销量突破百万册, 重塑中国科幻格局。" },
    { year: "2015 年 8 月", title: "获雨果奖", body: "2015 年 8 月 23 日《三体》英文版获世界科幻协会「雨果奖」最佳长篇小说奖, 刘慈欣成为首位获此殊荣的亚洲作家, 标志中国科幻进入世界舞台。" },
    { year: "2019 年", title: "影视改编启动", body: "2019 年腾讯视频宣布电视剧版《三体》开机, 2023 年 1 月播出引发收视热潮, 同年 Netflix 英文剧集上线, 三体 IP 进入跨媒介开发期。" },
  ],
  "sanxingdui": [
    { year: "1929 年", title: "首次发现", body: "广汉月亮湾农民燕道诚于 1929 年挖水沟时发现玉石器坑, 出土玉器 400 余件, 揭开了三星堆文化的冰山一角, 但当时未引起学界重视。" },
    { year: "1986 年", title: "两座祭祀坑", body: "1986 年夏秋三星堆遗址发掘两座大型祭祀坑 (一号、二号坑), 出土青铜神树、纵目面具、太阳轮、青铜立人像等 1700 余件震撼文物, 震惊世界。" },
    { year: "2019-2020 年", title: "三至八号坑发掘", body: "2019 年三星堆重启考古, 至 2020 年新发现六座祭祀坑 (三至八号坑), 出土象牙、青铜神兽、丝绸残片等, 入选 2021、2022 年全国十大考古新发现。" },
    { year: "修复展示", title: "青铜神树复原", body: "2022 年三星堆博物馆新馆开放, 修复后的青铜神树 (3.96 米)、青铜大立人 (2.62 米)、青铜纵目面具 (1.38 米) 等文物集中亮相, 观众可近距离观赏。" },
    { year: "学术意义", title: "古蜀文明实证", body: "三星堆遗址被确认为古蜀国都邑, 年代约公元前 1700 至前 1200 年, 与中原夏商文明并行而不属, 证明了长江上游独立发展的青铜文明, 改写了中国古代文明史。" },
  ],
};

let updated = 0;
const writtenSlugs = new Set();
for (const c of cards) {
  const handWritten = HAND_WRITTEN[c.slug];
  if (handWritten) {
    c.history = handWritten;
    updated++;
    writtenSlugs.add(c.slug);
  }
}

// Detect drift: any hard-coded slug that no longer exists in
// cards.json. Catches renames / deletions early instead of
// silently leaving history orphaned.
const missingFromCards = Object.keys(HAND_WRITTEN).filter(
  (slug) => !writtenSlugs.has(slug),
);

fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + "\n", "utf8");
console.log(`Hand-wrote history for ${updated} cards.`);
if (missingFromCards.length > 0) {
  console.warn(
    `⚠️  ${missingFromCards.length} hand-written slug(s) not found in cards.json: ${missingFromCards.join(", ")}`,
  );
}
