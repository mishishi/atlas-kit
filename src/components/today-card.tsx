import Image from "next/image";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { getAllCards } from "@/lib/data";
import { SERIES_TYPE_MAP } from "@/lib/series-types";
import type { Card } from "@/lib/types";

/**
 * R60 (2026-06-28): 今日图鉴 — daily deterministic pick.
 * R60.1 (2026-06-29): 紧凑横向 layout (Spotify now-playing row).
 *
 * 旧版用 9:16 缩略图 (220×391px) + text, 卡高 ~440px, 缩略图
 * 拉高整卡但右边文字只占 1/3, 视觉不平衡. 新版 96×96 方形
 * 缩略图, 整卡高 ~120px, 跟下面 5-series preview 节奏匹配.
 *
 * Server-side compute, same card for everyone on the same UTC day.
 */
function pickDailyCard(cards: Card[], now: Date): Card {
  const dateKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
  // mulberry32 seeded by hash of dateKey
  let h = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    h = (h ^ dateKey.charCodeAt(i)) * 16777619;
    h = h >>> 0;
  }
  let s = h >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const high = cards.filter((c) => c.score >= 7);
  const pool = high.length >= 30 ? high : cards;
  return pool[Math.floor(rand() * pool.length)];
}

export function TodayCard() {
  const cards = getAllCards();
  const card = pickDailyCard(cards, new Date());
  const seriesName = SERIES_TYPE_MAP[card.series]?.name ?? card.kind;
  return (
    <section className="border-b border-border bg-muted/30 paper-grain">
      <div className="container py-8 md:py-10">
        <div className="flex items-center gap-2 mb-3 text-xs uppercase tracking-wider text-gold-deep font-medium">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          <span>今日图鉴</span>
          <span aria-hidden="true">·</span>
          <time dateTime={new Date().toISOString().slice(0, 10)} className="text-muted-foreground">
            {new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric" })}
          </time>
        </div>
        <Link
          href={`/cards/${card.slug}`}
          aria-label={`今日图鉴: ${card.title} · 查看详情`}
          className="group flex items-center gap-4 md:gap-5 rounded-lg border border-border bg-card px-3 py-3 md:px-4 md:py-3.5 transition-all hover:shadow-card-hover hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div className="relative w-16 h-16 md:w-24 md:h-24 flex-shrink-0 overflow-hidden rounded-md">
            <Image
              src={card.image}
              alt=""
              fill
              sizes="96px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-lg md:text-xl font-bold leading-tight truncate">
              {card.title}
            </h2>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 truncate">
              No.{card.seriesNo} · {seriesName}
            </p>
            <p className="text-xs md:text-sm text-muted-foreground leading-snug line-clamp-1 md:line-clamp-2">
              {card.tagline || card.subtitle}
            </p>
          </div>
          <span className="hidden md:inline-flex items-center gap-1 text-sm font-medium text-gold-deep flex-shrink-0 group-hover:underline">
            查看
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </Link>
      </div>
    </section>
  );
}