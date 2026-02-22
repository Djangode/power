"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard, ExternalLink, ShieldCheck } from "lucide-react"

export default function PaymentTab() {
  const [loading, setLoading] = useState(false)

  const handleManagePayments = async () => {
    setLoading(true)
    try {
      // Redirection vers le Stripe Customer Portal
      const res = await fetch("/api/stripe/portal", { method: "POST" })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error("Erreur Stripe Portal:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <Card className="glassmorphism bg-zinc-900/40 border-white/5 overflow-hidden rounded-[32px]">
        <CardHeader className="border-b border-white/5 pb-8">
          <CardTitle className="text-2xl font-black uppercase italic tracking-tighter">
            Moyens de <span className="text-orange-500">Paiement</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-8">
          <div className="text-center py-12 space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-zinc-800 flex items-center justify-center mx-auto border border-white/10">
              <CreditCard className="h-10 w-10 text-orange-500" />
            </div>

            <div>
              <h3 className="text-xl font-black uppercase italic text-white mb-2">Paiement sécurisé via Stripe</h3>
              <p className="text-zinc-500 max-w-md mx-auto">
                Vos informations de paiement sont gérées de manière sécurisée par Stripe.
                Vous pouvez gérer vos cartes et consulter vos factures via le portail client.
              </p>
            </div>

            <Button
              onClick={handleManagePayments}
              disabled={loading}
              className="rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black uppercase italic tracking-tighter h-14 px-8 shadow-lg shadow-orange-500/20"
            >
              <ExternalLink className="h-5 w-5 mr-2" />
              {loading ? "Chargement..." : "Gérer mes moyens de paiement"}
            </Button>

            <div className="flex items-center justify-center gap-2 text-zinc-600 text-sm">
              <ShieldCheck className="h-4 w-4" />
              <span>Paiements chiffrés et conformes PCI DSS</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
