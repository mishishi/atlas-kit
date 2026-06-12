export default function Loading() {
  return (
    <div className="container py-12 md:py-16" aria-busy="true" aria-label="正在加载卡片">
      <div className="mb-6 h-5 w-48 rounded skeleton" />
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-lg border border-border bg-card"
            aria-hidden="true"
          >
            <div className="aspect-[9/16] w-full skeleton" />
            <div className="p-3 space-y-2">
              <div className="h-4 w-3/4 rounded skeleton" />
              <div className="h-3 w-1/2 rounded skeleton" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
