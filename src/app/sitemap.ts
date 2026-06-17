import type { MetadataRoute } from "next";
import { getAllCards, getAllSeries } from "@/lib/data";

export const dynamic = "force-static";

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
  }));

  return [...staticRoutes, ...seriesRoutes, ...cardRoutes];
}
