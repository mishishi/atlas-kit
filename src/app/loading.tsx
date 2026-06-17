import { Skeleton, SkeletonCard } from "@/components/skeleton";

export default function Loading() {
  return (
    <div
      className="container py-12 md:py-16"
      aria-busy="true"
      aria-label="正在加载"
    >
      <div className="mb-8 space-y-3 max-w-2xl">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-5 w-1/2" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
