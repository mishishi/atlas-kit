#!/usr/bin/env node
// Build a complete image-generation prompt for a given topic + kind.
//
// This script is the SINGLE source of truth for the wizard's prompt.
// `src/app/api/generate/route.ts` shells out to this script via
// child_process so that CLI users and the wizard always assemble the
// exact same prompt from the same source.
//
// Two template versions coexist on purpose:
//   v1 — Inline 243-line hard-coded Chinese prompt (the original,
//        kept verbatim for rollback / A/B comparison). Ported
//        from src/lib/prompt-templates.ts (Round 24, 2026-06-16).
//   v2 — Reads prompt-template/main-template.md + categories/<kind>.md
//        verbatim (the curated, file-archived source of truth).
//
// Default is v2 because the archived templates are the
// user-curated source of truth.
//
// Usage:
//   node scripts/build-prompt.mjs <topic> <kind> [--version v1|v2] [--out path.md] [--quiet]
//
//   node scripts/build-prompt.mjs 拉布拉多 pet
//   node scripts/build-prompt.mjs 三星堆 history
//   node scripts/build-prompt.mjs 三星堆 history --version v1
//   node scripts/build-prompt.mjs 三星堆 history --out /tmp/prompt.md --quiet
//
//   kind values: city, animal, pet, plant, person, festival, food,
//                historical-event, technology, object,
//                natural-phenomenon
//
//   (Aliases: history → historical-event, phenomenon →
//             natural-phenomenon, tech → technology)
//
// Output:
//   stdout  — the composed prompt (unless --out is given, in which
//             case written to that file and stdout is silent)
//   stderr  — summary block (topic/kind/sizes), unless --quiet
//
// Exit codes:
//   0  success
//   1  bad args / missing files / template drift
//
// Why --quiet: the wizard shells out from `route.ts` and pipes stdout
// directly into the matrix_generate_image request. Any stderr noise
// gets logged but doesn't break the wizard; --quiet suppresses the
// summary block for cleaner prod logs.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

// ============================================================================
// Arg parsing
// ============================================================================

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        flags[key] = true;
      } else {
        flags[key] = next;
        i++;
      }
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

const { positional, flags } = parseArgs(process.argv.slice(2));

if (positional.length < 2) {
  console.error(
    "Usage: node scripts/build-prompt.mjs <topic> <kind> [--version v1|v2] [--out path.md] [--quiet]\n" +
      "\n" +
      "  <topic>  the subject to depict (quoted if it contains spaces)\n" +
      "  <kind>   one of: city, animal, pet, plant, person, festival,\n" +
      "            food, historical-event, tech-concept, object,\n" +
      "            natural-phenomenon, music, anime\n" +
      "\n" +
      "Examples:\n" +
      "  node scripts/build-prompt.mjs 拉布拉多 pet\n" +
      "  node scripts/build-prompt.mjs 三星堆 historical-event\n" +
      "  node scripts/build-prompt.mjs 钱塘江大潮 natural-phenomenon\n" +
      "  node scripts/build-prompt.mjs 你的香气 music\n" +
      "  node scripts/build-prompt.mjs 虫师 anime\n" +
      "  node scripts/build-prompt.mjs 三星堆 history --version v1    # legacy inline template\n",
  );
  process.exit(1);
}

const topic = positional[0];
const kindRaw = positional[1];
const versionRaw = flags.version;
const outPath = flags.out ?? null;
const quiet = flags.quiet === true;

if (versionRaw && versionRaw !== "v1" && versionRaw !== "v2") {
  console.error(`Invalid --version "${versionRaw}". Must be "v1" or "v2".`);
  process.exit(1);
}
// Default: v2 (the archived file templates are the curated source of
// truth; v1 is for rollback / A/B only).
const version = versionRaw ?? "v2";

// ============================================================================
// Kind aliases + display labels
// ============================================================================
//
// Friendly aliases — match the 12 CardKind values in
// src/lib/types.ts. The canonical kind list there is:
//   pet, animal, plant, city, festival, food, phenomenon, history,
//   object, person, tech, other
// The prompt-template/ categories use slightly different slugs for
// some (history → historical-event, phenomenon → natural-phenomenon,
// tech → tech-concept). Map both directions.

