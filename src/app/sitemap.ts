import type { MetadataRoute } from "next";
import { getAllCards, getAllSeries } from "@/lib/data";

// R66+R67 (2026-07-01): was `force-static` which captures cards.json
// at build time. With Vercel Hobby build queue sometimes sticky-stuck
// on a stale build (sitemap lastmod frozen at 6/19 while new cards
// ship), force-static makes the sitemap wrong. force-dynamic reads
// cards.json at request time, so sitemap always reflects the current
// 712+ cards. Edge runtime runs the function per request — sitemap.xml
// generation is <50ms for 700 cards.
export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/series`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/cards`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    // Round 27 (2026-06-17): 4 missing static pages added. These
    // are all SSG so they're as cheap to index as /series and /cards.
    { url: `${base}/timeline`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/map`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/all`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    // R37 Plan 3 (2026-06-18): /graph — image-first knowledge graph.
    // 600 nodes / ~3000 edges / 1 page, static. Same shape as /all.
    { url: `${base}/graph`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/changelog`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/create`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/search`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  const seriesRoutes: MetadataRoute.Sitemap = getAllSeries().map((s) => ({
    url: `${base}/series/${s.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const cardRoutes: MetadataRoute.Sitemap = getAllCards().map((c) => ({
    url: `${base}/cards/${c.slug}`,
    // Per-card lastModified = the card's own createdAt, so sitemap
    // tells crawlers "this card was last touched at the time it was
    // generated, not at the time the build ran". More accurate
    // change signals = better crawl prioritization.
    lastModified: new Date(c.createdAt),
    changeFrequency: "monthly" as const,
    priority: 0.5,
    // Sitemap extension (xmlns:image) — surfaces images in Google
    // Image Search. Next 14 serializes sitemap as XML with the image
    // namespace when entries include `images: [...]`. image_thumb is
    // 384w WebP — small enough for image-search snippets to render.
    images: c.image_thumb
      ? [{ url: c.image_thumb.startsWith("http") ? c.image_thumb : `${base}${c.image_thumb}` }]
      : [],
  }));

  return [...staticRoutes, ...seriesRoutes, ...cardRoutes];
}
