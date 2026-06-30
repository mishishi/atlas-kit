#!/usr/bin/env node
/**
 * Hand-fill subKind for the 30 remaining cards that mmx couldn't classify:
 * anime (8), tech (11), music (11). All picked from taxonomy.json's allowed
 * subKind slugs per kind.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CARDS_PATH = path.join(ROOT, "data", "cards.json");
const TAX_PATH = path.join(ROOT, "data", "taxonomy.json");

const HAND = {
  // === anime (8) ===
  "sailor-moon": "shoujo",            // 美少女战士 — 少女漫画改
  "cardcaptor-sakura": "shoujo",      // 魔卡少女樱 — 少女漫画改
  "fruits-basket": "shoujo",          // 水果篮子 — 少女漫画改
  "gundam": "mecha",                  // 高达 — 机甲
  "ouran-highschool": "shoujo",       // 樱兰 — 少女向校园喜剧
  "evangelion": "mecha",              // EVA — 机甲
  "macross": "mecha",                 // 超时空要塞 — 机甲+音乐
  "code-geass": "mecha",              // Code Geass — 机甲+科幻

  // === tech (11) ===
  "alipay": "information",            // 支付宝 — 移动支付 (信息技术)
  "wechat": "information",            // 微信 — 社交通讯
  "iphone": "information",            // iPhone — 消费电子 (信息技术)
  "linux": "information",             // Linux — 操作系统
  "rosetta": "transport",             // 罗塞塔号 — 太空探测器 (transport 涵盖航天)
  "voyager": "transport",             // 旅行者号 — 太空探测器
  "shenzhou": "transport",            // 神舟 — 载人飞船
  "crispr": "biomedical",             // CRISPR — 基因编辑
  "lab-on-a-chip": "biomedical",      // 微流控芯片 — 生物医学
  "tesla-coil": "energy",             // 特斯拉线圈 — 高压电 (归 energy 桶)
  "mrna-vaccine": "biomedical",       // mRNA 疫苗

  // === music (11) ===
  "bach": "western-classic",          // 巴赫 — 西方古典
  "mozart": "western-classic",        // 莫扎特 — 西方古典
  "chopin": "western-classic",        // 肖邦 — 西方古典
  "tchaikovsky": "western-classic",   // 柴可夫斯基 — 西方古典
  "beyond": "chinese-rock",           // Beyond — 华语摇滚
  "magic-stone": "chinese-rock",      // 魔岩三杰 — 中国摇滚
  "utada-hikaru": "japanese",         // 宇多田光 — 日本流行
  "x-japan": "japanese",              // X Japan — 日本摇滚 (归 japanese 桶)
  "bts": "western-modern",            // 防弹少年团 — K-pop (taxonomy 缺 korean 桶, 归 western-modern 兜底)
  "taylor-swift": "western-modern",   // 泰勒·斯威夫特 — 西方现代
  "ed-sheeran": "western-modern",     // 艾德·希兰 — 西方现代
};

const cards = JSON.parse(readFileSync(CARDS_PATH, "utf8"));
const taxonomy = JSON.parse(readFileSync(TAX_PATH, "utf8")).kinds;

let applied = 0, skipped = 0;
const bySlug = new Map(cards.map((c) => [c.slug, c]));

for (const [slug, subKind] of Object.entries(HAND)) {
  const card = bySlug.get(slug);
  if (!card) { console.error(`MISSING CARD: ${slug}`); skipped++; continue; }
  if (card.subKind) { console.log(`ALREADY HAS: ${slug} = ${card.subKind}`); skipped++; continue; }
  const valid = taxonomy[card.kind]?.subKinds.some((s) => s.slug === subKind);
  if (!valid) {
    console.error(`INVALID: ${slug} → ${subKind} (not in ${card.kind} taxonomy)`);
    skipped++;
    continue;
  }
  card.subKind = subKind;
  applied++;
  console.log(`OK: ${slug} → ${subKind}`);
}

writeFileSync(CARDS_PATH, JSON.stringify(cards, null, 2) + "\n", "utf8");
console.log(`Applied ${applied}, skipped ${skipped}.`);

const noSubKind = cards.filter((c) => !c.subKind);
console.log(`Remaining no-subKind: ${noSubKind.length}`);
noSubKind.forEach((c) => console.log(`  ${c.slug} | ${c.kind}`));