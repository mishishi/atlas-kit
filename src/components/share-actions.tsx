"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Check, Link as LinkIcon, Download, FileText } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ShareActionsProps {
  imageUrl: string;
  imageFilename: string;
  title: string;
}

export function ShareActions({ imageUrl, imageFilename, title }: ShareActionsProps) {
  const [copied, setCopied] = useState(false);
  // Round 21 fix: track mount state so the post-copy setTimeout can't
  // fire setState after the user navigates away (same pattern as
  // Round 19's Lightbox onLoad guard — React 18 silent no-ops but
  // logs a console warning, which pollutes dev experience).
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleCopyLink = async () => {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("链接已复制", { description: "可粘贴到小红书 / 微信 / X" });
      setTimeout(() => {
        if (mountedRef.current) setCopied(false);
      }, 2000);
    } catch {
      toast.error("复制失败", { description: "请手动从地址栏复制" });
    }
  };

  return (
    <div role="group" aria-label={`分享 ${title}`} className="grid grid-cols-3 gap-2">
      <a
        href={imageUrl}
        download={`${imageFilename}.webp`}
        className={cn(
          "flex min-h-[44px] items-center justify-center gap-1.5 rounded-md bg-gold-deep px-2 py-2.5 text-xs sm:text-sm font-medium text-cream",
          "transition-colors hover:bg-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
        title="下载 1024w 原图 (WebP)"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">下载原图</span>
        <span className="sm:hidden">图</span>
      </a>
      {/* PDF 导出 = Cmd+P 路径. 跳到 /print/cards/[slug], 那个页面会自动
          触发 window.print(), 用户的浏览器 "保存为 PDF" 就是最终产物.
          比 Puppeteer / jsPDF 之类的服务端方案轻 100x. */}
      <Link
        href={`/print/cards/${imageFilename}`}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex min-h-[44px] items-center justify-center gap-1.5 rounded-md border border-border bg-card px-2 py-2.5 text-xs sm:text-sm font-medium",
          "hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
        title="在打印版页面保存为 PDF"
      >
        <FileText className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">保存 PDF</span>
        <span className="sm:hidden">PDF</span>
      </Link>
      <button
        type="button"
        onClick={handleCopyLink}
        aria-label={copied ? "链接已复制" : "复制图鉴链接"}
        className={cn(
          "flex min-h-[44px] items-center justify-center gap-1.5 rounded-md border border-border bg-card px-2 py-2.5 text-xs sm:text-sm font-medium",
          "hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 text-success" aria-hidden="true" />
            <span className="hidden sm:inline">已复制</span>
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">复制链接</span>
            <span className="sm:hidden">链接</span>
          </>
        )}
      </button>
    </div>
  );
}
