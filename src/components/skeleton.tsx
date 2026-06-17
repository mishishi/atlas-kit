/**
 * R35 (2026-06-17): 可复用 skeleton 系统.
 *
 * 之前 3 个 loading.tsx 都手写 `<div className="... skeleton">`,
 * 没有 import 路径. 改用 primitive:
 *
 *   <Skeleton />            — 基础块, 自动圆角 + shimmer
 *   <SkeletonText lines={3}/> — N 行文字, 最后一行 75% 宽
 *   <SkeletonImage />       — 9:16 竖图 (跟卡片 hero 比例一致)
 *   <SkeletonCard />        — 网格卡片 (image + title + subtitle)
 *   <SkeletonHero />        — 详情页 hero (image + title + subtitle)
 *   <SkeletonSection />     — 段落 (heading + N 行)
 *
 * 配合 globals.css 里的 `.skeleton` 类 (shimmer 动画 1.5s),
 * 颜色跟 theme 走 (light/dark 都用 --muted, 不硬编).
 *
 * 设计原则:
 * 1. 形状跟真实内容一致 — 避免 "loading 时长方形, 加载后是图" 的跳变
 * 2. aria-busy + aria-label 让 SR 知道这是加载状态 (不是空内容)
 * 3. 所有 skeleton div 都 aria-hidden (装饰, 不读出来)
 * 4. 颜色用 --muted token, light/dark 都自然
 */

import { cn } from "@/lib/utils";

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: DivProps) {
  return (
    <div
      className={cn("skeleton rounded-md", className)}
      aria-hidden="true"
      {...props}
    />
  );
}

/** 一段 N 行文字, 最后一行 75% 宽 (常见段落末尾短行) */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i === lines - 1 ? "w-3/4" : "w-full")}
        />
      ))}
    </div>
  );
}

/** 9:16 竖图占位 — 跟卡片 hero 比例一致, 避免 shape 跳变 */
export function SkeletonImage({ className }: { className?: string }) {
  return <Skeleton className={cn("aspect-[9/16] w-full", className)} />;
}

/** 网格卡片 (首页 / /all / /cards 列表) */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card",
        className,
      )}
    >
      <SkeletonImage />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

/** 详情页 hero — 9:16 大图 + 标题 + 副标题 */
export function SkeletonHero({ className }: { className?: string }) {
  return (
    <div
      className={cn("space-y-4", className)}
      aria-busy="true"
      aria-label="正在加载图鉴"
    >
      <div className="mx-auto w-full max-w-[480px]">
        <Skeleton className="aspect-[9/16] w-full rounded-lg" />
      </div>
      <div className="space-y-2 text-center">
        <Skeleton className="mx-auto h-7 w-2/3" />
        <Skeleton className="mx-auto h-4 w-1/2" />
      </div>
    </div>
  );
}

/** 段落: 标题 + 文字块 */
export function SkeletonSection({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      <Skeleton className="h-6 w-1/3" />
      <SkeletonText lines={3} />
      <SkeletonText lines={2} />
    </div>
  );
}