// R28 (2026-06-17): file `prompt-template/categories/tech-concept.md`
// was renamed to `technology.md` for consistency with the "noun"
// naming pattern (historical-event / natural-phenomenon / technology
// all read as "{category}"). The canonical `tech` CardKind is
// unchanged — only the on-disk template filename shifted.
const KIND_ALIASES = {
  history: "historical-event",
  phenomenon: "natural-phenomenon",
  tech: "technology",
};

const KIND_DISPLAY = {
  pet: "宠物",
  animal: "动物",
  plant: "植物",
  city: "城市",
  festival: "节日",
  food: "食物",
  phenomenon: "自然现象",
  history: "历史事件",
  object: "器物",
  person: "人物",
  tech: "科技概念",
  other: "其他",
  // R30: 12 new canonical kinds (user added category templates
  // 2026-06-17). Slugs are kebab-case to match the file names.
  architecture: "建筑",
  artwork: "艺术品",
  book: "书籍",
  "chemical-element": "化学元素",
  country: "国家",
  disease: "疾病",
  movie: "电影",
  mythology: "神话",
  profession: "职业",
  "space-object": "天体",
  sport: "体育运动",
  vehicle: "交通工具",
  // R43 (2026-06-21): 2 new kinds — music / anime. user added
  // the corresponding category templates 2026-06-21.
  music: "音乐",
  anime: "动漫",
  // Alias long-form keys so kindDisplay lookup works after alias
  // resolution (these are NOT listed to the user as canonical).
  "historical-event": "历史事件",
  "natural-phenomenon": "自然现象",
  technology: "科技概念",
};

// Canonical kinds = the 12 CardKind values (matches src/lib/types.ts).
// Aliases (historical-event / natural-phenomenon / tech-concept) are
// accepted on input but not advertised in the error message — users
// should use the short forms.
const CANONICAL_KINDS = Object.keys(KIND_DISPLAY).filter(
  (k) => !Object.values(KIND_ALIASES).includes(k),
);
const VALID_KINDS = Object.keys(KIND_DISPLAY);

// Validate the raw input first (before alias resolution). This way
// the error message lists the user-facing canonical kinds, not the
// internal archived filenames.
if (!VALID_KINDS.includes(kindRaw)) {
  console.error(
    `Unknown kind: "${kindRaw}".\n` +
      `\n` +
      `Valid canonical kinds (from src/lib/types.ts):\n  ${CANONICAL_KINDS.join(", ")}\n` +
      `\n` +
      `Aliases accepted too:\n` +
      `  history         → historical-event\n` +
      `  phenomenon      → natural-phenomenon\n` +
      `  tech            → tech-concept\n`,
  );
  process.exit(1);
}
const kind = KIND_ALIASES[kindRaw] ?? kindRaw;
const kindDisplay = KIND_DISPLAY[kind];

// ============================================================================
// v1: inline legacy template
// ============================================================================
//
// Verbatim copy of the original ~243-line buildPrompt() body from
// src/lib/prompt-templates.ts (extracted 2026-06-16, R24). Editing
// the v1 template here DOES NOT affect src/lib/prompt-templates.ts
// (which is still imported by the theme switcher); they are now two
// independent sources. If you change one, mirror the change in the
// other or delete the v1 path entirely.
//
// Note: the `palette` slot that v1 used to read from `palette[1]` is
// dropped here — the wizard no longer passes palette to the prompt
// (the user-customized palette flows through the matrix_generate_image
// `requests` array differently). v1's "auto" / palette logic was
// never visible in the actual prompt text anyway (THEME_TYPE_MAP was
// commented out at lines 32-33 of the original file).
//
// Theme rule from main-template.md: anti-RPG. No rarity/level/SSR/雷达图
// vocabulary — keep that constraint if you edit v1 below.

