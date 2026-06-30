import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Tag as TagIcon, BookMarked, BookOpen, ExternalLink, Search, Sparkles, Link2, ScrollText, AlertCircle, History, Quote, Globe, Building2, Newspaper, GraduationCap, Library, Maximize2, AlertTriangle } from "lucide-react";
import { getAllCards, getCardBySlug, getCardsByKind, getCardsBySeries, getRelatedCards, getReverseMentions, getAllCardsForMentionMap } from "@/lib/data";
import { getCardFullDims } from "@/lib/server/image-dims";
import { Tag } from "@/components/tag";
import { ShareActions } from "@/components/share-actions";
import { HeroWithLightbox } from "@/components/hero-with-lightbox";
import { getEditorialNote } from "@/lib/editorial";
import { StarButton } from "@/components/star-button";
import { LinkedText } from "@/components/linked-text";
import { CardNav } from "@/components/card-nav";
import { CardFlipMode } from "@/components/card-flip-mode";
import { getAdjacentInSeries } from "@/lib/data";
import { KIND_LABELS, displayLabel } from "@/lib/types";
import { SERIES_TYPE_MAP } from "@/lib/series-types";
import { getSubKindLabel } from "@/lib/taxonomy";
import { cn, formatDate } from "@/lib/utils";

export function generateStaticParams() {
  return getAllCards().map((c) => ({ slug: c.slug }));
}

// `dynamicParams = false` means an unknown slug is rejected at the
// framework level (404 status) instead of falling through to SSR
// (which Next 14 serves with 200 + not-found body, see:
// https://github.com/vercel/next.js/issues/47975). Combined with
// the notFound() call in generateMetadata above, the user gets
// the proper 404 response with the path-aware not-found.tsx body.
export const dynamicParams = false;

