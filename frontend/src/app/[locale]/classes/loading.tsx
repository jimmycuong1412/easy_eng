export default function ClassesLoading() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-8 h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4">
            <div className="mb-4 h-40 animate-pulse rounded bg-muted" />
            <div className="mb-2 h-5 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
