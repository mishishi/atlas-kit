import { Skeleton, SkeletonCard } from "@/components/skeleton";

export default function Loading() {
  return (
    <div
      className="container py-12 md:py-16"
      aria-busy="true"
      aria-label="正在加载卡片"
    >
      <Skeleton className="mb-6 h-5 w-48" />
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
