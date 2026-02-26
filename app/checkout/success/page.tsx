"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CheckCircle2, Package, Truck, Clock, ArrowRight, Loader2, ShoppingBag, MapPin } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

interface OrderData {
  id: string
  orderNumber: string
  total: number
  deliveryMethod: string | null
  deliveryDate: string | null
  deliverySlot: string | null
  deliveryAddress: string | null
  deliveryCity: string | null
  deliveryPostalCode: string | null
  deliveryFee: number
  pickupCode: string | null
  status: string
  createdAt: string
  items: {
    name: string
    quantity: number
    price: number
  }[]
}

function SuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!sessionId) {
      setLoading(false)
      setError(true)
      return
    }

    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/by-session?session_id=${sessionId}`)
        if (res.ok) {
          const data = await res.json()
          setOrder(data)
        } else {
          setError(true)
        }
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    // Small delay to allow webhook to process
    const timer = setTimeout(fetchOrder, 1500)
    return () => clearTimeout(timer)
  }, [sessionId])

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Header />
        <div className="pt-32 pb-16 px-4 flex flex-col items-center justify-center gap-6">
          <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
          <p className="text-zinc-400 text-lg">Confirmation de votre paiement en cours...</p>
        </div>
        <Footer />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Header />
        <div className="pt-32 pb-16 px-4 max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-orange-500" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-4">
            Merci pour votre <span className="text-orange-500">commande !</span>
          </h1>
          <p className="text-zinc-400 mb-8">
            Votre paiement a été traité avec succès. Vous recevrez un email de confirmation sous peu.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-8 py-6 font-bold">
              <Link href="/mon-compte">Voir mes commandes</Link>
            </Button>
            <Button asChild variant="outline" className="border-white/10 text-white hover:bg-white/5 rounded-full px-8 py-6 font-bold">
              <Link href="/#marketplace">Continuer mes achats</Link>
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <div className="pt-32 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-500">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
              Commande <span className="text-orange-500">confirmée !</span>
            </h1>
            <p className="text-zinc-400 text-lg">
              Merci pour votre confiance. Un email de confirmation vous a été envoyé.
            </p>
          </div>

          {/* Order Summary Card */}
          <Card className="glassmorphism bg-zinc-900/40 border-white/10 rounded-3xl overflow-hidden mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
            <CardContent className="p-0">
              {/* Order Header */}
              <div className="p-6 bg-white/5 border-b border-white/5 flex flex-col sm:flex-row justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">Commande</p>
                  <p className="text-xl font-black text-orange-500">{order.orderNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">Total payé</p>
                  <p className="text-2xl font-black text-white">{order.total.toFixed(2)}€</p>
                </div>
              </div>

              {/* Items */}
              <div className="p-6 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3">Articles commandés</p>
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center bg-white/5 rounded-xl p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center">
                        <ShoppingBag className="w-4 h-4 text-orange-500" />
                      </div>
                      <span className="text-white font-medium">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-zinc-400 text-sm">x{item.quantity}</span>
                      <span className="text-white font-bold">{(item.price * item.quantity).toFixed(2)}€</span>
                    </div>
                  </div>
                ))}

                <Separator className="bg-white/10 my-4" />

                <div className="flex justify-between text-sm text-zinc-400">
                  <span>Livraison</span>
                  <span className={order.deliveryFee === 0 ? "text-green-400" : "text-white"}>
                    {order.deliveryFee === 0 ? "Gratuit" : `${order.deliveryFee.toFixed(2)}€`}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Info */}
          <Card className="glassmorphism bg-zinc-900/40 border-white/10 rounded-3xl overflow-hidden mb-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <CardContent className="p-6">
              {order.deliveryMethod === "retrait" ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-bold text-white">Retrait en magasin</p>
                      <p className="text-sm text-zinc-400">Power — Primeur, 97100 Guadeloupe</p>
                    </div>
                  </div>
                  {order.pickupCode && (
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 text-center">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500/60 mb-2">Code de retrait</p>
                      <p className="text-3xl font-black text-orange-500 tracking-[0.3em]">{order.pickupCode}</p>
                      <p className="text-xs text-zinc-400 mt-2">Présentez ce code lors du retrait</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <span>Disponible sous 2h après confirmation</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
                      <Truck className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-bold text-white">Livraison à domicile</p>
                      {order.deliveryAddress && (
                        <p className="text-sm text-zinc-400">
                          {order.deliveryAddress}, {order.deliveryPostalCode} {order.deliveryCity}
                        </p>
                      )}
                    </div>
                  </div>
                  {order.deliverySlot && (
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Clock className="w-4 h-4 text-orange-500" />
                      <span>Créneau : {order.deliverySlot}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="glassmorphism bg-zinc-900/40 border-white/10 rounded-3xl overflow-hidden mb-8 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-400">
            <CardContent className="p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-6">Suivi de commande</p>
              <div className="space-y-0">
                {[
                  { label: "Commande confirmée", icon: CheckCircle2, active: true },
                  { label: "En préparation", icon: Package, active: false },
                  { label: order.deliveryMethod === "retrait" ? "Prête à retirer" : "En livraison", icon: Truck, active: false },
                  { label: order.deliveryMethod === "retrait" ? "Retirée" : "Livrée", icon: CheckCircle2, active: false },
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step.active ? "bg-green-500/20" : "bg-white/5"}`}>
                        <step.icon className={`w-4 h-4 ${step.active ? "text-green-500" : "text-zinc-600"}`} />
                      </div>
                      {i < 3 && <div className={`w-0.5 h-8 ${step.active ? "bg-green-500/30" : "bg-white/5"}`} />}
                    </div>
                    <p className={`font-bold mt-1 ${step.active ? "text-green-500" : "text-zinc-600"}`}>{step.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-8 py-6 font-bold gap-2">
              <Link href={`/commandes/${order.id}`}>
                Suivre ma commande <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-white/10 text-white hover:bg-white/5 rounded-full px-8 py-6 font-bold">
              <Link href="/#marketplace">Continuer mes achats</Link>
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
