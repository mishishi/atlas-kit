"use client";

import { useEffect, useRef, useState } from "react";
import {
  Copy,
  Check,
  Download,
  FileText,
  X,
  MessageCircle,
  ChevronDown,
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
 * R60+35.1 (2026-06-30): Share toolbar refactor.
 *
 * Layout: 3 across, each button gets a full 1/3 row width so 4-char
 * Chinese labels render horizontally (not the previous 6-grid which
 * crushed labels into vertical 1-char-per-line).
 *
 *   [下载原图] [分享为图片] [更多 ▾]
 *       ↑            ↑           ↑
 *   gold-deep   secondary    popover holding the 4 secondary actions:
 *   (primary)   (also has    - 保存 PDF
 *                its own      - 复制链接
 *                popover)     - 分享 X
 *                            - 微信扫码
 *
 * Why 3, not 6: the 6-grid had 4-char labels in ~60px wide cells;
 * flex wrapped text into vertical 单字, looked broken. 3-grid gives
 * each button ~190px (desktop) / ~115px (mobile) — 4-char fits.
 *
 * A11y: popover uses role="menu" + role="menuitem", Esc closes,
 * click-outside closes. Reused ShareCardButton's popover pattern.
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
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Round 21 fix: track mount state so the post-copy setTimeout can't
  // fire setState after the user navigates away.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Click-outside to close the "更多" popover.
  useEffect(() => {
    if (!moreOpen) return;
    function onClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [moreOpen]);

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
      setMoreOpen(false);
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
    setMoreOpen(false);
  };

  const handleWeChatOpen = async () => {
    setQrOpen(true);
    setMoreOpen(false);
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
        className="grid grid-cols-3 gap-2"
      >
        {/* 主按钮: 下载原图 (gold-deep, 唯一主操作) */}
        <a
          href={imageUrl}
          download={`${imageFilename}.webp`}
          className={cn(
            "flex min-h-[44px] items-center justify-center gap-1.5 rounded-md bg-gold-deep px-3 py-2.5 text-sm font-medium text-cream",
            "transition-colors hover:bg-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          )}
          title="下载 1024w 原图 (WebP)"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          <span>下载原图</span>
        </a>

        {/* 次按钮: 分享为图片 (它本身已是 popover, 弹出 IG 格式选择) */}
        <ShareCardButton card={card} />

        {/* "更多" 按钮 — 折叠剩下的 4 个次要操作 */}
        <div className="relative" ref={moreRef}>
          <button
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={moreOpen}
            aria-label="更多分享方式"
            className={cn(
              "flex w-full min-h-[44px] items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 py-2.5 text-sm font-medium",
              "hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                moreOpen ? "rotate-180" : "",
              )}
              aria-hidden="true"
            />
            <span>更多</span>
          </button>
          {moreOpen && (
            <div
              role="menu"
              aria-label="更多分享方式"
              className="absolute right-0 z-20 mt-1 min-w-[200px] rounded-md border border-border bg-card p-1 shadow-card-hover"
            >
              <Link
                href={`/print/cards/${imageFilename}`}
                target="_blank"
                rel="noopener noreferrer"
                role="menuitem"
                onClick={() => setMoreOpen(false)}
                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              >
                <FileText className="h-4 w-4" aria-hidden="true" />
                <span>保存 PDF</span>
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={handleCopyLink}
                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-success" aria-hidden="true" />
                    <span>已复制</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    <span>复制链接</span>
                  </>
                )}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={handleXShare}
                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                <span>分享 X</span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={handleWeChatOpen}
                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                <span>微信扫码</span>
              </button>
            </div>
          )}
        </div>
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