"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2 } from "lucide-react"
import { subscribeNewsletter } from "@/app/actions/newsletter"
import { toast } from "sonner"

export default function NewsletterForm() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async () => {
    if (!email.trim()) {
      toast.error("Veuillez saisir votre email.")
      return
    }
    setLoading(true)
    try {
      const res = await subscribeNewsletter(email)
      if (res.success) {
        setDone(true)
        setEmail("")
        toast.success("Inscription confirmée ! Bienvenue dans le cercle.")
      } else {
        toast.error(res.error || "Erreur lors de l'inscription.")
      }
    } catch {
      toast.error("Erreur lors de l'inscription.")
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto rounded-[24px] bg-orange-500/10 border border-orange-500/30 px-8 py-10">
        <p className="text-2xl font-black uppercase italic text-orange-500">Vous êtes inscrit !</p>
        <p className="text-zinc-400 mt-2">Surveillez votre boîte mail pour nos prochaines nouveautés.</p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto relative">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleSubmit() }}
        placeholder="Votre email premium..."
        disabled={loading}
        className="w-full bg-zinc-900/50 border border-white/10 rounded-[24px] px-8 py-6 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 transition-all text-lg font-medium"
      />
      <Button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full mt-6 rounded-[24px] bg-white text-black hover:bg-zinc-200 font-black h-16 text-lg uppercase italic tracking-tighter"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "S'abonner maintenant"}
      </Button>
      <p className="mt-6 text-zinc-600 text-sm flex items-center justify-center gap-2">
        <Sparkles className="w-4 h-4" /> Pas de spam. Uniquement de l'énergie.
      </p>
    </div>
  )
}
