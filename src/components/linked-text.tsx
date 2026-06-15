"use client";

/**
 * LinkedText — renders a body of text, turning every occurrence of a
 * known card title into an internal <Link> to that card.
 *
 * Used by the detail page to make the description body navigable:
 * "清明节, 又称踏青节, 与 寒食节 紧密相连" becomes
 * "清明节[link], 又称踏青节, 与 寒食节[link] 紧密相连".
 *
 * Implementation notes:
 * - Server components can't use dangerouslySetInnerHTML for clickable
 *   links, and we want real <a> tags (not text + onClick), so this
 *   is a small client component. Bundle cost is ~1KB.
 * - We split the string by a single regex with all mention titles
 *   joined, then walk the resulting array, mapping non-match
 *   segments to <span> and match segments to <Link>.
 * - We sort mentions by length DESC so "西安事变" matches before
 *   "西安" (otherwise "西安" would steal the match).
 */
import Link from "next/link";
import { Fragment, useMemo } from "react";

interface LinkedTextProps {
  text: string;
  /** Map of title → slug, for the cards this text might mention. */
  titleToSlug: Record<string, string>;
  className?: string;
}

export function LinkedText({ text, titleToSlug, className }: LinkedTextProps) {
  const segments = useMemo(() => {
    const titles = Object.keys(titleToSlug).sort((a, b) => b.length - a.length);
    if (titles.length === 0) return [{ type: "text" as const, value: text }];
    // Escape regex special chars in titles
    const escaped = titles.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const re = new RegExp(`(${escaped.join("|")})`, "g");
    const parts = text.split(re);
    return parts.map((part) => {
      const slug = titleToSlug[part];
      return slug
        ? { type: "link" as const, value: part, slug }
        : { type: "text" as const, value: part };
    });
  }, [text, titleToSlug]);

  return (
    <span className={className}>
      {segments.map((seg, i) => {
        if (seg.type === "link") {
          return (
            <Link
              key={i}
              href={`/cards/${seg.slug}`}
              className="text-gold-deep underline decoration-gold-deep/40 underline-offset-2 hover:decoration-gold-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm transition-colors"
            >
              {seg.value}
            </Link>
          );
        }
        return <Fragment key={i}>{seg.value}</Fragment>;
      })}
    </span>
  );
}
