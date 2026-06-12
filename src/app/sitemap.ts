import type { MetadataRoute } from "next";
import { getAllCards, getAllSeries } from "@/lib/data";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "http://localhost:3000"; // Production: replace with real domain
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/series`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/cards`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
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
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [...staticRoutes, ...seriesRoutes, ...cardRoutes];
}
