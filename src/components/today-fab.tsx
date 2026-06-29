"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Sparkles, X, ArrowRight, Calendar } from "lucide-react";
import Link from "next/link";
import { SERIES_TYPE_MAP } from "@/lib/series-types";
import type { Card } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * R60.2 (2026-06-29): 浮动按钮 + modal 的「今日图鉴」.
 *
 * 旧版 (R60.1) 把今日图鉴做成首页 strip, 9:16 缩略图拉高卡到
 * ~440px, 右边长段空白不优雅. 改成右下浮动按钮 (FAB), 点击
 * 弹 modal 展示. modal 内容用杂志封面式 hero: 全宽大图 + 渐变
 * 叠加 + 文字浮在底. modal 是用户主动召的, 跟首页节奏不冲突.
 *
 * 浮动按钮:
 *   - 右下 fixed, 圆形 56px
 *   - gold-deep 背景, cream 图标
 *   - hover scale 1.05
 *   - 首次访问显示 1s 后 fade-in (避免页面加载时突兀)
 *   - dismiss 用 localStorage 'atlas-today-fab-dismissed' (today 日期)
 *
 * Modal:
 *   - 居中, 90vw / 540px max
 *   - 全宽 cover image, bottom 50% 渐变
 *   - 文字 (title + meta + tagline + 详情 CTA) 浮在底
 *   - Esc 关 / 点背景关 / X 按钮关
 *   - 24h 倒计时到下一天
 */
interface TodayFabProps {
  card: Card;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function TodayFab({ card }: TodayFabProps) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const dismissedKey = `atlas-today-fab-dismissed-${todayKey()}`;
  const dismissedTodayRef = useRef(false);

  // SSR-safe localStorage read on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    dismissedTodayRef.current =
      window.localStorage.getItem(dismissedKey) === "1";
    if (!dismissedTodayRef.current) {
      // 1s delay so the FAB doesn't compete with hero collage on load
      const t = window.setTimeout(() => setVisible(true), 1000);
      return () => window.clearTimeout(t);
    }
  }, [dismissedKey]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Lock body scroll when modal open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const seriesName = SERIES_TYPE_MAP[card.series]?.name ?? card.kind;
  const dateLabel = new Date().toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
  });

  return (
    <>
      {/* Floating button (FAB) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`查看今日图鉴: ${card.title}`}
        className={cn(
          "fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-gold-deep text-cream shadow-lg",
          "flex items-center justify-center",
          "hover:bg-gold hover:scale-105 active:scale-95",
          "transition-all duration-300",
          visible && !dismissedTodayRef.current
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none",
        )}
      >
        <Sparkles className="h-6 w-6" aria-hidden="true" />
        <span className="sr-only">今日图鉴</span>
      </button>

      {/* Modal — R60.2.1: 完整图片不裁切 + 文字块在图下方 (artifact 风) */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`今日图鉴 ${card.title}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[90vh] w-full max-w-[540px] flex-col overflow-hidden rounded-2xl bg-card shadow-2xl"
          >
            {/* Eyebrow bar — sticky top of modal */}
            <div className="flex items-center justify-between border-b border-border bg-card/95 px-5 py-3 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gold-deep font-medium">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                <span>今日图鉴</span>
                <span className="text-muted-foreground/50">·</span>
                <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" aria-hidden="true" />
                <span className="text-muted-foreground">{dateLabel}</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="关闭"
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Image — full 9:16 visible, no crop, palette[0] background fill */}
            <div
              className="relative flex w-full items-center justify-center overflow-auto"
              style={{ backgroundColor: card.palette[0] }}
            >
              {/* Use intrinsic aspect ratio: width = container, height = auto */}
              <div className="relative w-full" style={{ aspectRatio: "9 / 16", maxHeight: "55vh" }}>
                <Image
                  src={card.image_full ?? card.image}
                  alt={card.title}
                  fill
                  sizes="(max-width: 540px) 100vw, 540px"
                  priority
                  className="object-contain"
                />
              </div>
            </div>

            {/* Text block — below the image, not overlaid */}
            <div className="border-t border-border bg-card p-5">
              <p className="mb-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                No.{card.seriesNo} · {seriesName}
              </p>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold leading-tight mb-2">
                {card.title}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground mb-4 line-clamp-3">
                {card.description || card.tagline || card.subtitle}
              </p>
              <Link
                href={`/cards/${card.slug}`}
                className="inline-flex items-center gap-2 rounded-md bg-gold-deep px-4 py-2 text-sm font-medium text-cream transition-colors hover:bg-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                查看完整图鉴
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}