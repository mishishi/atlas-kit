import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Tag as TagIcon, BookMarked, BookOpen, ExternalLink } from "lucide-react";
import { getAllCards, getCardBySlug, getCardsByKind, getCardsBySeries } from "@/lib/data";
import { Tag } from "@/components/tag";
import { ShareActions } from "@/components/share-actions";
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

  // Same-kind recommendations: other cards of this kind, excluding
  // the current card AND any series siblings (so the two sections
  // don't show the same cards twice).
  const siblingSlugs = new Set(seriesCards.map((c) => c.slug));
  const relatedByKind = getCardsByKind(card.kind)
    .filter((c) => c.slug !== card.slug && !siblingSlugs.has(c.slug))
    .slice(0, 4);

  return (
    <article className="container py-8 md:py-12">
      {/* JSON-LD: helps search engines surface rich snippets (image, date, tags). */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ImageObject",
            name: card.title,
            description: card.tagline,
            contentUrl: card.image_full ?? card.image,
            keywords: card.tags.join(", "),
            inLanguage: "zh-CN",
            datePublished: card.createdAt,
            genre: displayLabel(card.kind),
            isPartOf: {
              "@type": "Collection",
              name: seriesName,
            },
          }),
        }}
      />
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
              alt={card.subtitle || card.title}
              fill
              priority
              quality={90}
              sizes="(max-width: 1024px) 100vw, 480px"
              className="object-cover"
            />
          </div>
          {card.image_full && card.image_full !== card.image && (
            <a
              href={card.image_full}
              target="_blank"
              rel="noopener"
              className="mt-2 block text-center text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
            >
              查看原图 (1024×1792) ↗
            </a>
          )}
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
            <p className="font-serif text-lg text-gold-deep mb-4">{card.subtitle}</p>
          </div>

          <p className="text-base leading-relaxed text-foreground/90">{card.description}</p>

          {/* Meta table — 4 rows: 类型 / 系列 / 收录 / 标签. The old
              学名/English rows are gone (Chinese-only editorial tone). */}
          <dl className="rounded-lg border border-border bg-card p-4 space-y-2.5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">类型</dt>
              <dd>{displayLabel(card.kind)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">所属系列</dt>
              <dd>
                <Link
                  href={`/series/${card.series}`}
                  className="hover:text-gold-deep underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                >
                  {seriesName}
                </Link>
                <span className="text-muted-foreground ml-1.5 text-xs tabular-nums">
                  · No.{card.seriesNo}
                </span>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">评分</dt>
              <dd className="font-serif font-bold text-gold-deep tabular-nums">
                {card.score.toFixed(1)} / 10
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">
                <Calendar className="inline h-3 w-3 mr-1" aria-hidden="true" />
                收录
              </dt>
              <dd>{formatDate(card.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">标签数</dt>
              <dd className="tabular-nums">
                {card.tags.length} 个
                {card.tags.length > 0 && (
                  <span className="text-muted-foreground/70 text-xs ml-1">
                    ({card.tags.slice(0, 2).join(" · ")}
                    {card.tags.length > 2 ? "…" : ""})
                  </span>
                )}
              </dd>
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

          {/* Download + share — give users the full-quality image */}
          <ShareActions
            imageUrl={card.image_full ?? card.image}
            imageFilename={card.slug}
            title={card.title}
          />
        </aside>
      </div>

      {/* 同类推荐 (other cards of the same kind, excluding current + series siblings to avoid duplication) */}
      {relatedByKind.length > 0 && (
        <section className="mt-16">
          <h2 className="font-serif text-2xl font-bold mb-6">
            其他{displayLabel(card.kind)}图鉴
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {relatedByKind.map((c) => (
              <Link
                key={c.slug}
                href={`/cards/${c.slug}`}
                aria-label={`查看 ${c.title}`}
                className="group block overflow-hidden rounded-lg border border-border bg-card shadow-card hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all hover:-translate-y-0.5"
              >
                <div className="relative aspect-[9/16]">
                  <Image
                    src={c.image_thumb ?? c.image}
                    alt={c.title}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-3">
                  <p className="font-serif text-sm font-medium group-hover:text-gold-deep transition-colors">{c.title}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 延伸阅读 — 外部权威百科 (Wikipedia 中文 / 百度百科) */}
      <section className="mt-12">
        <h2 className="font-serif text-2xl font-bold mb-6">延伸阅读</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href={`https://zh.wikipedia.org/wiki/${encodeURIComponent(card.title)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-3 rounded-lg border border-border bg-card p-4 hover:border-gold hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all"
          >
            <BookOpen className="h-5 w-5 mt-0.5 text-muted-foreground group-hover:text-gold-deep transition-colors shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="font-serif text-sm font-medium group-hover:text-gold-deep transition-colors">维基百科</div>
              <div className="text-xs text-muted-foreground mt-0.5 truncate">{card.title} · 自由百科全书</div>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-gold-deep transition-colors shrink-0 mt-0.5" aria-hidden="true" />
          </a>
          <a
            href={`https://baike.baidu.com/item/${encodeURIComponent(card.title)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-3 rounded-lg border border-border bg-card p-4 hover:border-gold hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all"
          >
            <BookMarked className="h-5 w-5 mt-0.5 text-muted-foreground group-hover:text-gold-deep transition-colors shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="font-serif text-sm font-medium group-hover:text-gold-deep transition-colors">百度百科</div>
              <div className="text-xs text-muted-foreground mt-0.5 truncate">{card.title} · 中文百科</div>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-gold-deep transition-colors shrink-0 mt-0.5" aria-hidden="true" />
          </a>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          外部链接仅供参考, 内容以本站图鉴及权威百科为准。
        </p>
      </section>

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