"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  CheckCircle2, Package, Truck, Clock, ArrowLeft, Loader2,
  ShoppingBag, MapPin, FileText, Download, RotateCcw
} from "lucide-react"

interface OrderDetail {
  id: string
  orderNumber: string
  total: number
  status: string
  deliveryMethod: string | null
  deliveryDate: string | null
  deliverySlot: string | null
  deliveryAddress: string | null
  deliveryCity: string | null
  deliveryPostalCode: string | null
  deliveryFee: number
  pickupCode: string | null
  carrier: string | null
  trackingNumber: string | null
  invoiceNumber: string | null
  createdAt: string
  items: {
    name: string
    quantity: number
    price: number
    image: string | null
  }[]
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "En attente", color: "text-orange-500/60", bg: "bg-orange-500/10" },
  validated: { label: "Validée", color: "text-orange-500", bg: "bg-orange-500/10" },
  processing: { label: "En préparation", color: "text-blue-400", bg: "bg-blue-500/10" },
  shipped: { label: "Expédiée", color: "text-purple-400", bg: "bg-purple-500/10" },
  delivered: { label: "Livrée", color: "text-green-500", bg: "bg-green-500/10" },
  cancelled: { label: "Annulée", color: "text-red-500", bg: "bg-red-500/10" },
}

const timelineSteps = [
  { key: "validated", label: "Confirmée", icon: CheckCircle2 },
  { key: "processing", label: "En préparation", icon: Package },
  { key: "shipped", label: "En livraison", icon: Truck },
  { key: "delivered", label: "Livrée", icon: CheckCircle2 },
]

const statusOrder = ["pending", "validated", "processing", "shipped", "delivered"]

