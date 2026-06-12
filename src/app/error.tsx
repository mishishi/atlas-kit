"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Compass, Home, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[RouteError]", error);
  }, [error]);

  return (
    <div className="container py-section min-h-[60vh]">
      <div className="mx-auto max-w-xl text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-destructive bg-destructive/5">
          <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden="true" />
        </div>

        <div className="mb-2 text-xs uppercase tracking-[0.2em] text-destructive">
          ERROR
        </div>
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-3">
          这一页出了点问题
        </h1>
        <p className="text-muted-foreground leading-relaxed mb-3">
          页面遇到了一个意外错误。重试一下, 或者回到首页继续浏览图鉴。
        </p>
        {error.digest && (
          <p className="text-xs font-mono text-muted-foreground mb-2">
            错误 ID: {error.digest}
          </p>
        )}
        {process.env.NODE_ENV === "development" && error.message && (
          <details className="mb-8 text-left rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs">
            <summary className="cursor-pointer font-medium text-destructive">
              调试信息 (仅 dev)
            </summary>
            <pre className="mt-2 whitespace-pre-wrap break-all font-mono text-[11px] text-muted-foreground">
              {error.message}
              {error.stack ? `\n\n${error.stack}` : ""}
            </pre>
          </details>
        )}

        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-gold-deep px-5 py-2.5 text-sm font-medium text-cream shadow-card transition-all hover:bg-gold hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            重试
          </button>
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            回到首页
          </Link>
          <Link
            href="/series"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
          >
            <Compass className="h-4 w-4" aria-hidden="true" />
            浏览系列
          </Link>
        </div>
      </div>
    </div>
  );
}
