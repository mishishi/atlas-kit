"use client";

/**
 * R38 (2026-06-17): 分享卡片 — 1-click 生成 1080×1080 PNG.
 *
 * 用 HTML5 Canvas 在客户端渲染 (vs server-side sharp + qrcode):
 * - 浏览器有 Chinese font (Noto Serif SC VF / 系统中文), 不依赖
 *   server-side font subsetting
 * - 0 server load, 0 server 复杂 (sharp 渲 SVG 文字需要嵌字体)
 * - 下载走 canvas.toBlob + <a download>, 浏览器原生支持
 *
 * MVP v1: 只 1 个格式 (IG 1080×1080). 后面要加 Story/微信 同函数
 * 不同 dimensions 即可 (留 FORMATS 表, 注释里 hint).
 *
 * Layout (1080×1080, 大图背景 + 深色渐变 + 文字/QR 叠加):
 *   - bg: card.image_full 9:16, cover 缩放
 *   - overlay: 底部 50% 黑色渐变 (0% → 75%)
 *   - title: 左下, 白色 serif, 54px, 自动换行
 *   - meta: 副标题, 22px, 85% 透明白
 *   - QR: 右下 140x140, 链回当前卡片 URL
 *   - brand: 左下最底, "图鉴社 · atlas-kit", 60% 透明白
 */

import { useState, useRef, useEffect } from "react";
import QRCode from "qrcode";
import { Download, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Card } from "@/lib/types";
import { SERIES_TYPE_MAP } from "@/lib/series-types";

// 格式表 (后续 Story/微信 同代码, 加一行即可)
const FORMATS = {
  ig: { w: 1080, h: 1080, label: "Instagram 1080×1080", suffix: "ig" },
} as const;
type Format = keyof typeof FORMATS;

