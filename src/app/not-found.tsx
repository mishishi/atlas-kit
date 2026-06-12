import Link from "next/link";
import { Compass, Search, Home } from "lucide-react";

export const metadata = {
  title: "找不到图鉴 · 图鉴社",
};

export default function NotFound() {
  return (
    <div className="container py-section min-h-[60vh]">
      <div className="mx-auto max-w-xl text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-gold bg-gold/5">
          <Compass className="h-10 w-10 text-gold-deep" aria-hidden="true" />
        </div>

        <div className="mb-2 text-xs uppercase tracking-[0.2em] text-gold-deep">404 · NOT FOUND</div>
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-3">这片图鉴似乎走丢了</h1>
        <p className="text-muted-foreground leading-relaxed mb-8">
          你要找的页面、图鉴或系列可能已经下架, 或链接拼写有误。
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
          <Link
            href="/series"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
          >
            <Compass className="h-4 w-4" aria-hidden="true" />
            浏览所有系列
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
    </div>
  );
}
