"use client"

import React, { useState } from "react"
import { AppSidebar } from "@/components/admin/app-sidebar"
import { SiteHeader } from "@/components/admin/site-header"
import { SidebarInset, SidebarProvider } from "@/components/admin/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card"
import { Button } from "@/components/admin/ui/button"
import { Input } from "@/components/admin/ui/input"
import { Label } from "@/components/admin/ui/label"
import { Badge } from "@/components/admin/ui/badge"
import { Separator } from "@/components/admin/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select"
import { Mail, Tag, Send, Loader2, Gift, Percent, Sparkles, CheckCircle } from "lucide-react"

export default function MarketingPage() {
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [lastResult, setLastResult] = useState<{ sent: number; promoCode: string | null } | null>(null)

  // Promo options
  const [includePromo, setIncludePromo] = useState(false)
  const [promoType, setPromoType] = useState<"percentage" | "fixed">("percentage")
  const [promoValue, setPromoValue] = useState("10")
  const [promoMinOrder, setPromoMinOrder] = useState("0")
  const [promoMaxUses, setPromoMaxUses] = useState("0")
  const [promoExpiresInDays, setPromoExpiresInDays] = useState("7")

  const templates = [
    {
      name: "🍊 Nouveautés",
      subject: "Découvrez nos nouveaux arrivages !",
      message: "Bonjour,\n\nDe nouveaux produits frais viennent d'arriver en boutique ! Fruits de saison, légumes bio, compositions maison... venez découvrir notre sélection.\n\nVos produits préférés, toujours plus frais, toujours plus savoureux.\n\nÀ très bientôt,\nL'équipe Power Primeur"
    },
    {
      name: "💰 Promo Flash",
      subject: "Offre exclusive — Profitez-en vite !",
      message: "Bonjour,\n\nPour vous remercier de votre fidélité, nous vous offrons une réduction exclusive sur votre prochaine commande !\n\nUtilisez le code ci-dessous lors de votre passage en caisse ou en ligne.\n\nOffre limitée, ne tardez pas !\n\nL'équipe Power Primeur"
    },
    {
      name: "🔄 Relance",
      subject: "Vous nous manquez ! Revenez profiter de nos produits frais",
      message: "Bonjour,\n\nCela fait un moment que nous ne vous avons pas vu ! Nos étals débordent de produits frais et de saison.\n\nPour fêter votre retour, voici un petit cadeau de bienvenue.\n\nN'hésitez pas à repasser, nous serons ravis de vous retrouver !\n\nL'équipe Power Primeur"
    },
  ]

  const applyTemplate = (template: typeof templates[0]) => {
    setSubject(template.subject)
    setMessage(template.message)
  }

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      alert("Veuillez remplir le sujet et le message")
      return
    }
    if (!confirm("Envoyer cet email à tous les clients ?")) return

    setSending(true)
    setSent(false)
    try {
      const res = await fetch("/api/admin/marketing/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          message,
          includePromo,
          promoType,
          promoValue: parseFloat(promoValue) || 10,
          promoMinOrder: parseFloat(promoMinOrder) || 0,
          promoMaxUses: parseInt(promoMaxUses) || 0,
          promoExpiresInDays: parseInt(promoExpiresInDays) || 7,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setSent(true)
        setLastResult({ sent: data.sent, promoCode: data.promoCode })
      } else {
        alert(`Erreur : ${data.error || "Impossible d'envoyer"}`)
      }
    } catch {
      alert("Erreur réseau")
    } finally {
      setSending(false)
    }
  }

  const resetForm = () => {
    setSubject("")
    setMessage("")
    setIncludePromo(false)
    setSent(false)
    setLastResult(null)
  }

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-6 p-4 max-w-4xl">

          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mail className="h-6 w-6" /> Email Marketing
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Envoyez des promotions et relances à tous vos clients
            </p>
          </div>

          {/* Résultat d'envoi */}
          {sent && lastResult && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-bold text-green-800">Email envoyé à {lastResult.sent} client(s) !</p>
                  {lastResult.promoCode && (
                    <p className="text-sm text-green-700 mt-1">
                      Code promo généré : <span className="font-mono font-bold bg-green-100 px-2 py-0.5 rounded">{lastResult.promoCode}</span>
                    </p>
                  )}
                </div>
                <Button variant="outline" size="sm" className="ml-auto" onClick={resetForm}>
                  Nouveau mail
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Templates rapides */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Templates rapides
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {templates.map((t, i) => (
                <button
                  key={i}
                  onClick={() => applyTemplate(t)}
                  className="p-4 rounded-xl border text-left hover:border-orange-300 hover:bg-orange-50 transition-all"
                >
                  <p className="font-bold text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.subject}</p>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Formulaire */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Rédaction */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Send className="h-4 w-4" /> Rédaction
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Objet de l&apos;email *</Label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Ex: Offre exclusive — 10% sur votre prochaine commande"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Message *</Label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Rédigez votre message ici..."
                      rows={10}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                    />
                    <p className="text-xs text-muted-foreground mt-1">{message.length} caractères</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Options Code Promo */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Gift className="h-4 w-4" /> Code Promo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Toggle */}
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Inclure un code promo</Label>
                    <button
                      onClick={() => setIncludePromo(!includePromo)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        includePromo ? "bg-orange-500" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                          includePromo ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {includePromo && (
                    <>
                      <Separator />

                      <div>
                        <Label className="text-xs">Type de réduction</Label>
                        <Select value={promoType} onValueChange={(v) => setPromoType(v as "percentage" | "fixed")}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">
                              <span className="flex items-center gap-1"><Percent className="h-3 w-3" /> Pourcentage</span>
                            </SelectItem>
                            <SelectItem value="fixed">
                              <span className="flex items-center gap-1"><Tag className="h-3 w-3" /> Montant fixe (€)</span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs">Valeur ({promoType === "percentage" ? "%" : "€"})</Label>
                        <Input
                          type="number"
                          value={promoValue}
                          onChange={(e) => setPromoValue(e.target.value)}
                          min="1"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-xs">Commande minimum (€)</Label>
                        <Input
                          type="number"
                          value={promoMinOrder}
                          onChange={(e) => setPromoMinOrder(e.target.value)}
                          min="0"
                          className="mt-1"
                          placeholder="0 = pas de minimum"
                        />
                      </div>

                      <div>
                        <Label className="text-xs">Utilisations max</Label>
                        <Input
                          type="number"
                          value={promoMaxUses}
                          onChange={(e) => setPromoMaxUses(e.target.value)}
                          min="0"
                          className="mt-1"
                          placeholder="0 = illimité"
                        />
                      </div>

                      <div>
                        <Label className="text-xs">Expire dans (jours)</Label>
                        <Input
                          type="number"
                          value={promoExpiresInDays}
                          onChange={(e) => setPromoExpiresInDays(e.target.value)}
                          min="1"
                          className="mt-1"
                        />
                      </div>

                      {/* Preview */}
                      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-4 text-center text-white">
                        <p className="text-[10px] uppercase tracking-widest opacity-70">Aperçu du code</p>
                        <p className="text-xl font-black tracking-widest my-1">POWERXXXXXX</p>
                        <p className="text-sm font-bold">
                          {promoType === "percentage" ? `${promoValue}%` : `${promoValue}€`} de réduction
                        </p>
                        {parseFloat(promoMinOrder) > 0 && (
                          <p className="text-xs opacity-70">Dès {promoMinOrder}€ d&apos;achat</p>
                        )}
                        <p className="text-xs opacity-70">Valable {promoExpiresInDays} jours</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Bouton d'envoi */}
              <Button
                onClick={handleSend}
                disabled={sending || !subject.trim() || !message.trim()}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 text-base font-bold"
              >
                {sending ? (
                  <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Envoi en cours...</>
                ) : (
                  <><Send className="h-5 w-5 mr-2" /> Envoyer à tous les clients</>
                )}
              </Button>

              {includePromo && (
                <p className="text-xs text-muted-foreground text-center">
                  Un code promo unique sera auto-généré et inclus dans l&apos;email
                </p>
              )}
            </div>
          </div>

        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
