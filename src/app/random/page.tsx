import { redirect } from "next/navigation";
import { getAllCards } from "@/lib/data";

/**
 * /random — 302 redirect to a random card detail page.
 * Built as a route, not a /cards/random link in nav, so the URL
 * is shareable (people can hit refresh to keep exploring).
 *
 * Why pick the slug at request time rather than caching one:
 * refresh should feel like a new card each time, otherwise the
 * page becomes useless after the first visit.
 */
export const dynamic = "force-dynamic";

export default function RandomPage() {
  const cards = getAllCards();
  if (cards.length === 0) redirect("/");
  const card = cards[Math.floor(Math.random() * cards.length)];
  redirect(`/cards/${card.slug}`);
}