function buildPromptV1(topic) {
  return `请根据【主题】生成一张高质量竖版「科普百科图鉴」。

主题：【${topic}】

主题类型：【城市 / 动物 / 宠物 / 植物 / 人物 / 节日 / 食物 / 自然现象 / 历史事件 / 器物 / 科技概念 / 其他】

这是一张完整成图版百科信息图，不需要后期排版。

它不是普通海报，也不是单纯插画，而是一张兼具「图鉴感、百科感、信息结构感、收藏感」的模块化科普卡片。

核心目标：

整体信息密度应接近现代百科书页、高级博物图鉴或高质量知识杂志内页。

画面要丰富、耐看、可收藏。

不要过度极简，不要空洞留白。

不要做成轻量知识卡。

但也不要拥挤、杂乱或小字堆满。

版式密度规则：

画面中下部默认设置 8 个完整信息模块。

允许在不拥挤的前提下，额外加入 1-2 个小型补充模块。

补充模块最多 2 个，不要超过 2 个。

如果画面空间不足，优先保留 8 个完整模块，删除补充模块。

每个完整模块包含 2-4 条短文本。

补充模块只放短标签、图标或小型可视化，不写长句。

整体强调百科书页的信息密度和收藏感。

必须包含多种可视化元素。

不要过度极简，不要把模块做得过于简陋。

版面比例：

主视觉占画面高度约 28%-35%。

信息模块区占画面高度约 50%-58%。

顶部标题区清晰但不要过高。

底部总结栏简洁，不要占用太多空间。

不要让主视觉挤压信息模块。

不要让模块挤压标题和底部总结。

系列感要求：

整体版式应像同一套百科图鉴系列模板。

可以替换不同主题，但保持统一的信息结构和视觉秩序。

标题区、主视觉区、局部放大区、信息模块区、底部总结栏的层级要稳定。

不同主题可以变化配色和图标，但整体风格要统一。

整体风格：

高级博物图鉴、现代百科书页、生活方式知识卡、社交媒体高传播信息图的结合。

浅色干净背景，柔和配色，轻阴影，精致小图标，圆角信息框，细线标注，整洁网格排版。

信息丰富但层级清楚，阅读体验好，适合收藏和系列化生产。

不要做成商业广告、旅游宣传海报、促销海报或单纯插画。

如果是宠物主题，也不要做成可爱卖萌海报、宠物店广告或领养宣传图。

画面比例：

竖版 9:16。

适合手机屏幕阅读。

顶部标题，中上部主视觉，中下部模块信息，底部总结栏。

一、标题区

顶部放置清晰标题：

「【${topic}】百科图鉴」

副标题用一句短句概括主题特征。

添加 3-5 个短标签。

标签必须简短，例如：

#古都 #生态 #节气 #结构 #习性 #护理

二、主视觉区

画面中上部放置一个清晰漂亮的主题主视觉。

主视觉要像图鉴中的核心标本、城市样本、动物观察样本、宠物品种档案、人物档案、节日场景、结构样本或知识对象。

画面精致、可信、干净，有图鉴插画感。

不要过度夸张，不要杂乱拼贴。

三、局部特征放大

围绕主视觉设置 4-5 个放大细节框。

根据主题自动选择最值得观察的局部特征。

使用细线、编号、短标签连接主视觉。

放大框要有真实观察感，而不是装饰圆点。

四、模块化信息区

画面中下部设置 8 个完整信息模块。

模块可以有大小主次，但每个模块都要看起来完整。

不要把后几个模块做得过于简陋。

允许额外加入 1-2 个小型补充模块，但不能造成拥挤。

每个完整模块包含：

1 个清楚小标题

1 个小图标

2-4 条短句或短标签

必要时加入评分条、时间轴、地图、结构图、对比条、流程图等可视化元素

小型补充模块可以是：

冷知识

色谱

风味轮

季节轮盘

风险等级

地图索引

形态对比

结构剖面

小型 Top 清单

关键词标签组

补充模块要求：

只放短标签、图标、小型图表或 1-2 条极短文字。

不要写长句。

不要抢占主模块层级。

最多 2 个补充模块。

空间不足时取消补充模块。

文字密度要求：

每个完整模块 2-4 条短文本。

每条文字尽量控制在 10-16 个中文字符。

允许少量较长专有名词。

不要写大段正文。

不要生成密密麻麻的小字。

画面要有百科书页的信息密度，但必须保持清晰行距和模块留白。

短句丰富，层级清楚，信息完整。

如果文字过多会影响清晰度，优先减少正文数量，而不是缩小字号或生成伪字。

如果文字区域不足，优先压缩句子，不要缩小到不可读。

事实准确性要求：

内容应基于常识性、稳定性较高的百科信息。

不要编造不确定事实。

无法确定的内容，用通用描述、图标或结构表达。

避免使用过细、过新、可能变化的数据。

不要生成看似精确但无法确认的数字。

五、栏目选择规则

请根据主题类型自动选择最合适的 8 个信息模块。

如果主题是城市：

基础档案、地理位置、历史坐标、城市结构、代表地标、生活方式、快速评分卡、地图速览。

可选内容：地貌气候、街区肌理、美食、交通格局、文化符号。

补充模块可选：城市印章、街区剖面、地标剪影、饮食标签、交通线索。

如果主题是动物：

基础档案、分类信息、外观特征、栖息环境、生活习性、食性结构、风险等级、冷知识。

可选内容：繁殖方式、分布区域、保护等级、天敌关系。

补充模块可选：足迹、体型比例、生态位、分布小地图、叫声标签。

如果主题是宠物：

基础档案、品种特征、性格倾向、饲养难度、日常护理、适合人群、风险注意、快速评分卡。

可选内容：运动需求、饮食建议、毛发护理、训练难度、社交需求、常见疾病、空间需求、花费等级。

补充模块可选：体型比例、毛色图鉴、护理清单、适合人群标签、常见误区。

宠物主题要像「宠物饲养百科图鉴」，不要像萌宠写真或宠物用品广告。

如果主题是植物：

基础档案、分类信息、形态特征、生长环境、花果周期、养护建议、用途价值、注意事项。

可选内容：分布区域、毒性、观赏价值、药用或食用价值。

补充模块可选：叶形图鉴、花期轮盘、生长条件、土壤湿度、毒性等级。

如果主题是人物：

基础档案、生平时间线、代表成就、关键作品、人物关键词、影响力评分、时代背景、争议或局限。

可选内容：人物关系、思想主张、历史评价、重要节点。

补充模块可选：语录标签、作品索引、关系图、时代坐标、成就徽章。

如果主题是节日：

基础档案、起源传说、时间节点、核心习俗、象征物、节令食物、地域差异、文化意义。

可选内容：仪式流程、相关诗词、禁忌事项、现代变化。

补充模块可选：节令色卡、习俗流程、食物清单、地域地图、象征物小图鉴。

如果主题是食物：

基础档案、原料结构、风味特征、制作流程、地域流派、食用场景、搭配建议、注意事项。

可选内容：营养特点、历史来源、口感层次、常见变体。

补充模块可选：风味雷达、色谱、口感标签、原料剖面、制作步骤小图。

如果主题是自然现象：

形成机制、发生条件、结构组成、观测方式、典型案例、风险等级、季节分布、防护建议。

可选内容：影响范围、科学原理、记录数据、预警信号。

补充模块可选：观测窗口、风险图例、形成流程、数据刻度、影响范围图。

如果主题是历史事件：

基础档案、时间线、关键人物、事件过程、地点地图、因果关系、历史影响、争议点。

可选内容：背景条件、转折节点、后续变化、相关文献。

补充模块可选：关键日期、势力关系、地点索引、事件流程、影响标签。

如果主题是器物：

基础档案、结构组成、用途场景、工艺特点、发展历史、材料说明、维护建议、收藏价值。

可选内容：剖面结构、使用流程、优缺点、文化意义。

补充模块可选：结构剖面、材料色卡、工艺步骤、尺寸标注、收藏等级。

如果主题是科技概念：

基础定义、工作原理、结构组成、应用场景、发展阶段、优缺点、风险提醒、未来趋势。

可选内容：流程图、技术路线、关键指标、常见误区。

补充模块可选：流程图、技术栈、应用矩阵、风险等级、未来趋势箭头。

如果主题类型不明确：

自动选择最适合该主题的 8 个信息模块，保持百科图鉴感。

六、可视化模块要求

必须包含至少 5 种可视化元素：

局部放大框

Top 5 或编号清单

快速评分卡或对比条

时间轴或流程图

迷你地图、结构示意、生态分布图、风险等级、季节轮盘中的任意一种

可根据主题类型自动选择最合适的可视化方式：

城市适合迷你地图、时间轴、Top 5、城市结构图。

动物适合生态分布图、食性结构、风险等级、外形标注。

宠物适合评分卡、护理清单、适合人群标签、体型比例图。

植物适合季节轮盘、形态结构、生长条件、养护图标。

人物适合时间线、成就清单、影响力评分、人物关系图。

节日适合时间节点、习俗流程、象征物图鉴、地域差异图。

食物适合原料结构、制作流程、风味雷达、地域流派图。

自然现象适合形成机制图、风险等级、观测条件、影响范围图。

器物适合结构剖面、材料标注、使用流程、工艺细节。

科技概念适合工作原理图、流程图、优缺点对比、应用场景图。

七、文字质量要求

中文简体。

标题和栏目名必须清晰。

正文以短句和标签为主。

避免长段落。

避免极小字号。

避免乱码、伪字、错别字。

不要写空泛宣传语。

不要使用夸张广告口吻。

不要为了填满版面生成无意义文字。

如果文字区域不足，优先压缩句子，不要缩小到不可读。

八、视觉细节

背景浅色，有轻微纸张质感。

模块使用圆角卡片、细边框、轻阴影。

配色柔和但有层次。

小图标精致统一。

编号、标签、箭头、标注线要整洁。

整体像真正可以发布、阅读、收藏、系列化生产的百科图鉴卡。

视觉复杂度要高于普通知识卡，但仍然保持清爽秩序。

九、底部总结

底部放一个总结栏。

写一句简短总结。

控制在 16-24 个中文字符。

语气像百科书页注释，不要像广告口号。

十、禁止的视觉模式（避免 RPG 化）

绝对不要使用：
- 星级评分（★★★★★ 那种）
- 雷达图 / 战力图 / 五维属性图
- HP / 攻击力 / 防御力 / 战力 等数值
- "快速评分卡" / "属性面板" 风格的方块

替代方案：
- 用并列的标签（"高/中/低"或"易/中/难"）
- 用对比条 / 横向比例条（不要数字刻度）
- 用一段引文或事实陈述代替"评分"
- 用地理分布图、历史时间线代替"属性图"

最终效果：

一张完整、清晰、精致、信息丰富、可收藏的竖版科普百科图鉴。

突出「知识整理 + 模块信息 + 图鉴式展示」。
`;
}

