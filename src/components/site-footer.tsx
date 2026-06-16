import Link from "next/link";
import { Mail, FileText, Rss } from "lucide-react";

/**
 * Inline GitHub mark — uses the official brand path so we don't
 * depend on a particular lucide-react version shipping `Github`.
 * Sized via the parent (h-3 w-3) so callers can adjust without
 * re-importing.
 */
function GithubMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.13c-3.2.7-3.87-1.36-3.87-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.73-1.52-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.95 10.95 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.43-2.7 5.41-5.27 5.69.41.36.78 1.06.78 2.13v3.16c0 .31.21.67.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background mt-20">
      <div className="container py-10">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand block */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="grid h-7 w-7 place-items-center rounded-md bg-gold-deep text-cream">
                <span className="font-serif text-base font-bold" aria-hidden="true">A</span>
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

          {/* Browse */}
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
                  href="/cards"
                  className="inline-flex min-h-[44px] items-center rounded-sm hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  全部图鉴
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
              <li>
                <Link
                  href="/changelog"
                  className="inline-flex min-h-[44px] items-center rounded-sm hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  更新日志
                </Link>
              </li>
            </ul>
          </div>

          {/* Create */}
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
              <li>
                <Link
                  href="/sitemap.xml"
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-sm hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Rss className="h-3 w-3" aria-hidden="true" />
                  网站地图
                </Link>
              </li>
            </ul>
          </div>

          {/* Info — new column */}
          <div>
            <h4 className="font-serif text-sm font-semibold mb-3">信息</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link
                  href="/about"
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-sm hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <FileText className="h-3 w-3" aria-hidden="true" />
                  关于项目
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/mishishi/atlas-kit"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-sm hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <GithubMark className="h-3 w-3" />
                  GitHub 仓库
                  <span className="sr-only">(在新窗口打开)</span>
                </a>
              </li>
              <li>
                <a
                  // Round 20 fix: read env so the production footer uses
                  // the same email as the per-card errata link. Previously
                  // hard-coded `hello@atlas-kit.example` (a `.example`
                  // reserved TLD that never delivers) and didn't match the
                  // detail page's `NEXT_PUBLIC_SITE_AUTHOR_EMAIL` lookup.
                  href={`mailto:${process.env.NEXT_PUBLIC_SITE_AUTHOR_EMAIL ?? "atlas-kit@example.com"}`}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-sm hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Mail className="h-3 w-3" aria-hidden="true" />
                  反馈 & 建议
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row justify-between gap-2 text-xs text-muted-foreground">
          <p>© 2026 图鉴社 · Atlas Kit. 保留所有权利。</p>
          <p className="font-serif italic">知识整理 · 信息归档 · 图鉴式展示</p>
        </div>
      </div>
    </footer>
  );
}