export function generateMetadata({ params }: { params: { slug: string } }) {
  const card = getCardBySlug(params.slug);
  if (!card) {
    // Trigger notFound() at the metadata layer so Next.js serves a true
    // 404 response with the not-found.tsx body, instead of returning
    // 200 with the '图鉴未找到' title and a partially-rendered page
    // (which was happening because notFound() thrown inside the
    // default function races with the metadata-rendered title).
    notFound();
  }
  return {
    title: `${card.title} · 图鉴社`,
    description: card.tagline,
    // Round 27 (2026-06-17): per-card OpenGraph image. Without this,
    // sharing /cards/sanxingdui to WeChat/Twitter falls back to the
    // generic /opengraph-image (the all-cards collage), which kills
    // click-through. Now each share surfaces a 1024w WebP preview
    // of the actual card.
    openGraph: {
      title: `${card.title} · 图鉴社`,
      description: card.tagline,
      type: "article",
      locale: "zh_CN",
      // image_full is the 1024w WebP (post-reencode, ~310 KB).
      // Absolute URL required by WeChat / Twitter crawlers — they're
      // server-side fetchers that don't follow the SPA's own base URL.
      images: card.image_full
        ? [{ url: `${process.env.SITE_URL ?? ""}${card.image_full}` }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${card.title} · 图鉴社`,
      description: card.tagline,
      images: card.image_full
        ? [`${process.env.SITE_URL ?? ""}${card.image_full}`]
        : undefined,
    },
  };
}

export default async function CardDetail({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { mode?: string };
}) {
  const card = getCardBySlug(params.slug);
  if (!card) notFound();

  // Round 31: read the actual full.webp pixel dimensions at build /
  // request time so the "查看原图 (W×H)" label is accurate. SSG
  // awaits this once per card, then memoizes in data.ts.
  const fullDims = await getCardFullDims(card.slug);

  // M (2026-06-30): editor's "为什么收录这条" note. 30/600 cards
  // have one. Hand-written in data/editorial-notes.json. Renders
  // between description and quote (above the technical meta blocks)
  // so it's the first thing readers see after the lede.
  const editorialNote = getEditorialNote(card.slug);

  // R34 Day 3 (2026-06-17): 翻图录 mode — fullscreen image-first
  // browsing. Triggered by `?mode=flip` on the URL. Renders BEFORE
  // the rest of the page (SiteHeader/SiteFooter are still mounted
  // but covered by the fixed overlay z-50 in CardFlipMode).
  if (searchParams.mode === "flip") {
    const seriesSorted = getCardsBySeries(card.series).sort((a, b) =>
      a.seriesNo.localeCompare(b.seriesNo, "en", { numeric: true }),
    );
    const adjacent = getAdjacentInSeries(card.slug);
    const position =
      seriesSorted.findIndex((c) => c.slug === card.slug) + 1;
    return (
      <CardFlipMode
        card={card}
        prev={adjacent.prev}
        next={adjacent.next}
        position={position}
        total={seriesSorted.length}
      />
    );
  }

  // Map a source's `type` string to an icon. Default to BookOpen
  // for any unrecognized type so the UI never falls back to nothing.
  function SourceIcon({ type }: { type?: string }) {
    const iconClass = "h-4 w-4 text-muted-foreground group-hover:text-gold-deep transition-colors shrink-0";
    switch (type) {
      case "百科": return <BookOpen className={iconClass} aria-hidden="true" />;
      case "学术": return <GraduationCap className={iconClass} aria-hidden="true" />;
      case "博物馆": return <Building2 className={iconClass} aria-hidden="true" />;
      case "机构": return <Library className={iconClass} aria-hidden="true" />;
      case "新闻": return <Newspaper className={iconClass} aria-hidden="true" />;
      default: return <Globe className={iconClass} aria-hidden="true" />;
    }
  }

  const seriesType = SERIES_TYPE_MAP[card.series]; // series slug → metadata
  const seriesName = seriesType?.name ?? card.series; // fallback to slug if missing
  const seriesCards = getCardsBySeries(card.series).filter((c) => c.slug !== card.slug);
  const idx = seriesCards.findIndex((c) => c.slug === card.slug) + 1;

  // R34 (2026-06-17): prev/next in same series (wrap-around) for
  // 翻图录浏览体验. CardNav component renders the bar + handles
  // ←/→ keyboard nav.
  const adjacent = getAdjacentInSeries(card.slug);
  const prevRef = adjacent.prev
    ? { slug: adjacent.prev.slug, title: adjacent.prev.title, seriesNo: adjacent.prev.seriesNo }
    : null;
  const nextRef = adjacent.next
    ? { slug: adjacent.next.slug, title: adjacent.next.title, seriesNo: adjacent.next.seriesNo }
    : null;

  // Same-kind recommendations: other cards of this kind, excluding
  // the current card AND any series siblings (so the two sections
  // don't show the same cards twice).
  const siblingSlugs = new Set(seriesCards.map((c) => c.slug));
  const relatedByKind = getCardsByKind(card.kind)
    .filter((c) => c.slug !== card.slug && !siblingSlugs.has(c.slug))
    .slice(0, 4);

  // 你可能也会喜欢 — weighted score: same kind +5, same series +3
  // (excluded below since 同系列 is above), shared tags +3 each
  // (cap +9). The dataset now has cross-cutting categorical tags
  // (中国 / 古代 / 江南 / etc., see scripts/add-cross-tags.mjs) so
  // the algorithm has real cross-kind / cross-series signal.
  // Excludes current + same-series siblings + same-kind cards so
  // the three sections don't overlap.
  const relatedByInterest = getRelatedCards(
    card,
    4,
    new Set([...siblingSlugs, ...relatedByKind.map((c) => c.slug)]),
  );

  // Reverse references — cards whose text mentions this card. Part
  // of the "知识网络" upgrade (issue 80bf9e4's roadmap).
  const reverseMentions = getReverseMentions(card.slug, 8);
  // Title → slug map for the body description — turns "提到了 X"
  // into a real <Link> to X's detail page.
  const mentionMap = getAllCardsForMentionMap(card.slug);

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

      {/* R34: prev/next nav bar + ←/→ keyboard (component handles both) */}
      <CardNav prev={prevRef} next={nextRef} />

      {/* R34 Day 3: enter fullscreen flip-through mode. Centered
          below the prev/next bar, low-visual-weight so it doesn't
          compete with the hero. URL is shareable (`?mode=flip`). */}
      <div className="mb-8 flex justify-center">
        <Link
          href={`/cards/${card.slug}?mode=flip`}
          aria-label="进入翻图录模式 (全屏浏览)"
          className={cn(
            "inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-md text-sm",
            "text-muted-foreground hover:text-gold-deep hover:bg-muted",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "transition-colors",
          )}
        >
          <Maximize2 className="h-4 w-4" aria-hidden="true" />
          进入翻图录模式
        </Link>
      </div>

      {/* R37-fix (2026-06-18): 显式 grid-column 修 grid 布局 bug.
          之前 grid-cols-[1fr_400px] 自动布局: badge 太小不填 col 1,
          HeroWithLightbox 自动跳到 row 1 col 2 (右侧 400px), aside
          反而被挤到 row 2 col 1. 跟用户截图一致: 左空 hero / 右图
          / 信息全错位.

          修法: 显式 grid-column-end: 2 让 hero + badge 占 col 1,
          aside 显式 col-start: 2 占 col 2. 用户报的 "为什么会显示
          成这样" 就是这个 bug. */}
      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        {/* Image — clickable hero that opens a fullscreen lightbox
            (Plan A: 自建 <Lightbox> 组件). Was a static <Image> + a
            "查看大图" text link. Now the whole card is a button with
            a magnifier-pill affordance on hover, plus a secondary
            text button below. Lightbox has ESC + click-outside close,
            a download button in the footer, and locks body scroll. */}
        {/* R37: 视觉质量分 badge. 8/8 金色, 7 中性, <5 红.
            undefined 不渲染 (没跑过 check-image). */}
        {card.visualScore !== undefined && (
          <div className="mb-3 col-start-1 col-end-2 flex justify-center">
            {card.visualScore === 8 ? (
              <div
                role="status"
                aria-label={`视觉质量评分 ${card.visualScore} 分, 满分 8 分`}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
                  "bg-gold/15 text-gold-deep border border-gold/30",
                )}
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                视觉 8/8 ✓
              </div>
            ) : card.visualScore >= 5 ? (
              <div
                role="status"
                aria-label={`视觉质量评分 ${card.visualScore} 分, 共 8 分`}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
                  "bg-muted text-muted-foreground border border-border",
                )}
              >
                视觉 {card.visualScore}/8
              </div>
            ) : (
              <div
                role="status"
                aria-label={`视觉质量评分 ${card.visualScore} 分, 建议重新生成`}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
                  "bg-destructive/10 text-destructive border border-destructive/30",
                )}
              >
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                需要重生成
              </div>
            )}
          </div>
        )}

        <div className="col-start-1 col-end-2">
        <HeroWithLightbox
          src={card.image}
          fullSrc={card.image_full ?? card.image}
          alt={card.subtitle || card.title}
          bgColor={card.palette[0]}
          filename={card.slug}
          caption={card.title}
          fullDims={fullDims ?? undefined}
          overlay={<StarButton slug={card.slug} title={card.title} size="prominent" />}
        />
        </div>

        {/* Info panel */}
        <aside className="col-start-2 col-end-3 space-y-6">
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
            {/* R58f (2026-06-26): subKind eyebrow chip. Sits below subtitle,
                gold-bordered with subKind label + click-through to
                /cards?kind=X&subKind=Y. Visual matches the page-eyebrow
                style but bigger so the L3 dimension is discoverable. */}
            {card.subKind && (
              <Link
                href={`/cards?kind=${card.kind}&subKind=${encodeURIComponent(card.subKind)}`}
                className="inline-flex items-center gap-1.5 mb-5 rounded-full border border-gold bg-gold/10 px-3 py-1 text-xs text-gold-deep font-medium hover:bg-gold/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <span aria-hidden="true">▸</span>
                <span>{getSubKindLabel(card.kind, card.subKind) ?? card.subKind}</span>
              </Link>
            )}
          </div>

          <p className="text-base leading-relaxed text-foreground/90">
            <LinkedText text={card.description} titleToSlug={mentionMap} />
          </p>

          {/* M (2026-06-30): editor's "为什么收录这条". 30/600 cards
              carry a 1-2 sentence hand-written note. Visually a
              cream blockquote with a small "EDITOR" eyebrow, sits
              between description and quote so it reads as the
              editor's voice in conversation with the article. */}
          {editorialNote && (
            <aside
              className="my-6 border-l-2 border-gold-deep bg-cream/40 px-4 py-3 rounded-r-md"
              data-section="editorial-note"
            >
              <p className="text-[10px] uppercase tracking-[0.18em] text-gold-deep font-medium mb-1.5">
                为什么收录这条 · editor
              </p>
              <p className="font-serif text-sm text-foreground/85 leading-relaxed">
                {editorialNote.why}
              </p>
              {editorialNote.vibe && (
                <p className="mt-2 text-xs italic text-muted-foreground">
                  {editorialNote.vibe}
                </p>
              )}
            </aside>
          )}

          {/* 引文 — pull-quote style. 1-2 句权威引文, 标注来源.
              Goes right after the description as a visual breath,
              so users see "this is what experts say" before
              scrolling to the technical meta. */}
          {card.quote && (
            <blockquote className="border-l-2 border-gold-deep pl-4 font-serif text-sm italic text-foreground/85">
              {card.quote}
            </blockquote>
          )}

          {/* 轶事 — small inline note. Visual contrast with the
              pull-quote (no left border, smaller, lighter) so the
              two don't visually compete. */}
          {card.trivia && (
            <p className="rounded-md bg-muted/40 px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
              <span className="font-serif font-semibold text-gold-deep not-italic">小知识</span>
              <span className="mx-1.5 text-border">·</span>
              {card.trivia}
            </p>
          )}

          {/* 误解 / 事实 — hand-written myth-buster pair, only for
              cards that have one. We don't render any UI when
              either field is missing so the data layer (cards.json)
              controls availability. Visually pairs with 轶事 above
              but uses a 2-row layout (myth in red/terracotta tint,
              fact in gold/positive tint) to make the "common
              misconception vs. reality" framing obvious. */}
          {(card.myth || card.fact) && (
            <div className="rounded-md border border-border/60 bg-muted/30 px-3.5 py-3 text-xs leading-relaxed space-y-2">
              {card.myth && (
                <p className="text-foreground/85">
                  <span className="font-serif font-semibold text-terracotta not-italic">
                    常见误解
                  </span>
                  <span className="mx-1.5 text-border">·</span>
                  {card.myth}
                </p>
              )}
              {card.fact && (
                <p className="text-foreground/85">
                  <span className="font-serif font-semibold text-gold-deep not-italic">
                    事实
                  </span>
                  <span className="mx-1.5 text-border">·</span>
                  {card.fact}
                </p>
              )}
            </div>
          )}

          {/* Meta table — 5 rows: 类型 / 系列 / 评分 / 收录 / 标签数.
              The old 学名/English rows are gone (Chinese-only editorial tone).
              Hairline dividers between rows give the sidebar a sense
              of structure that pure space-y can't (N6 polish). */}
          <dl className="rounded-lg border border-border bg-card text-sm">
            <div className="flex justify-between gap-4 p-3.5 border-b border-border/40 last:border-b-0">
              <dt className="text-muted-foreground">类型</dt>
              <dd>
                <Link
                  href={`/cards?kind=${card.kind}`}
                  className="hover:text-gold-deep underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                >
                  {displayLabel(card.kind)}
                </Link>
                {card.subKind && (
                  <>
                    <span className="text-muted-foreground mx-1">›</span>
                    <Link
                      href={`/cards?kind=${card.kind}&subKind=${encodeURIComponent(card.subKind)}`}
                      className="text-muted-foreground hover:text-gold-deep underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                    >
                      {getSubKindLabel(card.kind, card.subKind) ?? card.subKind}
                    </Link>
                  </>
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-4 p-3.5 border-b border-border/40 last:border-b-0">
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
            {/* Round 27 (2026-06-17): 评分 row removed.
                Anti-RPG positioning: no per-card rating on the detail
                page. The `score` field stays in cards.json for future
                sort use, but is no longer surfaced to users. */}
            <div className="flex justify-between gap-4 p-3.5 border-b border-border/40 last:border-b-0">
              <dt className="text-muted-foreground">
                <Calendar className="inline h-3 w-3 mr-1" aria-hidden="true" />
                收录
              </dt>
              <dd>{formatDate(card.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-4 p-3.5">
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
            card={card}
          />

          {/* 勘误 — single small link, not a CTA. The user can report
              a factual error via email (mailto, opens native mail
              client). We use a mailto with a prefilled subject and
              body, no form, no DB, no auth. Author address is read
              from env so the project owner can change it without
              touching the code (set SITE_AUTHOR_EMAIL in .env). */}
          <a
            href={`mailto:${process.env.NEXT_PUBLIC_SITE_AUTHOR_EMAIL ?? "atlas-kit@example.com"}?subject=${encodeURIComponent(`[勘误] ${card.title} (${card.slug})`)}&body=${encodeURIComponent(
              `你好, 我发现「${card.title}」有以下问题:\n\n[请描述错误, 如「清明节是 24 节气第 5 个, 但 2006 年才入选非遗」等]\n\n— 来源链接: ${process.env.NEXT_PUBLIC_SITE_URL ?? "https://atlas-kit.vercel.app"}/cards/${card.slug}`,
            )}`}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/80 hover:text-gold-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm transition-colors"
          >
            <AlertCircle className="h-3 w-3" aria-hidden="true" />
            发现错误? 告诉我们
          </a>
        </aside>
      </div>

      {/* 历史沿革 — vertical timeline of 5-8 historical milestones,
          sorted oldest → newest. Each node is {year, title, body}
          drafted by AI + hand-checked (see scripts/draft-history.mjs
          and scripts/handwrite-history.mjs). The rail on the left
          (desktop only) and dot markers echo the /timeline page so
          the site's "temporal" visual language stays consistent. */}
      {card.history && card.history.length > 0 && (
        <section className="mt-16" data-section="history">
          <h2 className="font-serif text-2xl font-bold mb-6 flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-gold-deep" aria-hidden="true" />
            历史沿革
          </h2>
          {/* Relative wrapper so the absolute-positioned rail
              anchors to the section rather than the viewport */}
          <div className="relative">
            <div
              aria-hidden="true"
              className="hidden md:block absolute top-2 bottom-2 left-[6.5rem] w-px bg-gradient-to-b from-gold-deep/40 via-border to-transparent"
            />
            <ol className="space-y-6 list-none p-0">
              {card.history.map((node, idx) => (
                <li key={idx} className="relative md:pl-[8.5rem]">
                  {/* Year stamp — left rail (desktop), inline (mobile) */}
                  <span
                    className="hidden md:block absolute left-0 top-1 w-[5.5rem] text-right text-xs uppercase tracking-[0.15em] text-gold-deep font-medium tabular-nums"
                  >
                    {node.year}
                  </span>
                  {/* Timeline dot (desktop) */}
                  <span
                    aria-hidden="true"
                    className="hidden md:block absolute left-[6.15rem] top-2 h-2.5 w-2.5 rounded-full bg-gold-deep ring-4 ring-background"
                  />
                  <div>
                    <p className="md:hidden text-[10px] uppercase tracking-[0.15em] text-gold-deep font-medium tabular-nums mb-1">
                      {node.year}
                    </p>
                    <h3 className="font-serif text-base font-semibold leading-snug mb-1">
                      {node.title}
                    </h3>
                    <p className="text-sm text-foreground/85 leading-relaxed">
                      {node.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

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

      {/* Series siblings — moved up per the design review so the
          narrative goes: 'other 同类 cards' (thematic neighbours) →
          'siblings in the same series' (within-collection) →
          'tag-based exploration' (related search) → 'external
          reading' (outbound context, end of page). The previous
          order had 同系列 at the very end, which buried the most
          contextually relevant next step. */}
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

      {/* 你可能也会喜欢 — weighted score across cross-cutting
          categorical tags (中国 / 古代 / 江南 / etc). Different
          signal from 同类推荐 (kind-only) and 同系列 (siblings-
          only) above, so the three sections don't overlap. Skip
          if no candidates scored ≥ 3 (very small datasets, or
          very unique cards with no overlap to anything). */}
      {relatedByInterest.length > 0 && (
        <section className="mt-16">
          <h2 className="font-serif text-2xl font-bold mb-6 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-gold-deep" aria-hidden="true" />
            你可能也会喜欢
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {relatedByInterest.map((c) => (
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

      {/* 修订记录 — collapsed by default, expand to see changelog.
          Renders nothing if no revisions exist (60/60 currently
          have 0 entries — the first one is the initial creation,
          which the user / wizard will log manually going forward
          via scripts/log-revision.mjs). */}
      {card.revisions && card.revisions.length > 0 && (
        <section className="mt-16">
          <details className="rounded-lg border border-border bg-card p-4 group">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm">
              <History className="h-4 w-4" aria-hidden="true" />
              修订记录
              <span className="text-xs tabular-nums text-muted-foreground/70">({card.revisions.length} 条)</span>
              <span className="ml-auto text-xs text-gold-deep group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
            </summary>
            <ol className="mt-4 space-y-2 list-none p-0 text-sm">
              {card.revisions
                .slice()
                .reverse() // newest first
                .map((r, i) => (
                  <li key={i} className="flex gap-3 text-muted-foreground">
                    <span className="font-mono text-xs tabular-nums shrink-0 text-foreground/70">
                      {r.date.slice(0, 10)}
                    </span>
                    <span className="flex-1">
                      <span className="text-foreground/90">{r.summary}</span>
                      {r.fields && r.fields.length > 0 && (
                        <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/70 ml-2">
                          [{r.fields.join(", ")}]
                        </span>
                      )}
                    </span>
                  </li>
                ))}
            </ol>
          </details>
        </section>
      )}

      {/* 反向引用 — cards whose body text mentions THIS card.
          Distinguishes the "knowledge graph" feel from the
          recommendation feel above (which is computed by tag
          similarity). The two sections together make the detail
          page feel like a Wikipedia article: see-also links in
          both directions. Newest references first. */}
      {reverseMentions.length > 0 && (
        <section className="mt-16">
          <h2 className="font-serif text-2xl font-bold mb-6 flex items-center gap-2">
            <Link2 className="h-5 w-5 text-gold-deep" aria-hidden="true" />
            提到了「{card.title}」的图鉴
          </h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 list-none p-0">
            {reverseMentions.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/cards/${c.slug}`}
                  className="group flex items-center gap-2.5 rounded-md border border-border bg-card p-3 hover:border-gold hover:shadow-card transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <div
                    className="relative h-10 w-7 shrink-0 overflow-hidden rounded-sm"
                    style={{ backgroundColor: c.palette[0] }}
                  >
                    <Image
                      src={c.image_thumb ?? c.image}
                      alt=""
                      fill
                      sizes="28px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-sm font-medium leading-snug truncate group-hover:text-gold-deep transition-colors">{c.title}</p>
                    <p className="text-[10px] text-muted-foreground/70 tabular-nums">{c.seriesNo} · {c.kind}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 相关搜索 — show this card's tags as clickable pills. Tapping a
          pill jumps to /search?q=<tag> or /cards?tag=<tag> so the
          user can keep exploring the topic tree from the page they
          just read, without re-typing the keyword. */}
      {card.tags.length > 0 && (
        <section className="mt-12">
          <h2 className="font-serif text-lg font-semibold mb-3 text-muted-foreground">相关搜索</h2>
          <ul className="flex flex-wrap gap-2 list-none p-0">
            {card.tags.map((tag) => (
              <li key={tag}>
                <Link
                  href={`/cards?tag=${encodeURIComponent(tag)}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:border-gold hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
                >
                  <Search className="h-3.5 w-3.5" aria-hidden="true" />
                  #{tag}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 参考来源 — hand-picked 2-4 sources per card (encyclopedia
          editions, museum collections, academic papers). Drawn
          from data/cards.json:sources, drafted by AI + reviewed
          in scripts/draft-sources.mjs. Goes BEFORE 延伸阅读 so
          curated references take priority over the generic
          Wikipedia/百度 fallback. Renders nothing if no sources. */}
      {card.sources && card.sources.length > 0 && (
        <section className="mt-12">
          <h2 className="font-serif text-2xl font-bold mb-6 flex items-center gap-2">
            <Quote className="h-5 w-5 text-gold-deep" aria-hidden="true" />
            参考来源
          </h2>
          <ul className="divide-y divide-border/60 list-none p-0">
            {card.sources.map((s, i) => (
              <li key={i}>
                <a
                  href={s.url || "#"}
                  target={s.url ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  aria-disabled={!s.url}
                  className={cn(
                    "group flex items-center gap-3 py-3.5 transition-colors rounded-sm",
                    s.url
                      ? "hover:text-gold-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      : "text-muted-foreground/60 cursor-not-allowed",
                  )}
                >
                  <SourceIcon type={s.type} />
                  <span className="font-serif text-sm font-medium truncate">{s.title}</span>
                  <span className="hidden sm:inline text-[10px] uppercase tracking-[0.15em] text-muted-foreground/70 shrink-0">
                    {s.type}
                  </span>
                  {s.url && (
                    <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-gold-deep transition-colors shrink-0 ml-auto" aria-hidden="true" />
                  )}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 延伸阅读 — 外部权威百科 (Wikipedia 中文 / 百度百科)
          Stacked full-width text rows (NOT a 2-col image+text card grid) to
          break the 3rd consecutive image+text-split section per the design
          review (zigzag cap = max 2 in a row). Now at the end of the
          page — external reading is the natural closer. */}
      <section className="mt-12">
        <h2 className="font-serif text-2xl font-bold mb-6">延伸阅读</h2>
        <ul className="divide-y divide-border/60 list-none p-0">
          <li>
            <a
              href={`https://zh.wikipedia.org/wiki/${encodeURIComponent(card.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 py-3.5 hover:text-gold-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm transition-colors"
            >
              <BookOpen className="h-4 w-4 text-muted-foreground group-hover:text-gold-deep transition-colors shrink-0" aria-hidden="true" />
              <span className="font-serif text-sm font-medium">维基百科</span>
              <span className="text-xs text-muted-foreground">· {card.title} · 自由百科全书</span>
              <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-gold-deep transition-colors shrink-0 ml-auto" aria-hidden="true" />
            </a>
          </li>
          <li>
            <a
              href={`https://baike.baidu.com/item/${encodeURIComponent(card.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 py-3.5 hover:text-gold-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm transition-colors"
            >
              <BookMarked className="h-4 w-4 text-muted-foreground group-hover:text-gold-deep transition-colors shrink-0" aria-hidden="true" />
              <span className="font-serif text-sm font-medium">百度百科</span>
              <span className="text-xs text-muted-foreground">· {card.title} · 中文百科</span>
              <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-gold-deep transition-colors shrink-0 ml-auto" aria-hidden="true" />
            </a>
          </li>
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          外部链接仅供参考, 内容以本站图鉴及权威百科为准。
        </p>
      </section>
    </article>
  );
}