// ============================================================================
// v2: file-archived templates
// ============================================================================
//
// Per prompt-template/README.md: "send file content verbatim, do
// not compress, summarize, rewrite, restructure." This function
// reads the files as-is, fills the two variable slots, concatenates
// (main → category), and returns.

function buildPromptV2(topic, kind, kindDisplay) {
  const mainPath = path.join(ROOT, "prompt-template", "main-template.md");
  const categoryPath = path.join(ROOT, "prompt-template", "categories", `${kind}.md`);

  if (!fs.existsSync(mainPath)) {
    throw new Error(`main-template.md not found at ${mainPath}`);
  }
  if (!fs.existsSync(categoryPath)) {
    throw new Error(`Category template not found: ${categoryPath}\n  (kind="${kind}")`);
  }

  let mainTemplate = fs.readFileSync(mainPath, "utf8");
  const categoryTemplate = fs.readFileSync(categoryPath, "utf8");

  // Fill in the two variable slots in main-template.md.
  //
  // Round 28 (2026-06-17): slot format changed. Old archive used
  // Chinese full-width brackets: 主题：【填写主题】. New
  // optimized archive (Round 28 user edit) uses English half-width
  // brackets in slot labels: Theme: [主题] / Category: [分类].
  // Both formats are accepted here so the script survives archive
  // round-trips.
  const OLD_TOPIC_SLOT = "主题：【填写主题】";
  const OLD_TYPE_SLOT = "类型：【城市 / 动物 / 宠物 / 植物 / 人物 / 节日 / 食物 / 历史事件 / 科技概念 / 器物 / 自然现象】";
  const NEW_TOPIC_SLOT = "Theme: [主题]";
  const NEW_TYPE_SLOT = "Category: [分类]";

  const slotTopicFound =
    mainTemplate.includes(OLD_TOPIC_SLOT) || mainTemplate.includes(NEW_TOPIC_SLOT);
  const slotTypeFound =
    mainTemplate.includes(OLD_TYPE_SLOT) || mainTemplate.includes(NEW_TYPE_SLOT);

  if (!slotTopicFound || !slotTypeFound) {
    throw new Error(
      `prompt-template/main-template.md slot placeholder(s) not found.\n` +
        `  topic slot found: ${slotTopicFound} (looking for "${OLD_TOPIC_SLOT}" or "${NEW_TOPIC_SLOT}")\n` +
        `  type slot found:  ${slotTypeFound} (looking for "${OLD_TYPE_SLOT}" or "${NEW_TYPE_SLOT}")\n` +
        `  Update buildPromptV2() to match the new template format.`,
    );
  }

  // Replace whichever format is present. Using global regex so any
  // drift in the literal text still finds a match.
  if (mainTemplate.includes(OLD_TOPIC_SLOT)) {
    mainTemplate = mainTemplate.replace(OLD_TOPIC_SLOT, `主题：【${topic}】`);
  } else {
    mainTemplate = mainTemplate.replace(NEW_TOPIC_SLOT, `Theme: ${topic}`);
  }
  if (mainTemplate.includes(OLD_TYPE_SLOT)) {
    mainTemplate = mainTemplate.replace(OLD_TYPE_SLOT, `类型：【${kindDisplay}】`);
  } else {
    mainTemplate = mainTemplate.replace(NEW_TYPE_SLOT, `Category: ${kindDisplay}`);
  }

  // Belt-and-suspenders: refuse to ship a prompt with placeholders
  // still in it.
  if (
    mainTemplate.includes("【填写主题】") ||
    mainTemplate.includes("【城市 / 动物") ||
    mainTemplate.includes("[主题]") ||
    mainTemplate.includes("[分类]")
  ) {
    throw new Error(
      `prompt-template/main-template.md placeholder(s) survived replacement. Bailing out.`,
    );
  }

  // Concatenate: main first, then category. Category overrides main's
  // generic rules with type-specific (accent color, 8 modules,
  // observation logic, anti-fail rules).
  return mainTemplate.trimEnd() + "\n\n---\n\n" + categoryTemplate.trimEnd() + "\n";
}

