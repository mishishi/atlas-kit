/**
 * R52 (2026-06-22): /favorites — localStorage-backed personal collection.
 *
 * Server component shell: fetches all cards (so the client island
 * can filter + sort), renders the page chrome + the FavoritesList
 * client island. SEO content is minimal here (favorites are
 * per-user, not site-wide) — only the page title + intro line
 * matter for crawlers.
 */

import type { Metadata } from "next";
import { getAllCards } from "@/lib/data";
import { FavoritesList } from "@/components/favorites-list";

export const metadata: Metadata = {
  title: "收藏夹 · 图鉴社",
  description: "你在图鉴社收藏的图鉴。仅保存在本地浏览器,清缓存会丢,记得定期备份。",
};

export default function FavoritesPage() {
  const allCards = getAllCards();
  return (
    <main id="main" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2">
          收藏夹
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          点星标保存喜欢的图鉴。这里只显示你的收藏,不影响其他人,数据存在浏览器本地。
        </p>
      </div>
      <FavoritesList allCards={allCards} />
    </main>
  );
}