"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, ShieldCheck } from "lucide-react"

export default function PaymentTab() {
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
              <Wallet className="h-10 w-10 text-orange-500" />
            </div>

            <div>
              <h3 className="text-xl font-black uppercase italic text-white mb-2">Paiement à la réception</h3>
              <p className="text-zinc-500 max-w-md mx-auto">
                Le règlement s&apos;effectue directement au retrait en magasin ou à la livraison,
                en espèces ou par carte. Aucune carte n&apos;est enregistrée en ligne.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-zinc-600 text-sm">
              <ShieldCheck className="h-4 w-4" />
              <span>Aucune donnée bancaire stockée</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
