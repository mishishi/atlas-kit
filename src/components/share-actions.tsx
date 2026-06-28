"use client";

import { useEffect, useRef, useState } from "react";
import {
  Copy,
  Check,
  Download,
  FileText,
  X,
  MessageCircle,
  X as CloseIcon,
} from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Card } from "@/lib/types";
import { ShareCardButton } from "@/components/share-card-button";

interface ShareActionsProps {
  imageUrl: string;
  imageFilename: string;
  title: string;
  card: Card;
}

/**
 * R60 (2026-06-28): 6-button share toolbar.
 *
 * Row 1 (4 primary, file-oriented):
 *   - 下载原图  Download 1024w WebP
 *   - 分享为图片  1-click PNG with title + QR + brand (R38)
 *   - 保存 PDF  Cmd+P path via /print/cards/[slug]
 *   - 复制链接  navigator.clipboard.writeText
 *
 * Row 2 (2 social, network-oriented):
 *   - X (Twitter)  https://twitter.com/intent/tweet?url=...&text=...
 *   - 微信扫码  WeChat QR modal (web → WeChat 没法直发, 只能扫)
 *
 * Layout: 6 across desktop (cramped, icon-only labels hidden < sm),
 *         3 across mobile (2 rows × 3 cols). Touch targets 44px.
 */
export function ShareActions({
  imageUrl,
  imageFilename,
  title,
  card,
}: ShareActionsProps) {
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Round 21 fix: track mount state so the post-copy setTimeout can't
  // fire setState after the user navigates away.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const url =
    typeof window !== "undefined" ? window.location.href : `/cards/${card.slug}`;

  const handleCopyLink = async () => {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("链接已复制", {
        description: "可粘贴到小红书 / 微信 / X",
      });
      setTimeout(() => {
        if (mountedRef.current) setCopied(false);
      }, 2000);
    } catch {
      toast.error("复制失败", { description: "请手动从地址栏复制" });
    }
  };

  const handleXShare = () => {
    const text = `${title} · 图鉴社`;
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      text,
    )}&url=${encodeURIComponent(url)}`;
    window.open(intent, "_blank", "noopener,noreferrer,width=550,height=420");
  };

  const handleWeChatOpen = async () => {
    setQrOpen(true);
    if (qrDataUrl) return;
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 512,
        margin: 2,
        color: { dark: "#1a1a1a", light: "#ffffff" },
      });
      if (mountedRef.current) setQrDataUrl(dataUrl);
    } catch (e) {
      toast.error("二维码生成失败", {
        description: e instanceof Error ? e.message : "未知错误",
      });
    }
  };

  return (
    <>
      <div
        role="group"
        aria-label={`分享 ${title}`}
        className="grid grid-cols-3 sm:grid-cols-6 gap-2"
      >
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

        <ShareCardButton card={card} />

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

        {/* Social row */}
        <button
          type="button"
          onClick={handleXShare}
          className={cn(
            "flex min-h-[44px] items-center justify-center gap-1.5 rounded-md border border-border bg-card px-2 py-2.5 text-xs sm:text-sm font-medium",
            "hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          )}
          title="分享到 X (Twitter)"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">分享 X</span>
          <span className="sm:hidden">X</span>
        </button>

        <button
          type="button"
          onClick={handleWeChatOpen}
          className={cn(
            "flex min-h-[44px] items-center justify-center gap-1.5 rounded-md border border-border bg-card px-2 py-2.5 text-xs sm:text-sm font-medium",
            "hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          )}
          title="用微信扫一扫"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">微信</span>
          <span className="sm:hidden">微信</span>
        </button>
      </div>

      {qrOpen && (
        <WeChatQrModal
          qrDataUrl={qrDataUrl}
          title={title}
          onClose={() => setQrOpen(false)}
        />
      )}
    </>
  );
}

function WeChatQrModal({
  qrDataUrl,
  title,
  onClose,
}: {
  qrDataUrl: string | null;
  title: string;
  onClose: () => void;
}) {
  // Esc to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`微信扫码分享 ${title}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-sm w-full rounded-lg border border-border bg-card p-6 shadow-card-hover"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭"
          className="absolute right-3 top-3 rounded-md p-1 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CloseIcon className="h-5 w-5" aria-hidden="true" />
        </button>
        <h2 className="text-lg font-serif font-semibold mb-2 pr-8">{title}</h2>
        <p className="text-sm text-muted-foreground mb-4">
          打开微信扫一扫,分享给朋友或朋友圈
        </p>
        <div className="flex justify-center bg-white p-4 rounded-md">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR code linking to ${title} on 图鉴社`}
              width={256}
              height={256}
              className="h-64 w-64"
            />
          ) : (
            <div className="h-64 w-64 flex items-center justify-center text-sm text-muted-foreground">
              生成中…
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          或从浏览器地址栏复制链接手动分享
        </p>
      </div>
    </div>
  );
}