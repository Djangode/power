"use client"

import { useEffect } from "react"

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Erreur admin:", error)
  }, [error])

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="text-5xl font-black italic text-orange-500 mb-4">ERREUR</div>
        <h1 className="text-xl font-bold text-white mb-2">Erreur dans le dashboard</h1>
        <p className="text-zinc-400 mb-6 text-sm">
          Une erreur inattendue est survenue dans le panneau d&apos;administration.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors text-sm"
          >
            Réessayer
          </button>
          <a
            href="/admin"
            className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg transition-colors text-sm"
          >
            Retour au dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
