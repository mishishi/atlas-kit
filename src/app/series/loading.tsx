export default function Loading() {
  return (
    <div className="container py-12 md:py-16" aria-busy="true" aria-label="正在加载图鉴列表">
      <div className="mb-10 max-w-2xl">
        <div className="mb-2 h-4 w-24 rounded skeleton" />
        <div className="mb-3 h-9 w-1/2 rounded skeleton" />
        <div className="h-5 w-2/3 rounded skeleton" />
      </div>
      <div className="space-y-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-lg border border-border bg-card shadow-card"
            aria-hidden="true"
          >
            <div className="flex flex-col md:flex-row">
              <div className="w-full md:w-[200px] shrink-0 aspect-[9/16] md:aspect-[9/16] skeleton" />
              <div className="flex-1 p-5 space-y-3">
                <div className="h-6 w-1/3 rounded skeleton" />
                <div className="h-4 w-2/3 rounded skeleton" />
                <div className="h-3 w-1/2 rounded skeleton" />
                <div className="flex gap-1.5 mt-3">
                  {Array.from({ length: 5 }).map((__, j) => (
                    <div key={j} className="h-12 w-12 rounded-sm skeleton" />
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
