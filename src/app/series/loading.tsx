import { Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div
      className="container py-12 md:py-16"
      aria-busy="true"
      aria-label="正在加载图鉴列表"
    >
      {/* Series header placeholder */}
      <div className="mb-10 max-w-2xl space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-1/2" />
        <Skeleton className="h-5 w-2/3" />
      </div>

      {/* 3 series card rows (image + title + description + tags) */}
      <div className="space-y-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-lg border border-border bg-card shadow-card"
          >
            <div className="flex flex-col md:flex-row">
              <Skeleton className="w-full md:w-[200px] shrink-0 aspect-[9/16]" />
              <div className="flex-1 p-5 space-y-3">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex gap-1.5 mt-3">
                  {Array.from({ length: 5 }).map((__, j) => (
                    <Skeleton key={j} className="h-12 w-12 rounded-sm" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
