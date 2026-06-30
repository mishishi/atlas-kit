/**
 * L (2026-06-30): RSS feed for /changelog.
 *
 * Returns the 50 most recent changelog entries (created + revised
 * + milestone) as an RSS 2.0 XML document. Built fresh on every
 * request — cards.json is small (600 entries, < 1 MB) so the
 * scan-and-sort cost is negligible compared to a 5s cold start
 * from disk cache.
 *
 * Why 50 not 20: 50 covers ~2 weeks of recent activity at our
 * current pace (R60+ added 35 cards in a single day). Readers
 * subscribing want enough history to not feel like they're
 * starting from nothing.
 *
 * Why a route file, not getStaticProps: RSS consumers expect
 * Cache-Control: max-age=...; the dynamic route lets the edge
 * cache it for 1 hour (set in headers below). The /changelog
 * page itself is static; the feed is the dynamic counterpart.
 *
 * URL: /feed.xml (or /rss.xml — both are configured in
 * SiteHeader's RSS pill as `/feed.xml`).
 */

import { getAllCards } from "@/lib/data";

const SITE_TITLE = "图鉴社 Atlas Kit";
const SITE_DESCRIPTION = "图鉴社 600 张图鉴的更新日志";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://atlas-kit-six.vercel.app";

interface FeedItem {
  date: string; // ISO 8601
  title: string;
  url: string;
  description: string;
  category: "created" | "revised" | "milestone";
}

interface Milestone {
  date: string;
  slug: string;
  type: "milestone";
  title: string;
  body: string;
}

const SITE_MILESTONES: Milestone[] = [
  {
    date: "2026-06-30T00:00:00Z",
    slug: "milestone-600-cards",
    type: "milestone",
    title: "图鉴扩到 600 张",
    body: "R60+35 完成, 600 张图鉴, 12 个系列, 26 个分类, 113 个二级分类。",
  },
  {
    date: "2026-06-16T00:00:00Z",
    slug: "milestone-roadmap",
    type: "milestone",
    title: "百科化升级 (6 项 roadmap 完成)",
    body: "反链/历史/地图/勘误/random/sources 6 个核心模块全部上线。",
  },
  {
    date: "2026-06-13T00:00:00Z",
    slug: "milestone-60-cards",
    type: "milestone",
    title: "图鉴扩到 60 张",
    body: "R8 5 series × 12 cards 全集, MVP 完整形态。",
  },
  {
    date: "2026-06-12T00:00:00Z",
    slug: "milestone-mvp",
    type: "milestone",
    title: "MVP 上线",
    body: "图鉴社首版上线, 12 张占位图鉴 + 1 个 series。",
  },
];

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const allCards = getAllCards();
  const items: FeedItem[] = [];

  // 1. Card created events
  for (const c of allCards) {
    if (!c.createdAt) continue;
    items.push({
      date: c.createdAt.length === 10 ? `${c.createdAt}T00:00:00Z` : c.createdAt,
      title: `新收录「${c.title}」`,
      url: `${SITE_URL}/cards/${c.slug}`,
      description: c.tagline ?? c.subtitle ?? "",
      category: "created",
    });
  }

  // 2. Card revised events
  for (const c of allCards) {
    if (!c.revisions) continue;
    for (const r of c.revisions) {
      items.push({
        date: r.date,
        title: `修订「${c.title}」`,
        url: `${SITE_URL}/cards/${c.slug}`,
        description: r.summary,
        category: "revised",
      });
    }
  }

  // 3. Site milestones
  for (const m of SITE_MILESTONES) {
    items.push({
      date: m.date,
      title: m.title,
      url: `${SITE_URL}/about`,
      description: m.body,
      category: "milestone",
    });
  }

  // Sort newest first, cap at 50
  items.sort((a, b) => b.date.localeCompare(a.date));
  const recent = items.slice(0, 50);

  const lastBuildDate = recent[0]?.date ?? new Date().toISOString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_TITLE)} · 更新日志</title>
    <link>${escapeXml(SITE_URL)}/changelog</link>
    <atom:link href="${escapeXml(SITE_URL)}/feed.xml" rel="self" type="application/rss+xml" />
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>zh-cn</language>
    <lastBuildDate>${escapeXml(lastBuildDate)}</lastBuildDate>
    <generator>Atlas Kit feed builder</generator>
${recent
  .map(
    (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.url)}</link>
      <guid isPermaLink="true">${escapeXml(item.url)}#${item.date}</guid>
      <pubDate>${escapeXml(new Date(item.date).toUTCString())}</pubDate>
      <description>${escapeXml(item.description)}</description>
      <category>${item.category}</category>
    </item>`,
  )
  .join("\n")}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}