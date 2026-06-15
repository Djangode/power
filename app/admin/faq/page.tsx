"use client"

import React, { useState, useEffect } from "react"
import { AppSidebar } from "@/components/admin/app-sidebar"
import { SiteHeader } from "@/components/admin/site-header"
import { SidebarInset, SidebarProvider } from "@/components/admin/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/ui/table"
import { Button } from "@/components/admin/ui/button"
import { Input } from "@/components/admin/ui/input"
import { Label } from "@/components/admin/ui/label"
import { Plus, Trash2, Edit, HelpCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface Faq {
  id: string
  question: string
  answer: string
  order: number
  createdAt: string
}

export default function FaqAdminPage() {
  const [faqs, setFaqs] = useState<Faq[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formQuestion, setFormQuestion] = useState("")
  const [formAnswer, setFormAnswer] = useState("")
  const [formOrder, setFormOrder] = useState("0")

  const fetchFaqs = async () => {
    try {
      const res = await fetch("/api/admin/faq")
      if (res.ok) {
        const data = await res.json()
        setFaqs(data)
      }
    } catch {
      toast.error("Erreur de chargement")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchFaqs() }, [])

  const resetForm = () => {
    setFormQuestion("")
    setFormAnswer("")
    setFormOrder("0")
    setEditingId(null)
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      ...(editingId ? { id: editingId } : {}),
      question: formQuestion,
      answer: formAnswer,
      order: parseInt(formOrder, 10) || 0,
    }

    try {
      const res = await fetch("/api/admin/faq", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(editingId ? "Question modifiée" : "Question créée")
        resetForm()
        fetchFaqs()
      } else {
        toast.error(data.error || "Erreur")
      }
    } catch {
      toast.error("Erreur serveur")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette question ?")) return
    try {
      const res = await fetch("/api/admin/faq", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        toast.success("Question supprimée")
        fetchFaqs()
      }
    } catch {
      toast.error("Erreur de suppression")
    }
  }

  const handleEdit = (faq: Faq) => {
    setEditingId(faq.id)
    setFormQuestion(faq.question)
    setFormAnswer(faq.answer)
    setFormOrder(faq.order.toString())
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
                <HelpCircle className="h-6 w-6" /> Foire aux questions
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{faqs.length} question(s)</p>
            </div>
            <Button onClick={() => { resetForm(); setShowForm(!showForm) }}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle question
            </Button>
          </div>

          {showForm && (
            <Card>
              <CardHeader>
                <CardTitle>{editingId ? "Modifier la question" : "Nouvelle question"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
                  <div>
                    <Label>Question *</Label>
                    <Input value={formQuestion} onChange={(e) => setFormQuestion(e.target.value)} required />
                  </div>
                  <div>
                    <Label>Réponse *</Label>
                    <textarea
                      value={formAnswer}
                      onChange={(e) => setFormAnswer(e.target.value)}
                      rows={4}
                      required
                      placeholder="Réponse affichée aux clients…"
                      className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div className="max-w-[160px]">
                    <Label>Ordre d'affichage</Label>
                    <Input type="number" value={formOrder} onChange={(e) => setFormOrder(e.target.value)} min="0" />
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
              ) : faqs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Aucune question. Cliquez sur "Nouvelle question" pour commencer.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Ordre</TableHead>
                      <TableHead>Question</TableHead>
                      <TableHead>Réponse</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {faqs.map((faq) => (
                      <TableRow key={faq.id}>
                        <TableCell className="font-medium">{faq.order}</TableCell>
                        <TableCell className="font-medium">{faq.question}</TableCell>
                        <TableCell className="max-w-md truncate text-muted-foreground">{faq.answer}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(faq)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(faq.id)}>
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
