"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Search, Home, Sparkles, ArrowLeft } from "lucide-react";
import { CardGrid } from "@/components/card-grid";
import { getDiverseFeatured } from "@/lib/data";

export default function NotFound() {
  const pathname = usePathname() ?? "";
  // Path-aware CTAs: if user came looking for a specific card or series,
  // surface the right "go back" entry point.
  const isCardPath = pathname.startsWith("/cards/");
  const isSeriesPath = pathname.startsWith("/series/");
  // 6 featured cards from across kinds — gives the user a real
  // "what to look at instead" anchor instead of just navigation
  // buttons. (Diverse 12-kind mix prevents the section from
  // looking like an ad for one series. Up from 4 in Round 8 to
  // give the 404 page more visual weight as a "recovery surface".)
  const featured = getDiverseFeatured(6);

  return (
    <div className="container py-section min-h-[60vh]">
      <div className="mx-auto max-w-xl text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-gold bg-gold/5">
          <Compass className="h-10 w-10 text-gold-deep" aria-hidden="true" />
        </div>

        <div className="mb-2 text-xs uppercase tracking-[0.2em] text-gold-deep">404 · NOT FOUND</div>
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-3">这片图鉴似乎走丢了</h1>
        <p className="text-muted-foreground leading-relaxed mb-8">
          {isCardPath
            ? "这张图鉴可能还没有收录, 或者链接拼写有误。"
            : isSeriesPath
              ? "这个系列可能还在筹备中, 或名称已经更新。"
              : "你要找的页面、图鉴或系列可能已经下架, 或链接拼写有误。"}
          试试下面这些入口:
        </p>

        <nav aria-label="找不到页面时的备选入口" className="flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-gold-deep px-5 py-2.5 text-sm font-medium text-cream shadow-card transition-all hover:bg-gold hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            回到首页
          </Link>
          {isCardPath ? (
            <Link
              href="/cards"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              返回图鉴列表
            </Link>
          ) : isSeriesPath ? (
            <Link
              href="/series"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              返回系列列表
            </Link>
          ) : (
            <Link
              href="/series"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
            >
              <Compass className="h-4 w-4" aria-hidden="true" />
              浏览所有系列
            </Link>
          )}
          <Link
            href="/create"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            生成一张新的
          </Link>
          <Link
            href="/search"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            搜索图鉴
          </Link>
        </nav>
      </div>

      {/* Featured cards — give users a real next destination
          instead of just nav links. Diverse across kinds so we
          don't bias toward one series. The CardGrid component
          already uses 384w WebP thumbs so this section is
          cheap on first paint. */}
      <section className="mt-16" aria-labelledby="featured-on-404">
        <h2
          id="featured-on-404"
          className="font-serif text-lg font-semibold mb-6 text-center text-muted-foreground"
        >
          或者看看这些
        </h2>
        <CardGrid cards={featured} cols="lg:grid-cols-3 xl:grid-cols-6" />

        {/* Quick "explore a topic" links — 6 popular Chinese tags
            surfaced as tag pills, giving users a 1-click way to
            find related content without using the search input. */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
            热门话题
          </span>
          {["中国", "古代", "江南", "城市", "植物", "美食"].map((tag) => (
            <Link
              key={tag}
              href={`/cards?tag=${encodeURIComponent(tag)}`}
              className="inline-flex min-h-[44px] items-center rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
            >
              #{tag}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