export function ShareCardButton({ card }: { card: Card }) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState<Format | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Click-outside to close
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function generate(format: Format) {
    setGenerating(format);
    try {
      const blob = await renderShareCard(card, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${card.slug}-${FORMATS[format].suffix}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Defer revoke to next tick so Safari has time to start the download
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("已下载", { description: FORMATS[format].label });
      setOpen(false);
    } catch (e) {
      console.error("[ShareCard] generate failed:", e);
      toast.error("生成失败", {
        description: e instanceof Error ? e.message : "未知错误",
      });
    } finally {
      setGenerating(null);
    }
  }

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="分享为图片 (打开格式选择)"
        className={cn(
          "flex w-full min-h-[44px] items-center justify-center gap-1.5 rounded-md border border-border bg-card px-2 py-2.5 text-xs sm:text-sm font-medium",
          "hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">分享为图片</span>
        <span className="sm:hidden">图片</span>
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform",
            open ? "rotate-180" : "",
          )}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="选择分享图片格式"
          className="absolute right-0 z-20 mt-1 min-w-[200px] rounded-md border border-border bg-card p-1 shadow-card-hover"
        >
          {(Object.keys(FORMATS) as Format[]).map((f) => (
            <button
              key={f}
              type="button"
              role="menuitem"
              onClick={() => generate(f)}
              disabled={generating !== null}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-sm px-3 py-2 text-sm",
                "hover:bg-muted transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              <span>{generating === f ? "生成中..." : FORMATS[f].label}</span>
              {generating === f && (
                <span
                  className="h-3 w-3 rounded-full border-2 border-gold-deep border-t-transparent animate-spin"
                  aria-hidden="true"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── 渲染函数 (纯, 容易单测) ──────────────────────────────── */

async function renderShareCard(card: Card, format: Format): Promise<Blob> {
  const { w, h } = FORMATS[format];
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2d context not available");

  // 1. Background fallback (in case image fails)
  ctx.fillStyle = card.palette[0];
  ctx.fillRect(0, 0, w, h);

  // 2. Card image, cover-scaled
  const img = await loadImage(card.image_full ?? card.image);
  drawCover(ctx, img, 0, 0, w, h);

  // 3. Bottom 50% dark gradient overlay (text legibility)
  const grad = ctx.createLinearGradient(0, h * 0.5, 0, h);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.5, "rgba(0,0,0,0.4)");
  grad.addColorStop(1, "rgba(0,0,0,0.78)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, h * 0.5, w, h * 0.5);

  // 4. Title (serif, white, auto-wrap)
  const titleSize = Math.round(w * 0.052); // ~56 for 1080
  ctx.font = `700 ${titleSize}px "Noto Serif SC VF", "Songti SC", "Source Han Serif SC", "Noto Serif CJK SC", Georgia, serif`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  // Pad 60px from edge; title block has 100px of vertical space above meta
  const titleX = 60;
  const titleY = h - 180;
  const titleMaxW = w - 120 - 200; // leave room for QR on the right
  drawWrappedText(ctx, card.title, titleX, titleY, titleMaxW, titleSize * 1.15);

  // 5. Meta (sans, 85% white, uppercase-ish)
  const metaSize = Math.round(w * 0.022); // ~24 for 1080
  ctx.font = `500 ${metaSize}px "Noto Sans SC VF", "PingFang SC", "Microsoft YaHei", "Helvetica Neue", sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  const seriesName =
    SERIES_TYPE_MAP[card.series]?.name ?? card.kind;
  ctx.fillText(
    `No.${card.seriesNo} · ${seriesName}`,
    titleX,
    h - 110,
  );

  // 6. Brand watermark (small, bottom-left, dim)
  const brandSize = Math.round(w * 0.018); // ~20 for 1080
  ctx.font = `500 ${brandSize}px "Noto Sans SC VF", "PingFang SC", "Microsoft YaHei", sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.62)";
  ctx.fillText("图鉴社 · atlas-kit", titleX, h - 60);

  // 7. QR code (bottom-right, ~140x140, link to current card)
  const qrSize = Math.round(w * 0.13); // ~140 for 1080
  const qrUrl = `${window.location.origin}/cards/${card.slug}`;
  const qrDataUrl = await QRCode.toDataURL(qrUrl, {
    width: qrSize * 2, // 2x for retina
    margin: 1,
    color: { dark: "#ffffff", light: "#00000000" }, // transparent bg
  });
  const qr = await loadImage(qrDataUrl);
  // Add a small white square behind QR so dark modules read against the
  // dark gradient
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fillRect(
    w - qrSize - 70,
    h - qrSize - 70,
    qrSize + 20,
    qrSize + 20,
  );
  ctx.drawImage(qr, w - qrSize - 60, h - qrSize - 60, qrSize, qrSize);

  // Convert to PNG blob
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("canvas.toBlob returned null"))),
      "image/png",
    );
  });
}

/* ── 工具函数 ─────────────────────────────────────────── */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Same-origin (atlas-kit) so no CORS issue, but set anyway for safety
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/** Cover-scale: fill the box, crop overflow (preserves aspect ratio). */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let drawW: number;
  let drawH: number;
  let drawX: number;
  let drawY: number;
  if (imgRatio > boxRatio) {
    // Image wider than box → match height, crop sides
    drawH = h;
    drawW = h * imgRatio;
    drawX = x - (drawW - w) / 2;
    drawY = y;
  } else {
    // Image taller than box → match width, crop top/bottom
    drawW = w;
    drawH = w / imgRatio;
    drawX = x;
    drawY = y - (drawH - h) / 2;
  }
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
}

/**
 * Wrap text by char (Chinese has no spaces). Walks char by char,
 * breaks when the next char would exceed maxWidth. Writes line(s)
 * starting at (x, y) with given lineHeight.
 */
function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  // Fast path: whole text fits
  if (ctx.measureText(text).width <= maxWidth) {
    ctx.fillText(text, x, y);
    return;
  }
  const chars = Array.from(text); // Array.from to handle surrogate pairs
  let line = "";
  let curY = y;
  for (const ch of chars) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line.length > 0) {
      ctx.fillText(line, x, curY);
      line = ch;
      curY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, curY);
}
