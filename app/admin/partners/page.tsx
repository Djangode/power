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
import { Plus, Trash2, Edit, Handshake, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface Partner {
  id: string
  name: string
  logoUrl: string | null
  isActive: boolean
  createdAt: string
}

export default function PartnersAdminPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const [formName, setFormName] = useState("")
  const [formLogoUrl, setFormLogoUrl] = useState("")
  const [formIsActive, setFormIsActive] = useState(true)

  const fetchPartners = async () => {
    try {
      const res = await fetch("/api/admin/partners")
      if (res.ok) {
        const data = await res.json()
        setPartners(data)
      }
    } catch {
      toast.error("Erreur de chargement")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPartners() }, [])

  const resetForm = () => {
    setFormName("")
    setFormLogoUrl("")
    setFormIsActive(true)
    setEditingId(null)
    setShowForm(false)
  }

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      if (res.ok) {
        const { url } = await res.json()
        setFormLogoUrl(url)
      } else {
        toast.error("Erreur lors de l'upload")
      }
    } catch {
      toast.error("Erreur lors de l'upload")
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      ...(editingId ? { id: editingId } : {}),
      name: formName,
      logoUrl: formLogoUrl,
      isActive: formIsActive,
    }

    try {
      const res = await fetch("/api/admin/partners", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(editingId ? "Partenaire modifié" : "Partenaire créé")
        resetForm()
        fetchPartners()
      } else {
        toast.error(data.error || "Erreur")
      }
    } catch {
      toast.error("Erreur serveur")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce partenaire ?")) return
    try {
      const res = await fetch("/api/admin/partners", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        toast.success("Partenaire supprimé")
        fetchPartners()
      }
    } catch {
      toast.error("Erreur de suppression")
    }
  }

  const handleToggleActive = async (partner: Partner) => {
    try {
      await fetch("/api/admin/partners", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: partner.id, isActive: !partner.isActive }),
      })
      fetchPartners()
    } catch {
      toast.error("Erreur de mise à jour")
    }
  }

  const handleEdit = (partner: Partner) => {
    setEditingId(partner.id)
    setFormName(partner.name)
    setFormLogoUrl(partner.logoUrl || "")
    setFormIsActive(partner.isActive)
    setShowForm(true)
  }

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Handshake className="h-6 w-6" /> Partenaires
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{partners.length} partenaire(s)</p>
            </div>
            <Button onClick={() => { resetForm(); setShowForm(!showForm) }}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau partenaire
            </Button>
          </div>

          {showForm && (
            <Card>
              <CardHeader>
                <CardTitle>{editingId ? "Modifier le partenaire" : "Nouveau partenaire"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
                  <div>
                    <Label>Nom *</Label>
                    <Input value={formName} onChange={(e) => setFormName(e.target.value)} required />
                  </div>
                  <div>
                    <Label>Logo</Label>
                    <label className="flex items-center justify-center h-24 border-2 border-dashed border-input rounded-lg cursor-pointer hover:border-orange-500 transition-colors bg-background">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileUpload(file)
                        }}
                      />
                      {uploading ? (
                        <span className="text-sm text-muted-foreground">Compression…</span>
                      ) : formLogoUrl ? (
                        <img src={formLogoUrl} alt="Aperçu" className="h-20 w-20 object-contain rounded" />
                      ) : (
                        <span className="text-sm text-muted-foreground">Cliquer pour uploader</span>
                      )}
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="isActive"
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="isActive" className="cursor-pointer">Actif (visible sur le site)</Label>
                  </div>
                  <div className="flex gap-2">
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
              ) : partners.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Aucun partenaire. Cliquez sur "Nouveau partenaire" pour commencer.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Logo</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partners.map((partner) => (
                      <TableRow key={partner.id}>
                        <TableCell>
                          {partner.logoUrl ? (
                            <img src={partner.logoUrl} alt={partner.name} className="h-10 w-10 object-contain rounded" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{partner.name}</TableCell>
                        <TableCell>
                          <Badge
                            variant={partner.isActive ? "default" : "secondary"}
                            className="cursor-pointer"
                            onClick={() => handleToggleActive(partner)}
                          >
                            {partner.isActive ? "Actif" : "Inactif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(partner)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(partner.id)}>
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
