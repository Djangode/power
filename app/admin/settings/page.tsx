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

const SETTING_KEYS = [
  "shop_name",
  "contact_email",
  "delivery_fee",
  "free_delivery_threshold",
  "order_notification_email",
  // Mentions obligatoires reprises sur chaque facture.
  "company_legal_name",
  "company_legal_form",
  "company_address",
  "company_siret",
  "company_rcs",
  "company_vat_number",
  "company_phone",
  "vat_regime",
  "vat_rate",
  "payment_terms",
] as const

type SettingsForm = Record<(typeof SETTING_KEYS)[number], string>

const EMPTY_FORM = Object.fromEntries(SETTING_KEYS.map((k) => [k, ""])) as SettingsForm

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsForm>(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getSiteSettings()
        if (res.success) {
          setForm(
            Object.fromEntries(SETTING_KEYS.map((k) => [k, res.data[k] ?? ""])) as SettingsForm,
          )
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

                    <div className="border-t pt-6 mt-2">
                      <h3 className="font-semibold mb-1">Mentions légales de la facture</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Ces informations figurent obligatoirement sur chaque facture. Tant que la
                        raison sociale, l&apos;adresse, le SIRET et le régime de TVA ne sont pas
                        renseignés, un bandeau d&apos;avertissement s&apos;affiche sur le document.
                      </p>

                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="company_legal_name">Raison sociale</Label>
                            <Input
                              id="company_legal_name"
                              value={form.company_legal_name}
                              onChange={(e) => setForm({ ...form, company_legal_name: e.target.value })}
                              placeholder="POWER"
                            />
                          </div>
                          <div>
                            <Label htmlFor="company_legal_form">Forme juridique</Label>
                            <Input
                              id="company_legal_form"
                              value={form.company_legal_form}
                              onChange={(e) => setForm({ ...form, company_legal_form: e.target.value })}
                              placeholder="SARL"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="company_address">Adresse de l&apos;entreprise</Label>
                          <Input
                            id="company_address"
                            value={form.company_address}
                            onChange={(e) => setForm({ ...form, company_address: e.target.value })}
                            placeholder="114 rue Paul Vaillant Couturier, 94140 Alfortville"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="company_siret">SIRET</Label>
                            <Input
                              id="company_siret"
                              value={form.company_siret}
                              onChange={(e) => setForm({ ...form, company_siret: e.target.value })}
                              placeholder="944 504 794 00016"
                            />
                          </div>
                          <div>
                            <Label htmlFor="company_rcs">RCS</Label>
                            <Input
                              id="company_rcs"
                              value={form.company_rcs}
                              onChange={(e) => setForm({ ...form, company_rcs: e.target.value })}
                              placeholder="RCS Créteil 944 504 794"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="vat_regime">Régime de TVA</Label>
                          <select
                            id="vat_regime"
                            value={form.vat_regime}
                            onChange={(e) => setForm({ ...form, vat_regime: e.target.value })}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                          >
                            <option value="">— À choisir —</option>
                            <option value="franchise">
                              Franchise en base — TVA non applicable (art. 293 B du CGI)
                            </option>
                            <option value="assujetti">Assujetti à la TVA</option>
                          </select>
                          <p className="mt-1 text-xs text-muted-foreground">
                            En franchise, la facture porte la mention « TVA non applicable, art. 293 B
                            du CGI ». En assujetti, elle détaille le total HT et le montant de TVA.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="vat_rate">Taux de TVA (%)</Label>
                            <Input
                              id="vat_rate"
                              type="number"
                              step="0.1"
                              value={form.vat_rate}
                              onChange={(e) => setForm({ ...form, vat_rate: e.target.value })}
                              placeholder="5.5"
                            />
                            <p className="mt-1 text-xs text-muted-foreground">
                              5,5 % pour les fruits et légumes frais.
                            </p>
                          </div>
                          <div>
                            <Label htmlFor="company_vat_number">N° TVA intracommunautaire</Label>
                            <Input
                              id="company_vat_number"
                              value={form.company_vat_number}
                              onChange={(e) => setForm({ ...form, company_vat_number: e.target.value })}
                              placeholder="FR00944504794"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="company_phone">Téléphone de l&apos;entreprise</Label>
                          <Input
                            id="company_phone"
                            value={form.company_phone}
                            onChange={(e) => setForm({ ...form, company_phone: e.target.value })}
                            placeholder="01 XX XX XX XX"
                          />
                        </div>

                        <div>
                          <Label htmlFor="payment_terms">Conditions de règlement</Label>
                          <Input
                            id="payment_terms"
                            value={form.payment_terms}
                            onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
                            placeholder="Paiement comptant à la réception de la commande."
                          />
                        </div>
                      </div>
                    </div>

                    {message && (
                      <p className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
                        {message.text}
                      </p>
                    )}

                    <div className="rounded bg-muted p-3 text-sm text-muted-foreground">
                      Ces réglages sont enregistrés en base (SiteSetting). Les frais et le seuil de
                      livraison gratuite sont appliqués au calcul des frais à la commande ; les
                      mentions légales alimentent les factures.
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
