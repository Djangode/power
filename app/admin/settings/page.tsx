"use client"

import React, { useState, useEffect } from "react"
import { AppSidebar } from "@/components/admin/app-sidebar"
import { SiteHeader } from "@/components/admin/site-header"
import { SidebarInset, SidebarProvider } from "@/components/admin/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card"
import { Button } from "@/components/admin/ui/button"
import { Input } from "@/components/admin/ui/input"
import { Label } from "@/components/admin/ui/label"
import { Settings } from "lucide-react"
import { getSiteSettings, setSiteSetting } from "@/app/actions/content"

type SettingsForm = {
  shop_name: string
  contact_email: string
  delivery_fee: string
  free_delivery_threshold: string
  order_notification_email: string
}

const SETTING_KEYS = ["shop_name", "contact_email", "delivery_fee", "free_delivery_threshold", "order_notification_email"] as const

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsForm>({
    shop_name: "",
    contact_email: "",
    delivery_fee: "",
    free_delivery_threshold: "",
    order_notification_email: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getSiteSettings()
        if (res.success) {
          setForm({
            shop_name: res.data.shop_name ?? "",
            contact_email: res.data.contact_email ?? "",
            delivery_fee: res.data.delivery_fee ?? "",
            free_delivery_threshold: res.data.free_delivery_threshold ?? "",
            order_notification_email: res.data.order_notification_email ?? "",
          })
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      for (const key of SETTING_KEYS) {
        const res = await setSiteSetting(key, form[key])
        if (!res.success) {
          setMessage({ type: "error", text: res.error || "Erreur lors de l'enregistrement." })
          setSaving(false)
          return
        }
      }
      setMessage({ type: "success", text: "Paramètres enregistrés." })
    } catch (e) {
      console.error(e)
      setMessage({ type: "error", text: "Erreur lors de l'enregistrement." })
    } finally {
      setSaving(false)
    }
  }

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "19rem",
      } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-4 p-4 lg:p-6">
            <div>
              <h1 className="text-2xl font-bold">Paramètres</h1>
              <p className="text-muted-foreground">Configuration de la boutique</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Paramètres généraux
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="py-8 text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-600 border-t-transparent mx-auto mb-4" />
                    <p className="text-muted-foreground">Chargement des paramètres...</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-w-xl">
                    <div>
                      <Label htmlFor="shop_name">Nom de la boutique</Label>
                      <Input
                        id="shop_name"
                        value={form.shop_name}
                        onChange={(e) => setForm({ ...form, shop_name: e.target.value })}
                        placeholder="Ex: Power"
                      />
                    </div>

                    <div>
                      <Label htmlFor="contact_email">Email de contact</Label>
                      <Input
                        id="contact_email"
                        type="email"
                        value={form.contact_email}
                        onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                        placeholder="contact@power.gp"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="delivery_fee">Frais de livraison (€)</Label>
                        <Input
                          id="delivery_fee"
                          type="number"
                          step="0.01"
                          value={form.delivery_fee}
                          onChange={(e) => setForm({ ...form, delivery_fee: e.target.value })}
                          placeholder="5.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="free_delivery_threshold">Seuil de livraison gratuite (€)</Label>
                        <Input
                          id="free_delivery_threshold"
                          type="number"
                          step="0.01"
                          value={form.free_delivery_threshold}
                          onChange={(e) => setForm({ ...form, free_delivery_threshold: e.target.value })}
                          placeholder="50.00"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="order_notification_email">Email de notification des commandes</Label>
                      <Input
                        id="order_notification_email"
                        type="email"
                        value={form.order_notification_email}
                        onChange={(e) => setForm({ ...form, order_notification_email: e.target.value })}
                        placeholder="commandes@powerprimeur.com"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Adresse qui reçoit un email à chaque nouvelle commande.
                      </p>
                    </div>

                    {message && (
                      <p className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
                        {message.text}
                      </p>
                    )}

                    <div className="rounded bg-muted p-3 text-sm text-muted-foreground">
                      Ces réglages sont enregistrés en base (SiteSetting). Le nom de la boutique
                      et l&apos;email de contact sont des informations de référence. Les frais et le
                      seuil de livraison gratuite sont appliqués au calcul des frais à la commande.
                    </div>

                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? "Enregistrement..." : "Enregistrer"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
