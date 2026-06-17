/**
 * R35 (2026-06-17): /cards/[slug] detail page loading.
 *
 * R34 翻图录体验 (prev/next 点击 / ←/→ 键盘 / mobile swipe)
 * 触发路由切换时, Next.js dev mode 需要 1-3s 编译 RSC
 * payload, 之前这个页面没有自己的 loading.tsx, 用户看到白屏.
 * 现在用 SkeletonHero + SkeletonSection 镜像真实页面结构,
 * 避免 layout shift + 给用户"在加载"的反馈.
 *
 * 镜像的页面结构:
 * - 顶部 nav bar (R34 CardNav prev/next bar) — 用 Skeleton row
 * - breadcrumb
 * - hero (9:16 大图 + 标题 + 副标题)
 * - 2-3 sections (历史沿革, 同类推荐, 等)
 */

import { Skeleton, SkeletonHero, SkeletonSection } from "@/components/skeleton";

export default function Loading() {
  return (
    <div
      className="container py-12 md:py-16"
      aria-busy="true"
      aria-label="正在加载图鉴详情"
    >
      {/* R34 CardNav bar placeholder */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>

      {/* Breadcrumb placeholder */}
      <div className="mb-6 flex gap-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Hero (image + title + subtitle) */}
      <SkeletonHero className="mb-12" />

      {/* 3 detail sections (历史沿革 / 同类推荐 / 同系列) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-10">
        <div className="space-y-10">
          <SkeletonSection />
          <SkeletonSection />
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </div>
  );
}
