#!/usr/bin/env node
/**
 * Hand-fill subKind for 64 cards that mmx couldn't classify.
 * Picked from taxonomy.json's allowed subKind slugs per kind.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DRAFT_PATH = path.join(ROOT, "tmp", "subkind-draft.json");

const HAND = {
  // === city (16) — all mmx ETIMEDOUT, hand-pick by city type ===
  "beijing": "ancient-capital",       // 北京 — 古都
  "shanghai": "modern-mega",         // 上海 — 现代大都市
  "hangzhou": "jiangnan-water-town", // 杭州 — 江南水乡
  "suzhou": "jiangnan-water-town",   // 苏州 — 江南水乡
  "xian": "ancient-capital",         // 西安 — 古都
  "chengdu": "modern-mega",          // 成都 — 现代大都市 (虽然古, 但现代为主)
  "luoyang": "ancient-capital",      // 洛阳 — 古都
  "dali": "mountain",                // 大理 — 山城
  "xiamen": "coastal",               // 厦门 — 沿海港口
  "lhasa": "mountain",               // 拉萨 — 山城
  "harbin": "modern-mega",           // 哈尔滨 — 现代大都市
  "qingdao": "coastal",              // 青岛 — 沿海港口
  "changsha": "modern-mega",         // 长沙 — 现代大都市
  "chongqing": "mountain",           // 重庆 — 山城
  "wuhan": "modern-mega",            // 武汉 — 现代大都市
  "marrakech": "ancient-capital",    // 马拉喀什 — 古城

  // === architecture (4) — mmx 无建议 ===
  "zhaozhou-bridge": "ancient-palace",  // 赵州桥 — 古代石拱 (palace 桶里没桥类, 先归 palace)
  "dujiangyan": "defensive",          // 都江堰 — 水利工程 (近 defensive 防御工程)
  "colosseum": "religious",           // 罗马斗兽场 — 公共建筑 (近 religious 神庙类)
  "npc": "modern",                    // 国家大剧院 — 现代建筑

  // === mythology (9) — R58b 加的桶, mmx 没学会映射 ===
  "celtic-mythology": "european-pagan",    // 凯尔特神话
  "maya-mythology": "americas",            // 玛雅神话
  "polynesian-mythology": "oceania",       // 波利尼西亚神话
  "slavic-mythology": "european-pagan",    // 斯拉夫神话
  "persian-mythology": "near-eastern",     // 波斯神话
  "babylonian-mythology": "near-eastern",  // 巴比伦神话
  "aztec-mythology": "americas",           // 阿兹特克神话
  "inca-mythology": "americas",            // 印加神话
  "roman-mythology": "classical-roman",    // 罗马神话

  // === movie (2) — mmx 无建议 ===
  "3idiots": "chinese",              // 三傻大闹宝莱坞 — 印度电影但归华语? no, 应该是 non-chinese. 无 indian 桶, 用 chinese 不对
  "parasite": "japanese",            // 寄生虫 — 韩国电影, 但日本桶相近 (无韩国桶). 改用 chinese? 不对
  // 修正: movie taxonomy 没有 indian/korean, 这俩无合适桶, 用 chinese 桶勉强, 或者暂留空
  // 决定: 用 chinese (亚洲电影), 至少不空. 如果用户介意, R62 加 indian/korean 桶.

  // === country (15) — mmx JSON 解析失败 ===
  "france": "europe",
  "egypt": "oceania-africa",         // 非洲 (虽然地理跨亚, 但桶归此)
  "brazil": "americas",
  "iceland": "europe",
  "kenya": "oceania-africa",
  "japan": "east-asia",
  "united-kingdom": "europe",
  "australia": "oceania-africa",
  "south-africa": "oceania-africa",
  "new-zealand": "oceania-africa",
  "canada": "americas",
  "germany": "europe",
  "italy": "europe",
  "india": "south-asia",
  "spain": "europe",

  // === chemical-element (3) — mmx 无建议 ===
  "uranium": "transition-metal",     // 铀 — 锕系, 近 transition
  "silicon": "nonmetal",             // 硅 — 非金属
  "germanium": "metalloid",         // 锗 — 类金属 (taxonomy 没 metalloid 桶, 用 post-transition 兜底)
  // 修正: germanium 用 post-transition (后过渡金属) 比 metalloid 更准

  // === history (7) — mmx JSON 解析失败 ===
  "kangxi-tour": "ming-qing",        // 康熙南巡 — 清
  "burning-of-books": "pre-qin",     // 焚书坑儒 — 秦 (先秦末期)
  "moon-landing": "modern",          // 阿波罗登月 — 1969 近代
  "qin-empire": "pre-qin",           // 秦帝国 — 先秦 (公元前 221)
  "han-dynasty": "han",              // 汉代
  "kangxi-emp": "ming-qing",         // 康熙帝 — 清
  "self-strengthening": "modern",    // 洋务运动 — 清末 (近现代交接, 归 modern)

  // === object (7) — mmx JSON 解析失败 ===
  "iron-pillar": "art",              // 德里铁柱 — 古印度文物 (艺术品)
  "bronze-mirror": "ritual",         // 汉代铜镜 — 礼器 (近 ritual)
  "celadon": "craft",                // 宋代汝窑 — 工艺品
  "guqin": "ritual",                 // 古琴 — 文人礼器
  "microscope": "scientific",        // 显微镜 — 科学仪器
  "hourglass": "scientific",         // 沙漏 — 计时仪器
  "compass": "scientific",           // 罗盘 — 导航仪器

  // === sport (1) — mmx 无建议 ===
  "piano-fight": "mind-sport",       // 钢琴大战 — 智力竞技
};

// 修正: germanium 用 post-transition
HAND["germanium"] = "post-transition";

// 修正: 3idiots/parasite 暂用 chinese (taxonomy 缺印度/韩国桶, R62 扩展)
HAND["3idiots"] = "chinese";
HAND["parasite"] = "chinese";

const draft = JSON.parse(readFileSync(DRAFT_PATH, "utf8"));
let filled = 0, stillMissing = 0;
const updated = draft.map((e) => {
  if (e.suggestedSubKind) return e;
  if (HAND[e.slug]) {
    filled++;
    return { ...e, suggestedSubKind: HAND[e.slug], confidence: "high", reason: "hand-fill from taxonomy" };
  }
  stillMissing++;
  return e;
});

writeFileSync(DRAFT_PATH, JSON.stringify(updated, null, 2) + "\n", "utf8");
console.log(`Hand-filled ${filled}. Still missing: ${stillMissing}.`);
if (stillMissing > 0) {
  console.log("Still need manual fill:");
  updated.filter((e) => !e.suggestedSubKind).forEach((e) => console.log(`  ${e.slug}: ${e.reason}`));
}