// ============================================================================
// Dispatch + output
// ============================================================================

let composed;
let summary;

try {
  if (version === "v1") {
    composed = buildPromptV1(topic);
    summary = {
      version: "v1",
      topic,
      kind,
      kindDisplay,
      mainBytes: null,
      categoryBytes: null,
      composedBytes: composed.length,
    };
  } else {
    composed = buildPromptV2(topic, kind, kindDisplay);
    const mainPath = path.join(ROOT, "prompt-template", "main-template.md");
    const categoryPath = path.join(ROOT, "prompt-template", "categories", `${kind}.md`);
    summary = {
      version: "v2",
      topic,
      kind,
      kindDisplay,
      mainBytes: fs.statSync(mainPath).size,
      categoryBytes: fs.statSync(categoryPath).size,
      composedBytes: composed.length,
    };
  }
} catch (e) {
  console.error(`build-prompt.mjs failed: ${e.message}`);
  process.exit(1);
}

if (outPath) {
  fs.writeFileSync(outPath, composed, "utf8");
  if (!quiet) console.error(`Wrote ${composed.length} chars to ${outPath}`);
} else {
  // Default: print to stdout. Stdout is reserved for the prompt
  // itself; progress messages go to stderr so a caller can pipe
  // `node build-prompt.mjs ... > prompt.md` cleanly.
  process.stdout.write(composed);
}

if (!quiet) {
  console.error(
    `\n--- summary ---\n` +
      `version:    ${summary.version}\n` +
      `topic:      ${summary.topic}\n` +
      `kind:       ${summary.kind} (${summary.kindDisplay})\n` +
      (summary.mainBytes !== null
        ? `main:       ${summary.mainBytes} bytes\n` +
          `category:   ${summary.categoryBytes} bytes\n`
        : `template:   inline (v1)\n`) +
      `composed:   ${summary.composedBytes} bytes (${outPath ?? "<stdout>"})\n`,
  );
}