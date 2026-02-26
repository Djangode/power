"use client"

import React, { useState, useEffect } from "react"
import { AppSidebar } from "@/components/admin/app-sidebar"
import { SiteHeader } from "@/components/admin/site-header"
import { SidebarInset, SidebarProvider } from "@/components/admin/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/ui/table"
import { Button } from "@/components/admin/ui/button"
import { Badge } from "@/components/admin/ui/badge"
import { Input } from "@/components/admin/ui/input"
import { Label } from "@/components/admin/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select"
import { Plus, Trash2, Edit, Tag, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface PromoCode {
  id: string
  code: string
  type: string
  value: number
  minOrder: number
  maxUses: number
  currentUses: number
  isActive: boolean
  expiresAt: string | null
  createdAt: string
}

export default function PromoCodesPage() {
  const [codes, setCodes] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form fields
  const [formCode, setFormCode] = useState("")
  const [formType, setFormType] = useState("percentage")
  const [formValue, setFormValue] = useState("")
  const [formMinOrder, setFormMinOrder] = useState("")
  const [formMaxUses, setFormMaxUses] = useState("")
  const [formExpiresAt, setFormExpiresAt] = useState("")

  const fetchCodes = async () => {
    try {
      const res = await fetch("/api/admin/promo-codes")
      if (res.ok) {
        const data = await res.json()
        setCodes(data)
      }
    } catch {
      toast.error("Erreur de chargement")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCodes() }, [])

  const resetForm = () => {
    setFormCode("")
    setFormType("percentage")
    setFormValue("")
    setFormMinOrder("")
    setFormMaxUses("")
    setFormExpiresAt("")
    setEditingId(null)
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      ...(editingId ? { id: editingId } : {}),
      code: formCode,
      type: formType,
      value: parseFloat(formValue),
      minOrder: parseFloat(formMinOrder) || 0,
      maxUses: parseInt(formMaxUses) || 0,
      expiresAt: formExpiresAt || null,
    }

    try {
      const res = await fetch("/api/admin/promo-codes", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(editingId ? "Code modifié" : "Code créé")
        resetForm()
        fetchCodes()
      } else {
        toast.error(data.error || "Erreur")
      }
    } catch {
      toast.error("Erreur serveur")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce code promo ?")) return
    try {
      const res = await fetch("/api/admin/promo-codes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        toast.success("Code supprimé")
        fetchCodes()
      }
    } catch {
      toast.error("Erreur de suppression")
    }
  }

  const handleToggleActive = async (promo: PromoCode) => {
    try {
      await fetch("/api/admin/promo-codes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: promo.id, isActive: !promo.isActive }),
      })
      fetchCodes()
    } catch {
      toast.error("Erreur de mise à jour")
    }
  }

  const handleEdit = (promo: PromoCode) => {
    setEditingId(promo.id)
    setFormCode(promo.code)
    setFormType(promo.type)
    setFormValue(promo.value.toString())
    setFormMinOrder(promo.minOrder.toString())
    setFormMaxUses(promo.maxUses.toString())
    setFormExpiresAt(promo.expiresAt ? promo.expiresAt.split("T")[0] : "")
    setShowForm(true)
  }

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Tag className="h-6 w-6" /> Codes Promo
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{codes.length} code(s) promo</p>
            </div>
            <Button onClick={() => { resetForm(); setShowForm(!showForm) }}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau code
            </Button>
          </div>

          {showForm && (
            <Card>
              <CardHeader>
                <CardTitle>{editingId ? "Modifier le code" : "Nouveau code promo"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Code *</Label>
                    <Input
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                      placeholder="POWER10"
                      required
                      className="uppercase"
                    />
                  </div>
                  <div>
                    <Label>Type *</Label>
                    <Select value={formType} onValueChange={setFormType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                        <SelectItem value="fixed">Montant fixe (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Valeur * ({formType === "percentage" ? "%" : "€"})</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formValue}
                      onChange={(e) => setFormValue(e.target.value)}
                      placeholder={formType === "percentage" ? "10" : "5.00"}
                      required
                    />
                  </div>
                  <div>
                    <Label>Commande min. (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formMinOrder}
                      onChange={(e) => setFormMinOrder(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Utilisations max (0 = illimité)</Label>
                    <Input
                      type="number"
                      value={formMaxUses}
                      onChange={(e) => setFormMaxUses(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Date d&apos;expiration</Label>
                    <Input
                      type="date"
                      value={formExpiresAt}
                      onChange={(e) => setFormExpiresAt(e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-3 flex gap-2">
                    <Button type="submit">{editingId ? "Modifier" : "Créer"}</Button>
                    <Button type="button" variant="outline" onClick={resetForm}>Annuler</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : codes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Aucun code promo. Créez-en un !
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Valeur</TableHead>
                      <TableHead>Min. commande</TableHead>
                      <TableHead>Utilisations</TableHead>
                      <TableHead>Expiration</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {codes.map((promo) => (
                      <TableRow key={promo.id}>
                        <TableCell className="font-mono font-bold">{promo.code}</TableCell>
                        <TableCell>{promo.type === "percentage" ? "%" : "€"}</TableCell>
                        <TableCell>
                          {promo.type === "percentage" ? `${promo.value}%` : `${promo.value.toFixed(2)}€`}
                        </TableCell>
                        <TableCell>{promo.minOrder > 0 ? `${promo.minOrder.toFixed(2)}€` : "—"}</TableCell>
                        <TableCell>
                          {promo.currentUses}/{promo.maxUses === 0 ? "∞" : promo.maxUses}
                        </TableCell>
                        <TableCell>
                          {promo.expiresAt
                            ? new Date(promo.expiresAt).toLocaleDateString("fr-FR")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={promo.isActive ? "default" : "secondary"}
                            className="cursor-pointer"
                            onClick={() => handleToggleActive(promo)}
                          >
                            {promo.isActive ? "Actif" : "Inactif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(promo)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(promo.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
