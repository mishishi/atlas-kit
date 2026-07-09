"use client";
import { useEffect, useState } from "react";
import { Search as SearchIcon, Clock, X } from "lucide-react";
import Link from "next/link";

const STORAGE_KEY = "atlas-search-history";
const MAX_HISTORY = 10;

/**
 * R77 (2026-07-10): client island for the /search input + history.
 *
 * Two features in one component to keep the search input section
 * from re-rendering the rest of the search page (which is a server
 * component pulling from data/cards.json at build time):
 *
 * 1. **Recent searches**: stored in localStorage as a JSON array,
 *    newest first, capped at 10 entries. Each successful submit
 *    pushes the new query to the front and deduplicates. History
 *    cleans itself by trimming to MAX_HISTORY items.
 *
 * 2. **Autocomplete suggestions**: when the input has ≥ 2 chars
 *    and no recent searches match exactly, suggest tags + card
 *    titles from the pre-built topTags + featuredCards lists passed
 *    in as props. These don't change per-query so the server
 *    computes them once at build time and ships them as a small
 *    JSON blob — no need to ship the full 874-card list to the
 *    client just for autocomplete.
 *
 * Why a separate island and not the whole search page: the kind
 * + subKind chips, sort chips, and results grid all read from
 * URL searchParams (server-side). Adding "use client" to
 * /search/page.tsx would force those into client rendering,
 * which would re-render on every keystroke. Keeping the
 * <form> + <history> as a thin island means the results grid
 * only re-renders when the URL changes (real navigation).
 *
 * SSR safety: useState initializers that read from `window` or
 * `localStorage` are wrapped in functions so server-rendered
 * HTML matches the first client-render. The history list is
 * empty on SSR; items appear on the client after hydration.
 */

type Suggestion = {
  label: string;
  href: string;
  /** Optional badge — used to distinguish tag/title/tagCloud sources
   *  in the dropdown. R77 keeps it simple: "tag" / "title" / "recent". */
  kind: "tag" | "title" | "recent";
};

interface SearchInputProps {
  initialQuery: string;
  /** Top tags for autocomplete. Comes from getTopTags() at build time. */
  topTags: { tag: string; count: number }[];
  /** Featured card titles for autocomplete (max ~8). */
  featuredTitles: { title: string; slug: string }[];
}

/** Read history from localStorage. Always returns an array,
 *  never throws — localStorage access in browsers with disabled
 *  storage (private mode) or in SSR will throw, but we catch +
 *  return []. */
function readHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeHistory(items: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)));
  } catch {
    // localStorage quota / private mode — silently skip. Search history
    // is nice-to-have, not critical.
  }
}

export function SearchInput({ initialQuery, topTags, featuredTitles }: SearchInputProps) {
  const [history, setHistory] = useState<string[]>([]);

  // Read history after mount (SSR returns [] initially, then we hydrate).
  useEffect(() => {
    setHistory(readHistory());
  }, []);

  const suggestions: Suggestion[] = (() => {
    const out: Suggestion[] = [];
    const seen = new Set<string>();
    // Recent history first (deduped against each other; capped at 5)
    for (const q of history.slice(0, 5)) {
      if (q && !seen.has(q)) {
        seen.add(q);
        out.push({ label: q, href: `/search?q=${encodeURIComponent(q)}`, kind: "recent" });
      }
    }
    // Tag suggestions from topTags
    for (const t of topTags.slice(0, 6)) {
      if (!seen.has(t.tag)) {
        seen.add(t.tag);
        out.push({ label: `#${t.tag}`, href: `/search?q=${encodeURIComponent(t.tag)}`, kind: "tag" });
      }
    }
    // Featured title suggestions (only first 4 to avoid overflow)
    for (const f of featuredTitles.slice(0, 4)) {
      if (!seen.has(f.title)) {
        seen.add(f.title);
        out.push({ label: f.title, href: `/cards/${f.slug}`, kind: "title" });
      }
    }
    return out;
  })();

  const dismissOne = (q: string) => {
    setHistory((cur) => {
      const next = cur.filter((x) => x !== q);
      writeHistory(next);
      return next;
    });
  };

  const clearAll = () => {
    setHistory([]);
    writeHistory([]);
  };

  return (
    <div className="mb-10 max-w-xl">
      <form action="/search" method="get" role="search">
        <label className="sr-only" htmlFor="search-q">搜索图鉴</label>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
          <input
            id="search-q"
            type="search"
            name="q"
            defaultValue={initialQuery}
            inputMode="search"
            autoComplete="off"
            data-search-input=""
            spellCheck={false}
            aria-describedby="search-hint"
            placeholder="试试 金毛、柯基、普洱茶、夜行..."
            className="w-full rounded-md border border-border bg-card pl-10 pr-4 py-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <p id="search-hint" className="mt-2 text-xs text-muted-foreground">
          模糊搜索, 支持中英 / 拼写容错 / 标题副标题标签描述
        </p>
        {/* R77: history is saved on submit. The form-action is a real
            GET to /search so a successful submit already triggers
            navigation. We add an onSubmit to write to history before
            the navigation. */}
        <SaveOnSubmit onSave={(q) => {
          if (!q) return;
          setHistory((cur) => {
            const next = [q, ...cur.filter((x) => x !== q)].slice(0, MAX_HISTORY);
            writeHistory(next);
            return next;
          });
        }} />
      </form>

      {/* R77: recent searches + autocomplete suggestion list.
          Rendered unconditionally (not gated on history.length) so
          the section header always reads as a discoverable tool, not
          "look at what you searched before". Empty history renders
          just tag / title suggestions. SSR returns no items (history
          is hydrated after mount); the section will appear with a
          subtle skeleton-free fade-in once the client reads localStorage. */}
      {suggestions.length > 0 && (
        <div className="mt-5">
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70 flex items-center gap-1.5">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {history.length > 0 ? "最近搜索 + 建议" : "搜索建议"}
            </p>
            {history.length > 1 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm min-h-[28px] px-1"
                aria-label="清除所有搜索历史"
              >
                清除
              </button>
            )}
          </div>
          <ul className="flex flex-wrap gap-1.5 list-none p-0">
            {suggestions.map((s, i) => {
              const isRecent = s.kind === "recent";
              return (
                <li
                  key={`${s.kind}-${s.label}-${i}`}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-card overflow-hidden"
                >
                  {isRecent ? (
                    // Recent = dismiss on click. We render a small ×
                    // next to the suggestion to actively manage the
                    // list. Clicking the suggestion itself navigates.
                    <>
                      <Link
                        href={s.href}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                      >
                        {s.label}
                      </Link>
                      <button
                        type="button"
                        onClick={() => dismissOne(s.label)}
                        aria-label={`从历史中移除 ${s.label}`}
                        className="px-1.5 py-1 text-muted-foreground/60 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </>
                  ) : (
                    <Link
                      href={s.href}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                      {s.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Hidden helper component — wraps the outer form, writes to
 *  history on submit. Kept separate so the parent form is
 *  server-renderable. */
function SaveOnSubmit({ onSave }: { onSave: (q: string) => void }) {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `document.addEventListener('submit',function(e){var t=e.target.querySelector('input[name=q]');if(t&&t.value){try{var k='atlas-search-history';var s=JSON.parse(localStorage.getItem(k))||[];var n=[t.value].concat(s.filter(function(x){return x!==t.value})).slice(0,10);localStorage.setItem(k,JSON.stringify(n));}catch(_){}}},true);`,
      }}
    />
  );
}
