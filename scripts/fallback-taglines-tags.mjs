#!/usr/bin/env node
/**
 * Fallback: programmatically fill tagline + tags using existing card data.
 * Used when mmx hangs / fails on the fix-taglines-tags.mjs script.
 *
 * - tagline: derive from first sentence of description (or fall back to subtitle).
 * - tags: pull from (a) existing tags, (b) cross-cutting from subKind/series/region,
 *   (c) generic fills for empties.
 *
 * Output is mechanical (no LLM), so less poetic than mmx, but consistent
 * and never fails.
 */
import fs from "node:fs";
import path from "node:path";

const cardsPath = path.resolve("data/cards.json");
const cards = JSON.parse(fs.readFileSync(cardsPath, "utf8"));

// Cross-cutting taxonomy tags that should always be present if applicable.
const REGION_TAGS = new Set(["中国", "日本", "印度", "韩国", "东南亚", "欧洲", "美洲", "非洲", "中东", "海洋", "全球", "东亚", "西亚", "南亚", "北欧", "南欧", "东欧", "北美", "南美", "中亚"]);
const ERA_TAGS = new Set(["古代", "近代", "现代", "当代", "先秦", "汉代", "唐宋", "明清", "史前"]);
const THEME_TAGS = new Set(["哺乳", "鸟类", "鱼", "昆虫", "植物", "矿石", "化学", "物理", "数学", "医学", "工程", "艺术", "音乐", "文学", "历史", "地理", "政治", "商业", "体育", "哲学", "宗教", "教育", "工艺", "科学", "流行", "民俗", "文化", "自然", "建筑", "绘画", "雕塑", "戏剧", "舞蹈", "电影", "摄影", "天文", "气象", "地质", "生态"]);

// Series → region hints (rough heuristic for filling region tag if missing)
const SERIES_REGION = {
  "pet-breed-guide": ["全球"],
  "wild-fauna-atlas": ["自然"],
  "city-encyclopedia": ["城市"],
  "festival-almanac": ["文化"],
  "atlas-miscellany": [],
};

function pickTagline(c) {
  // Use description's first sentence (split on 。 or . or ！ or ？)
  const desc = c.description || "";
  if (desc.length > 10) {
    const m = desc.match(/^[^。.！？」』]+/);
    if (m && m[0].length >= 8 && m[0].length <= 40) return m[0] + "。";
  }
  // Fallback to subtitle
  if (c.subtitle && c.subtitle.length > 4 && !c.subtitle.includes("百科占位")) {
    return c.subtitle.split(/[,,、]/)[0].trim() + "的图鉴。";
  }
  // Last resort
  return `${c.title} · 图鉴社收录。`;
}

function inferCrossTags(c) {
  const tags = new Set(c.tags || []);
  // 1. Existing tags: keep all
  // 2. From subKind label
  if (c.subKind) {
    // SubKind might map to theme; we don't have a mapping table, skip
  }
  // 3. From series
  const seriesHints = SERIES_REGION[c.series] || [];
  seriesHints.forEach((t) => tags.add(t));
  // 4. Add global-anchor tags for empties
  if (tags.size < 4) {
    ["全球", "图鉴社", "百科"].forEach((t) => tags.add(t));
  }
  // 5. Cap at 8
  return [...tags].slice(0, 8);
}

let tagFixed = 0, tagsFixed = 0;
for (const c of cards) {
  if (!c.tagline || c.tagline.trim().length < 5) {
    c.tagline = pickTagline(c);
    tagFixed++;
  }
  if (!c.tags || c.tags.length < 4) {
    c.tags = inferCrossTags(c);
    tagsFixed++;
  }
}

fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + "\n", "utf8");
console.log(`tagline fixed: ${tagFixed}, tags fixed: ${tagsFixed}`);

// Audit
const noTagline = cards.filter((c) => !c.tagline).length;
const shortTags = cards.filter((c) => !c.tags || c.tags.length < 4).length;
console.log(`Remaining: no-tagline=${noTagline} tags<4=${shortTags}`);