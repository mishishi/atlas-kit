import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Tag as TagIcon, BookMarked } from "lucide-react";
import { getAllCards, getCardBySlug, getCardsBySeries } from "@/lib/data";
import { Tag } from "@/components/tag";
import { KIND_LABELS, displayLabel } from "@/lib/types";
import { SERIES_TYPE_MAP } from "@/lib/series-types";
import { cn, formatDate } from "@/lib/utils";

export function generateStaticParams() {
  return getAllCards().map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const card = getCardBySlug(params.slug);
  if (!card) return { title: "图鉴未找到 · 图鉴社" };
  return {
    title: `${card.title} · 图鉴社`,
    description: card.tagline,
  };
}

export default function CardDetail({ params }: { params: { slug: string } }) {
  const card = getCardBySlug(params.slug);
  if (!card) notFound();

  const seriesType = SERIES_TYPE_MAP[card.series]; // series slug → metadata
  const seriesName = seriesType?.name ?? card.series; // fallback to slug if missing
  const seriesCards = getCardsBySeries(card.series).filter((c) => c.slug !== card.slug);
  const idx = seriesCards.findIndex((c) => c.slug === card.slug) + 1;

  return (
    <article className="container py-8 md:py-12">
      {/* Breadcrumb */}
      <nav aria-label="面包屑" className="mb-6 text-sm text-muted-foreground flex flex-wrap items-center">
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
        >
          首页
        </Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <Link
          href={`/series/${card.series}`}
          className="inline-flex min-h-[44px] items-center rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
        >
          {seriesName}
        </Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span className="text-foreground" aria-current="page">{card.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        {/* Image */}
        <div className="relative">
          <div
            className="relative aspect-[9/16] w-full max-w-[480px] mx-auto overflow-hidden rounded-lg border border-border bg-card shadow-card-hover"
            style={{ backgroundColor: card.palette[0] }}
          >
            <Image
              src={card.image}
              alt={`${card.title} 科普图鉴`}
              fill
              priority
              quality={90}
              sizes="(max-width: 1024px) 100vw, 480px"
              className="object-cover"
            />
          </div>
        </div>

        {/* Info panel */}
        <aside className="space-y-6">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold-deep mb-3">
              <BookMarked className="h-3 w-3" />
              <span>{seriesName}</span>
              <span>·</span>
              <span>No.{card.seriesNo}</span>
            </div>
            <h1 className="font-serif text-3xl md:text-4xl font-bold leading-tight mb-2">
              {card.title}
            </h1>
            <p className="text-sm italic text-muted-foreground mb-4">{card.titleEn}</p>
            <p className="font-serif italic text-lg text-gold-deep">{card.subtitle}</p>
          </div>

          <p className="text-base leading-relaxed text-foreground/90">{card.description}</p>

          {/* Meta table */}
          <dl className="rounded-lg border border-border bg-card p-4 space-y-2.5 text-sm">
            {card.latin && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">学名</dt>
                <dd className="font-mono text-xs">{card.latin}</dd>
              </div>
            )}
            {card.titleEn && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">English</dt>
                <dd className="italic">{card.titleEn}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">类型</dt>
              <dd>{displayLabel(card.kind)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">评分</dt>
              <dd className="font-serif font-bold text-gold-deep tabular-nums">{card.score.toFixed(1)} / 10</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">
                <Calendar className="inline h-3 w-3 mr-1" />
                发布
              </dt>
              <dd>{formatDate(card.createdAt)}</dd>
            </div>
          </dl>

          {/* Tags */}
          <div>
            <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 flex items-center gap-1.5">
              <TagIcon className="h-3 w-3" />
              标签
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {card.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
          </div>

          {/* Palette — horizontal single row, more compact for sidebar density. */}
          <div>
            <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">配色</h3>
            <div className="flex flex-wrap gap-3">
              {card.palette.map((color, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div
                    className="h-10 w-10 rounded-md border border-border shadow-card"
                    style={{ backgroundColor: color }}
                    aria-label={`Color ${color}`}
                  />
                  <span className="mt-1 text-[10px] font-mono text-foreground/70 tabular-nums">
                    {color}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Download */}
          <a
            href={card.image}
            download={`${card.slug}.png`}
            className={cn(
              "flex min-h-[44px] w-full items-center justify-center rounded-md bg-gold-deep px-4 py-2.5 text-center text-sm font-medium text-cream",
              "transition-colors hover:bg-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
          >
            下载图鉴原图
          </a>
        </aside>
      </div>

      {/* Series siblings */}
      {seriesCards.length > 0 && (
        <section className="mt-16">
          <h2 className="font-serif text-2xl font-bold mb-6">
            同系列其他图鉴
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {seriesCards.slice(0, 4).map((c) => (
              <Link
                key={c.slug}
                href={`/cards/${c.slug}`}
                aria-label={`查看 ${c.title}`}
                className="group block overflow-hidden rounded-lg border border-border bg-card shadow-card hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all hover:-translate-y-0.5"
              >
                <div className="relative aspect-[9/16]">
                  <Image
                    src={c.image}
                    alt={c.title}
                    fill
                    sizes="200px"
                    className="object-cover"
                  />
                </div>
                <div className="p-3">
                  <p className="text-xs text-muted-foreground mb-1">No.{c.seriesNo}</p>
                  <p className="font-serif text-sm font-medium group-hover:text-gold-deep transition-colors">{c.title}</p>
                </div>
              </Link>
            ))}
          </div>
          {seriesCards.length > 4 && (
            <div className="mt-6 text-center">
              <Link
                href={`/series/${card.series}`}
                className="inline-flex min-h-[44px] items-center gap-1.5 text-sm text-gold-deep hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
              >
                查看 {seriesName} 全部 {seriesCards.length} 张
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          )}
        </section>
      )}
    </article>
  );
}