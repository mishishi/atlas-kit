import Link from "next/link";
import { Mail, FileText, Rss, Code2 } from "lucide-react";

// lucide-react 0.469+ exports "Github" but the installed version may not.
// Use Code2 (a generic code icon) as a safe fallback — visually similar.
const Github = Code2;

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
                  href="https://github.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-sm hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Github className="h-3 w-3" aria-hidden="true" />
                  GitHub 仓库
                  <span className="sr-only">(在新窗口打开)</span>
                </a>
              </li>
              <li>
                <a
                  href="mailto:hello@atlas-kit.example"
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
          <p className="font-serif italic">知识整理 · 模块信息 · 图鉴式展示</p>
        </div>
      </div>
    </footer>
  );
}
