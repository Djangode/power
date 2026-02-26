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
import { Plus, Trash2, Edit, CalendarDays, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface DeliverySlot {
  id: string
  date: string
  startTime: string
  endTime: string
  maxOrders: number
  currentOrders: number
  isActive: boolean
  createdAt: string
}

export default function DeliverySlotsPage() {
  const [slots, setSlots] = useState<DeliverySlot[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form fields
  const [formDate, setFormDate] = useState("")
  const [formStartTime, setFormStartTime] = useState("09:00")
  const [formEndTime, setFormEndTime] = useState("12:00")
  const [formMaxOrders, setFormMaxOrders] = useState("10")

  const fetchSlots = async () => {
    try {
      const res = await fetch("/api/admin/delivery-slots")
      if (res.ok) {
        const data = await res.json()
        setSlots(data)
      }
    } catch {
      toast.error("Erreur de chargement")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSlots() }, [])

  const resetForm = () => {
    setFormDate("")
    setFormStartTime("09:00")
    setFormEndTime("12:00")
    setFormMaxOrders("10")
    setEditingId(null)
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      ...(editingId ? { id: editingId } : {}),
      date: formDate,
      startTime: formStartTime,
      endTime: formEndTime,
      maxOrders: parseInt(formMaxOrders),
    }

    try {
      const res = await fetch("/api/admin/delivery-slots", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(editingId ? "Créneau modifié" : "Créneau créé")
        resetForm()
        fetchSlots()
      } else {
        toast.error(data.error || "Erreur")
      }
    } catch {
      toast.error("Erreur serveur")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce créneau ?")) return
    try {
      const res = await fetch("/api/admin/delivery-slots", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        toast.success("Créneau supprimé")
        fetchSlots()
      }
    } catch {
      toast.error("Erreur de suppression")
    }
  }

  const handleToggleActive = async (slot: DeliverySlot) => {
    try {
      await fetch("/api/admin/delivery-slots", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: slot.id, isActive: !slot.isActive }),
      })
      fetchSlots()
    } catch {
      toast.error("Erreur de mise à jour")
    }
  }

  const handleEdit = (slot: DeliverySlot) => {
    setEditingId(slot.id)
    setFormDate(slot.date.split("T")[0])
    setFormStartTime(slot.startTime)
    setFormEndTime(slot.endTime)
    setFormMaxOrders(slot.maxOrders.toString())
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
                <CalendarDays className="h-6 w-6" /> Créneaux de Livraison
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{slots.length} créneau(x) configuré(s)</p>
            </div>
            <Button onClick={() => { resetForm(); setShowForm(!showForm) }}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau créneau
            </Button>
          </div>

          {showForm && (
            <Card>
              <CardHeader>
                <CardTitle>{editingId ? "Modifier le créneau" : "Nouveau créneau"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label>Heure de début *</Label>
                    <Input
                      type="time"
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label>Heure de fin *</Label>
                    <Input
                      type="time"
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label>Max commandes</Label>
                    <Input
                      type="number"
                      value={formMaxOrders}
                      onChange={(e) => setFormMaxOrders(e.target.value)}
                      min="1"
                    />
                  </div>
                  <div className="md:col-span-4 flex gap-2">
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
              ) : slots.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Aucun créneau configuré. Créez-en un !
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Créneau</TableHead>
                      <TableHead>Commandes</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slots.map((slot) => {
                      const isFull = slot.currentOrders >= slot.maxOrders
                      return (
                        <TableRow key={slot.id}>
                          <TableCell className="font-medium">
                            {new Date(slot.date).toLocaleDateString("fr-FR", {
                              weekday: "short",
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </TableCell>
                          <TableCell>{slot.startTime} — {slot.endTime}</TableCell>
                          <TableCell>
                            <span className={isFull ? "text-destructive font-bold" : ""}>
                              {slot.currentOrders}/{slot.maxOrders}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={slot.isActive && !isFull ? "default" : "secondary"}
                              className="cursor-pointer"
                              onClick={() => handleToggleActive(slot)}
                            >
                              {!slot.isActive ? "Inactif" : isFull ? "Complet" : "Disponible"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="ghost" onClick={() => handleEdit(slot)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(slot.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
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
