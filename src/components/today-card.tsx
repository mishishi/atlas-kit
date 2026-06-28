import Image from "next/image";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { getAllCards } from "@/lib/data";
import { SERIES_TYPE_MAP } from "@/lib/series-types";
import type { Card } from "@/lib/types";

/**
 * R60 (2026-06-28): 今日图鉴 — daily deterministic pick.
 *
 * Why deterministic (not client random):
 *   - Server-side compute on every request → no hydration flash.
 *   - Same card for the entire UTC day, all visitors see the same one,
 *     so /today is shareable as "what's today's card" without drift.
 *   - Lightweight: a tiny seeded hash (mulberry32) on YYYY-MM-DD.
 *
 * Card surfacing bias: prefer high-quality (visualScore >= 7) and recent
 * cards, but fall back to anything if the high-quality pool is empty.
 * This avoids surfacing the same 8 hand-curated "famous" cards every day
 * and instead gives newer cards a chance too.
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
  // Prefer higher score (7+) but mix in lower scores so variety accumulates
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
      <div className="container py-10 md:py-14">
        <div className="flex items-center gap-2 mb-4 text-xs uppercase tracking-wider text-gold-deep font-medium">
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
          className="group grid gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[220px_1fr] items-center rounded-lg border border-border bg-card p-4 md:p-5 transition-all hover:shadow-card-hover hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div className="relative aspect-[9/16] w-full md:w-[180px] lg:w-[220px] mx-auto md:mx-0 overflow-hidden rounded-md">
            <Image
              src={card.image}
              alt=""
              fill
              sizes="(max-width: 768px) 60vw, 220px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
          <div className="min-w-0">
            <h2 className="font-serif text-2xl md:text-3xl font-bold mb-1 leading-tight">
              {card.title}
            </h2>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
              No.{card.seriesNo} · {seriesName}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-3">
              {card.tagline || card.subtitle}
            </p>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gold-deep group-hover:underline">
              查看详情
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </div>
        </Link>
      </div>
    </section>
  );
}