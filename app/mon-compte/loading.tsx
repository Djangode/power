export default function MonCompteLoading() {
  return (
    <div className="min-h-screen bg-black px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="h-8 w-40 bg-zinc-800 rounded-lg animate-pulse" />

        {/* Profile card skeleton */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 bg-zinc-800 rounded-full animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-32 bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-48 bg-zinc-800 rounded animate-pulse" />
            </div>
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-zinc-800 rounded-xl animate-pulse" />
          ))}
        </div>

        {/* Orders skeleton */}
        <div className="h-6 w-32 bg-zinc-800 rounded animate-pulse" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-3">
            <div className="flex justify-between">
              <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse" />
            </div>
            <div className="h-4 w-full bg-zinc-800 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
