export default function Loading() {
  return (
    <div className="container py-12 md:py-16">
      <div className="mb-8 h-10 w-1/3 rounded skeleton" aria-hidden="true" />
      <div className="mb-4 h-5 w-1/2 rounded skeleton" aria-hidden="true" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
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
