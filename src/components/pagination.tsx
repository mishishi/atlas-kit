import Link from "next/link";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
  /** Additional query params (kind / tag) preserved across pages. */
  searchParams?: Record<string, string>;
}

function buildHref(basePath: string, page: number, params: Record<string, string>): string {
  const sp = new URLSearchParams(params);
  if (page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** Previous / next + numbered page links, with leading-ellipsis truncation. */
export function Pagination({ currentPage, totalPages, basePath, searchParams = {} }: PaginationProps) {
  if (totalPages <= 1) return null;

  const prev = currentPage > 1 ? currentPage - 1 : null;
  const next = currentPage < totalPages ? currentPage + 1 : null;

  // Show: 1, …, current-1, current, current+1, …, total
  const pages = new Set<number>([1, totalPages, currentPage]);
  if (currentPage - 1 >= 1) pages.add(currentPage - 1);
  if (currentPage + 1 <= totalPages) pages.add(currentPage + 1);
  const sorted = [...pages].sort((a, b) => a - b);

  // Insert ellipsis markers
  const items: (number | "ellipsis")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) items.push("ellipsis");
    items.push(sorted[i]);
  }

  return (
    <nav
      aria-label="分页"
      className="mt-10 flex items-center justify-center gap-1 text-sm"
    >
      {prev ? (
        <Link
          href={buildHref(basePath, prev, searchParams)}
          rel="prev"
          className="inline-flex min-h-[44px] items-center rounded-md border border-border bg-card px-3 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          上一页
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="inline-flex min-h-[44px] items-center rounded-md border border-border/50 bg-card/40 px-3 text-muted-foreground/50"
        >
          上一页
        </span>
      )}

      <ol className="mx-1 flex items-center gap-1 list-none p-0">
        {items.map((it, idx) =>
          it === "ellipsis" ? (
            <li
              key={`e${idx}`}
              aria-hidden="true"
              className="px-1 text-muted-foreground"
            >
              …
            </li>
          ) : (
            <li key={it}>
              {it === currentPage ? (
                <span
                  aria-current="page"
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md bg-gold text-cream font-medium"
                >
                  {it}
                </span>
              ) : (
                <Link
                  href={buildHref(basePath, it, searchParams)}
                  aria-label={`第 ${it} 页`}
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {it}
                </Link>
              )}
            </li>
          ),
        )}
      </ol>

      {next ? (
        <Link
          href={buildHref(basePath, next, searchParams)}
          rel="next"
          className="inline-flex min-h-[44px] items-center rounded-md border border-border bg-card px-3 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          下一页
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="inline-flex min-h-[44px] items-center rounded-md border border-border/50 bg-card/40 px-3 text-muted-foreground/50"
        >
          下一页
        </span>
      )}
    </nav>
  );
}
