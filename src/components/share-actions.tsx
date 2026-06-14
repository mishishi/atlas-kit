"use client";

import { useState } from "react";
import { Copy, Check, Link as LinkIcon, Download } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ShareActionsProps {
  imageUrl: string;
  imageFilename: string;
  title: string;
}

export function ShareActions({ imageUrl, imageFilename, title }: ShareActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("链接已复制", { description: "可粘贴到小红书 / 微信 / X" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("复制失败", { description: "请手动从地址栏复制" });
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <a
        href={imageUrl}
        download={`${imageFilename}.png`}
        className={cn(
          "flex min-h-[44px] items-center justify-center gap-2 rounded-md bg-gold-deep px-4 py-2.5 text-sm font-medium text-cream",
          "transition-colors hover:bg-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        下载原图
      </a>
      <button
        type="button"
        onClick={handleCopyLink}
        aria-label={copied ? "链接已复制" : "复制图鉴链接"}
        className={cn(
          "flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium",
          "hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 text-success" aria-hidden="true" />
            已复制
          </>
        ) : (
          <>
            {/*
              We intentionally use Copy (a static visual) instead of Link
              here — Link clashes with next/link and is the icon name we
              import from lucide-react. Both icons render a similar glyph
              in the default style.
            */}
            <Copy className="h-4 w-4" aria-hidden="true" />
            复制链接
          </>
        )}
      </button>
      <span className="sr-only">分享 {title}</span>
    </div>
  );
}