export default function OrderDetailPage() {
  const { id } = useParams()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    fetch(`/api/orders/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setOrder(null)
        } else {
          setOrder(data)
        }
      })
      .catch(() => setOrder(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Header />
        <div className="pt-32 pb-16 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
        </div>
        <Footer />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Header />
        <div className="pt-32 pb-16 px-4 max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-black mb-4">Commande introuvable</h1>
          <p className="text-zinc-400 mb-8">Cette commande n&apos;existe pas ou vous n&apos;y avez pas accès.</p>
          <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-8 py-6">
            <Link href="/mon-compte">Retour à mon compte</Link>
          </Button>
        </div>
        <Footer />
      </div>
    )
  }

  const currentStepIndex = statusOrder.indexOf(order.status)
  const config = statusConfig[order.status] || statusConfig.pending

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <div className="pt-32 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/mon-compte" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8">
            <ArrowLeft className="h-4 w-4" /> Retour à mon compte
          </Link>

          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                Commande <span className="text-orange-500">{order.orderNumber}</span>
              </h1>
              <p className="text-zinc-400 mt-1">
                Passée le {new Date(order.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <Badge className={`${config.bg} ${config.color} border-0 font-black uppercase text-xs tracking-widest px-4 py-2`}>
              {config.label}
            </Badge>
          </div>

          {/* Timeline */}
          {order.status !== "cancelled" && (
            <Card className="glassmorphism bg-zinc-900/40 border-white/10 rounded-3xl mb-6">
              <CardContent className="p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-6">Suivi de commande</p>
                <div className="flex items-center justify-between relative">
                  {/* Progress bar */}
                  <div className="absolute top-4 left-0 right-0 h-0.5 bg-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-green-500 transition-all duration-1000"
                      style={{ width: `${Math.max(0, (currentStepIndex - 1) / (timelineSteps.length - 1)) * 100}%` }}
                    />
                  </div>
                  {timelineSteps.map((step, i) => {
                    const isActive = currentStepIndex >= statusOrder.indexOf(step.key)
                    return (
                      <div key={step.key} className="flex flex-col items-center relative z-10">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 transition-all ${isActive ? "bg-green-500/20 ring-2 ring-green-500/30" : "bg-white/5"}`}>
                          <step.icon className={`w-4 h-4 ${isActive ? "text-green-500" : "text-zinc-600"}`} />
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? "text-green-500" : "text-zinc-600"}`}>
                          {step.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Items */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="glassmorphism bg-zinc-900/40 border-white/10 rounded-3xl">
                <CardContent className="p-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4">Articles</p>
                  <div className="space-y-3">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between items-center bg-white/5 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
                            <ShoppingBag className="w-5 h-5 text-orange-500" />
                          </div>
                          <div>
                            <p className="text-white font-bold">{item.name}</p>
                            <p className="text-zinc-400 text-sm">{item.price.toFixed(2)}€ x {item.quantity}</p>
                          </div>
                        </div>
                        <span className="text-white font-black">{(item.price * item.quantity).toFixed(2)}€</span>
                      </div>
                    ))}
                  </div>

                  <Separator className="bg-white/10 my-4" />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-zinc-400">
                      <span>Sous-total</span>
                      <span className="text-white">{(order.total - order.deliveryFee).toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between text-sm text-zinc-400">
                      <span>Livraison</span>
                      <span className={order.deliveryFee === 0 ? "text-green-400" : "text-white"}>
                        {order.deliveryFee === 0 ? "Gratuit" : `${order.deliveryFee.toFixed(2)}€`}
                      </span>
                    </div>
                    <Separator className="bg-white/10" />
                    <div className="flex justify-between">
                      <span className="font-bold text-white">Total</span>
                      <span className="text-2xl font-black text-orange-500">{order.total.toFixed(2)}€</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                {order.invoiceNumber && (
                  <Button
                    asChild
                    variant="outline"
                    className="rounded-full border-white/10 text-white hover:bg-white/5 font-bold text-xs h-12 px-6 gap-2"
                  >
                    <a href={`/api/invoices/${order.id}`} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 text-orange-500" /> Télécharger la facture
                    </a>
                  </Button>
                )}
                {order.trackingNumber && (
                  <Button variant="outline" className="rounded-full border-white/10 text-white hover:bg-white/5 font-bold text-xs h-12 px-6 gap-2">
                    <Truck className="h-4 w-4 text-orange-500" /> Suivi : {order.trackingNumber}
                  </Button>
                )}
                <Button asChild variant="outline" className="rounded-full border-white/10 text-white hover:bg-white/5 font-bold text-xs h-12 px-6 gap-2">
                  <Link href="/#marketplace">
                    <RotateCcw className="h-4 w-4 text-orange-500" /> Commander à nouveau
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right: Delivery info */}
            <div className="space-y-6">
              <Card className="glassmorphism bg-zinc-900/40 border-white/10 rounded-3xl">
                <CardContent className="p-6 space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                    {order.deliveryMethod === "retrait" ? "Retrait en magasin" : "Livraison"}
                  </p>
                  {order.deliveryMethod === "retrait" ? (
                    <>
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-orange-500" />
                        <div>
                          <p className="text-white font-bold text-sm">Power — Primeur</p>
                          <p className="text-zinc-400 text-xs">97100 Guadeloupe</p>
                        </div>
                      </div>
                      {order.pickupCode && (
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 text-center">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500/60 mb-1">Code de retrait</p>
                          <p className="text-2xl font-black text-orange-500 tracking-[0.3em]">{order.pickupCode}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-3">
                        <Truck className="w-5 h-5 text-orange-500 mt-0.5" />
                        <div>
                          {order.deliveryAddress ? (
                            <>
                              <p className="text-white font-bold text-sm">{order.deliveryAddress}</p>
                              <p className="text-zinc-400 text-xs">{order.deliveryPostalCode} {order.deliveryCity}</p>
                            </>
                          ) : (
                            <p className="text-zinc-400 text-sm">Adresse non renseignée</p>
                          )}
                        </div>
                      </div>
                      {order.deliverySlot && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-orange-500" />
                          <span className="text-zinc-400">{order.deliverySlot}</span>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {order.carrier && (
                <Card className="glassmorphism bg-zinc-900/40 border-white/10 rounded-3xl">
                  <CardContent className="p-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3">Transporteur</p>
                    <p className="text-white font-bold">{order.carrier}</p>
                    {order.trackingNumber && (
                      <p className="text-orange-500 text-sm mt-1">{order.trackingNumber}</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
