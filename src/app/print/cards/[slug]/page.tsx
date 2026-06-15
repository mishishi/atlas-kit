import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { getAllCards, getCardBySlug } from "@/lib/data";
import { displayLabel } from "@/lib/types";
import { SERIES_TYPE_MAP } from "@/lib/series-types";
import { formatDate } from "@/lib/utils";
import { PrintAutoTrigger } from "@/components/print-auto-trigger";

export function generateStaticParams() {
  return getAllCards().map((c) => ({ slug: c.slug }));
}

export const dynamicParams = false;

export function generateMetadata({ params }: { params: { slug: string } }) {
  const card = getCardBySlug(params.slug);
  if (!card) notFound();
  return {
    title: `${card.title} · 打印版 · 图鉴社`,
    description: `打印 / 保存为 PDF: ${card.title}`,
    robots: { index: false, follow: false }, // never indexed
  };
}

/**
 * /print/cards/[slug] — printable single-card view, intended as the
 * source for "保存为 PDF" via Cmd/Ctrl+P.
 *
 * Layout: A4 portrait, single column, generous margins. Header has
 * the brand (no nav). Body has a 2-column row (image left, info
 * right). Footer has the permalink + 收录时间 so the PDF is
 * self-citeable.
 *
 * Auto-triggers window.print() once via a client island; a "返回
 * 详情" link lets the user cancel out before printing.
 */
export default function PrintCardPage({ params }: { params: { slug: string } }) {
  const card = getCardBySlug(params.slug);
  if (!card) notFound();

  const seriesType = SERIES_TYPE_MAP[card.series];
  const seriesName = seriesType?.name ?? card.series;
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://atlas-kit.vercel.app";
  const canonical = `${origin}/cards/${card.slug}`;

  return (
    <div className="bg-white text-ink min-h-screen print:bg-white">
      <PrintAutoTrigger />

      {/* Screen-only toolbar — hidden in print */}
      <div className="print:hidden sticky top-0 z-10 bg-cream/95 backdrop-blur border-b border-border">
        <div className="container py-3 flex items-center justify-between gap-4">
          <Link
            href={`/cards/${card.slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回详情
          </Link>
          <p className="text-xs text-muted-foreground">
            按 <kbd className="rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-mono">⌘P</kbd> /{" "}
            <kbd className="rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-mono">Ctrl P</kbd>{" "}
            保存为 PDF
          </p>
        </div>
      </div>

      {/* Printable body — A4 dimensions, padded for print margins */}
      <article className="mx-auto max-w-3xl bg-white px-6 py-8 md:px-10 md:py-12 print:py-6 print:px-0">
        {/* Masthead — brand identity strip at top of every page */}
        <header className="mb-6 flex items-baseline justify-between border-b border-ink/15 pb-3">
          <div>
            <p className="font-serif text-[10px] uppercase tracking-[0.3em] text-ink/60">Atlas Kit</p>
            <h1 className="font-serif text-xl font-semibold text-ink">图鉴社</h1>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink/60 tabular-nums">
            No.{card.seriesNo} · {seriesName}
          </p>
        </header>

        {/* Title block */}
        <div className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.2em] text-ink/50 mb-1 tabular-nums">
            {displayLabel(card.kind)} · 收录 {formatDate(card.createdAt)}
          </p>
          <h2 className="font-serif text-3xl font-bold text-ink leading-tight mb-1">
            {card.title}
          </h2>
          <p className="font-serif text-base text-ink/70">{card.subtitle}</p>
        </div>

        {/* Image + meta 2-col */}
        <section className="mb-6 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 print:grid-cols-[280px_1fr]">
          <div
            className="relative aspect-[9/16] w-full md:w-[280px] overflow-hidden rounded-md ring-1 ring-ink/10"
            style={{ backgroundColor: card.palette[0] }}
          >
            <Image
              src={card.image}
              alt={card.subtitle || card.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 280px"
              className="object-cover"
            />
          </div>
          <div className="space-y-4">
            <p className="font-serif text-[15px] leading-relaxed text-ink/85">
              {card.description}
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-ink/50">类型</dt>
              <dd className="font-medium">{displayLabel(card.kind)}</dd>
              <dt className="text-ink/50">系列</dt>
              <dd className="font-medium">{seriesName} · No.{card.seriesNo}</dd>
              <dt className="text-ink/50">评分</dt>
              <dd className="font-serif font-bold tabular-nums">{card.score.toFixed(1)} / 10</dd>
              <dt className="text-ink/50">收录</dt>
              <dd className="tabular-nums">{formatDate(card.createdAt)}</dd>
            </dl>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-ink/50 mb-1.5">标签</p>
              <p className="text-sm text-ink/80">
                {card.tags.map((t) => `#${t}`).join("  ")}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-ink/50 mb-1.5">配色</p>
              <div className="flex items-center gap-2">
                {card.palette.map((color, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div
                      className="h-5 w-5 rounded-sm border border-ink/20"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-mono text-[10px] text-ink/60 tabular-nums">{color}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Tagline as a pull quote — adds editorial weight */}
        <blockquote className="my-6 border-l-2 border-gold-deep pl-4 font-serif text-base italic text-ink/75">
          {card.tagline}
        </blockquote>

        {/* Footer — permalink + cite line */}
        <footer className="mt-8 border-t border-ink/15 pt-3 text-[10px] text-ink/50">
          <p>
            本图鉴由图鉴社 (Atlas Kit) 出品 ·{" "}
            <span className="font-mono">{canonical}</span>
          </p>
          <p className="mt-1">
            引用: 图鉴社 ({new Date(card.createdAt).getFullYear()}). {card.title} · No.{card.seriesNo} · {seriesName}.
          </p>
        </footer>
      </article>
    </div>
  );
}
