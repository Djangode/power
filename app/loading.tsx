export default function Loading() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )
}
