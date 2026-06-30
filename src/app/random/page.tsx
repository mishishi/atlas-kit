/**
 * R52 (2026-06-22): /random — interactive discovery page.
 *
 * Replaces the R37 302 redirect with a client-side island that:
 *   - Shows a hero card preview (image + meta + 4 action buttons)
 *   - Filters by 24 kinds via URL `?kind=X` deep link
 *   - Avoids repeating the same card in one session
 *   - Supports Space reroll + 同系列再抽
 *
 * Server shell is intentionally thin (only metadata + data fetch).
 * `Suspense` wraps the client island because it uses
 * `useSearchParams()` (which opts the whole page out of static
 * generation unless wrapped in Suspense).
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import { getAllCards } from "@/lib/data";
import { RandomClient } from "@/components/random-client";

export const metadata: Metadata = {
  title: "随机一张 · 图鉴社",
  description: "从 600 张图鉴里随机抽一张看看,支持按类型筛选。",
};

export default function RandomPage() {
  const allCards = getAllCards();
  return (
    <main id="main" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2">
          随机一张
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          不知道想看什么?点「再换一张」,或者按类型缩小范围。同一会话不会连续重复。
        </p>
      </div>
      <Suspense
        fallback={
          <div className="rounded-lg border border-dashed border-border bg-card/50 px-6 py-16 text-center">
            <p className="text-muted-foreground">正在准备…</p>
          </div>
        }
      >
        <RandomClient allCards={allCards} />
      </Suspense>
    </main>
  );
}