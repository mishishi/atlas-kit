import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background mt-20">
      <div className="container py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-gold to-gold-deep text-cream">
                <span className="font-serif text-base font-bold">A</span>
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-serif text-sm font-semibold">图鉴社</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Atlas Kit</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              系列化中文科普图鉴卡片集。<br />
              博物图鉴质感 · 模块化信息结构 · 可收藏。
            </p>
          </div>

          <div>
            <h4 className="font-serif text-sm font-semibold mb-3">浏览</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link
                  href="/"
                  className="inline-flex min-h-[44px] items-center rounded-sm hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  首页
                </Link>
              </li>
              <li>
                <Link
                  href="/series"
                  className="inline-flex min-h-[44px] items-center rounded-sm hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  所有系列
                </Link>
              </li>
              <li>
                <Link
                  href="/search"
                  className="inline-flex min-h-[44px] items-center rounded-sm hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  搜索图鉴
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif text-sm font-semibold mb-3">创作</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link
                  href="/create"
                  className="inline-flex min-h-[44px] items-center rounded-sm hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  AI 生成图鉴
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row justify-between gap-2 text-xs text-muted-foreground">
          <p>© 2026 图鉴社 · Atlas Kit. 保留所有权利。</p>
          <p className="font-serif italic">知识整理 · 模块信息 · 图鉴式展示</p>
        </div>
      </div>
    </footer>
  );
}