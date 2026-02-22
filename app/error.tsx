"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Erreur non catchée:", error)
  }, [error])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl font-black italic text-orange-500 mb-4">OUPS</div>
        <h1 className="text-2xl font-bold text-white mb-2">Une erreur est survenue</h1>
        <p className="text-zinc-400 mb-8">
          Quelque chose s&apos;est mal passé. Réessayez ou revenez à l&apos;accueil.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-full transition-colors"
          >
            Réessayer
          </button>
          <a
            href="/"
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-full transition-colors"
          >
            Retour à l&apos;accueil
          </a>
        </div>
      </div>
    </div>
  )
}
