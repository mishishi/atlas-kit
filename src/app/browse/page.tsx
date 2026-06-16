import { redirect } from "next/navigation";

/**
 * /browse is deprecated — the kind-filter and per-kind preview view
 * are now both served by /cards (with or without ?kind=). We redirect
 * /browse[?kind=X] → /cards[?kind=X] so existing links keep working
 * (and old search-result deeplinks stay valid). 308 is the permanent
 * status so crawlers update their index.
 */
export default function BrowseRedirect({ searchParams }: { searchParams: { kind?: string } }) {
  const qs = searchParams.kind ? `?kind=${encodeURIComponent(searchParams.kind)}` : "";
  redirect(`/cards${qs}`);
}
