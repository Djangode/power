"use client"

import React, { useState, useEffect, useCallback } from "react"
import { AppSidebar } from "@/components/admin/app-sidebar"
import { SiteHeader } from "@/components/admin/site-header"
import { SectionCards } from "@/components/admin/section-cards"
import { StatCard } from "@/components/admin/stat-card"
import { Modal } from "@/components/admin/modal"
import { SidebarInset, SidebarProvider } from "@/components/admin/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/ui/table"
import { Button } from "@/components/admin/ui/button"
import { Badge } from "@/components/admin/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select"
import { Input } from "@/components/admin/ui/input"
import { Label } from "@/components/admin/ui/label"

import {
  Calculator,
  FileText,
  Download,
  Plus,
  Fuel,
  Users,
  Home,
  Zap,
  Trash2,
  Loader2,
  AlertTriangle,
} from "lucide-react"
import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react"
import { getAccountingData, type AccountingData } from "@/app/actions/accounting"

// Types
interface Expense {
  id: string
  type: string
  description: string
  amount: number
  date: string
  category: string | null
  createdAt: string
}

interface ProductProfit {
  id: string
  name: string
  category: string
  soldQuantity: number
  buyPrice: number
  sellPrice: number
  totalRevenue: number
  totalCost: number
  profit: number
  margin: number
}

const EXPENSE_TYPE_LABELS: Record<string, string> = {
  fuel: "Carburant",
  salary: "Salaire",
  rent: "Loyer",
  electricity: "Électricité",
  supply: "Facture Fournisseur",
  invoice: "Facture Fournisseur",
  loss: "Perte/Destruction",
  other: "Autre",
}

function getExpenseTypeLabel(type: string) {
  return EXPENSE_TYPE_LABELS[type] || type
}

function getExpenseIcon(type: string) {
  switch (type) {
    case "fuel":
      return <Fuel className="h-4 w-4 text-blue-500" />
    case "salary":
      return <Users className="h-4 w-4 text-green-500" />
    case "rent":
      return <Home className="h-4 w-4 text-purple-500" />
    case "electricity":
      return <Zap className="h-4 w-4 text-yellow-500" />
    case "supply":
    case "invoice":
      return <FileText className="h-4 w-4 text-zinc-400" />
    case "loss":
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    default:
      return <Calculator className="h-4 w-4 text-zinc-400" />
  }
}

function formatEuro(value: number) {
  return `€${value.toFixed(2)}`
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("fr-FR")
  } catch {
    return iso
  }
}

export default function AccountingPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<"month" | "year" | "all">("month")
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AccountingData | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])

  const [newExpense, setNewExpense] = useState({
    type: "fuel",
    description: "",
    amount: "",
    category: "",
    date: new Date().toISOString().split("T")[0],
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [accounting, expensesRes] = await Promise.all([
        getAccountingData(selectedPeriod),
        fetch("/api/admin/expenses", { cache: "no-store" }),
      ])

      setData(accounting)

      if (expensesRes.ok) {
        const list = (await expensesRes.json()) as Expense[]
        setExpenses(Array.isArray(list) ? list : [])
      } else {
        setExpenses([])
      }
    } catch (e) {
      console.error("Erreur chargement comptabilité:", e)
      setError("Impossible de charger les données comptables.")
    } finally {
      setLoading(false)
    }
  }, [selectedPeriod])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleAddExpense = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newExpense.type,
          description: newExpense.description,
          amount: newExpense.amount,
          date: newExpense.date,
          category: newExpense.category || null,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error || "Erreur lors de l'ajout de la charge.")
        return
      }

      setIsAddExpenseModalOpen(false)
      setNewExpense({
        type: "fuel",
        description: "",
        amount: "",
        category: "",
        date: new Date().toISOString().split("T")[0],
      })
      await loadData()
    } catch (e) {
      console.error("Erreur ajout charge:", e)
      setError("Erreur lors de l'ajout de la charge.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Supprimer cette charge ?")) return
    setError(null)
    try {
      const res = await fetch(`/api/admin/expenses?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error || "Erreur lors de la suppression.")
        return
      }
      await loadData()
    } catch (e) {
      console.error("Erreur suppression charge:", e)
      setError("Erreur lors de la suppression.")
    }
  }

  const exportToCsv = () => {
    if (!data) return
    const sep = ";"
    const lines: string[] = []

    // Section 1 : Charges
    lines.push("CHARGES ET DÉPENSES")
    lines.push(["Type", "Description", "Catégorie", "Date", "Montant (€)"].join(sep))
    for (const e of expenses) {
      lines.push(
        [
          getExpenseTypeLabel(e.type),
          (e.description || "").replace(/[\r\n;]/g, " "),
          (e.category || "").replace(/[\r\n;]/g, " "),
          formatDate(e.date),
          e.amount.toFixed(2),
        ].join(sep)
      )
    }
    lines.push("")

    // Section 2 : Rentabilité par produit
    lines.push("RENTABILITÉ PAR PRODUIT")
    lines.push(
      [
        "Produit",
        "Catégorie",
        "Vendus",
        "Prix Achat (€)",
        "Prix Vente moyen (€)",
        "CA (€)",
        "Coût (€)",
        "Profit (€)",
        "Marge (%)",
      ].join(sep)
    )
    for (const p of data.productProfits) {
      lines.push(
        [
          (p.name || "").replace(/[\r\n;]/g, " "),
          (p.category || "").replace(/[\r\n;]/g, " "),
          String(p.soldQuantity),
          p.buyPrice.toFixed(2),
          p.sellPrice.toFixed(2),
          p.totalRevenue.toFixed(2),
          p.totalCost.toFixed(2),
          p.profit.toFixed(2),
          p.margin.toFixed(1),
        ].join(sep)
      )
    }
    lines.push("")

    // Section 3 : Synthèse
    lines.push("SYNTHÈSE")
    lines.push(["Chiffre d'affaires", data.revenue.toFixed(2)].join(sep))
    lines.push(["Coûts d'achats", data.purchaseCosts.toFixed(2)].join(sep))
    lines.push(["Charges totales", data.expensesTotal.toFixed(2)].join(sep))
    lines.push(["Bénéfice net", data.netProfit.toFixed(2)].join(sep))

    const csv = "﻿" + lines.join("\r\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `comptabilite-${selectedPeriod}-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Valeurs dérivées du state réel
  const revenue = data?.revenue ?? 0
  const purchaseCosts = data?.purchaseCosts ?? 0
  const expensesTotal = data?.expensesTotal ?? 0
  const netProfit = data?.netProfit ?? 0
  const productProfits: ProductProfit[] = data?.productProfits ?? []
  const expensesByCategory = data?.expensesByCategory ?? {}

  const salariesTotal = expensesByCategory["salary"] ?? 0
  const fixedCostsTotal = (expensesByCategory["rent"] ?? 0) + (expensesByCategory["electricity"] ?? 0)

  const statsData = [
    {
      title: "Chiffre d'Affaires",
      value: formatEuro(revenue),
      description: "Commandes livrées (encaissées)",
      trend: {
        value: "Réel",
        isPositive: true,
        icon: IconTrendingUp,
      },
      footer: {
        label: "Sur la période sélectionnée",
        subtitle: "Statut « livré »",
      },
    },
    {
      title: "Charges Totales",
      value: formatEuro(expensesTotal),
      description: "Toutes dépenses enregistrées",
      trend: {
        value: "Réel",
        isPositive: false,
        icon: IconTrendingDown,
      },
      footer: {
        label: "Sur la période sélectionnée",
        subtitle: "Hors coûts d'achats",
      },
    },
    {
      title: "Bénéfice Net",
      value: formatEuro(netProfit),
      description: "CA − achats − charges",
      trend: {
        value: netProfit >= 0 ? "Positif" : "Négatif",
        isPositive: netProfit >= 0,
        icon: netProfit >= 0 ? IconTrendingUp : IconTrendingDown,
      },
      footer: {
        label: "Sur la période sélectionnée",
        subtitle: netProfit >= 0 ? "Excédent" : "Déficit",
      },
    },
  ]

  const periodLabel =
    selectedPeriod === "month" ? "ce mois" : selectedPeriod === "year" ? "cette année" : "tout l'historique"

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "19rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-4 p-4 lg:p-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold">Comptabilité</h1>
                <p className="text-muted-foreground">Gestion financière et export comptable — données réelles</p>
              </div>

              <div className="flex items-center gap-2">
                <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as "month" | "year" | "all")}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Ce mois</SelectItem>
                    <SelectItem value="year">Cette année</SelectItem>
                    <SelectItem value="all">Tout</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  onClick={exportToCsv}
                  disabled={loading || !data}
                  className="bg-orange-500 hover:bg-orange-600 text-black"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exporter (CSV)
                </Button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <span>Chargement des données comptables…</span>
              </div>
            ) : (
              <>
                {/* Stats Cards */}
                <SectionCards data={statsData} />

                {/* Résumé par catégories */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard
                    title="Coûts Achats"
                    value={formatEuro(purchaseCosts)}
                    description="coût des marchandises vendues"
                    trend={{ value: "Réel", isPositive: false }}
                    footer={{
                      label: "Commandes livrées",
                      subtitle: "Prix d'achat × quantités",
                    }}
                  />

                  <StatCard
                    title="Salaires"
                    value={formatEuro(salariesTotal)}
                    description="charges personnel"
                    trend={{ value: "Réel", isPositive: false }}
                    footer={{
                      label: "Charges de type « salaire »",
                      subtitle: "Masse salariale",
                    }}
                  />

                  <StatCard
                    title="Charges Fixes"
                    value={formatEuro(fixedCostsTotal)}
                    description="loyer + énergie"
                    trend={{ value: "Réel", isPositive: false }}
                    footer={{
                      label: "Loyer + électricité",
                      subtitle: "Frais généraux",
                    }}
                  />

                  <StatCard
                    title="Bénéfice Net"
                    value={formatEuro(netProfit)}
                    description="résultat de la période"
                    trend={{ value: netProfit >= 0 ? "Positif" : "Négatif", isPositive: netProfit >= 0 }}
                    footer={{
                      label: "CA − achats − charges",
                      subtitle: netProfit >= 0 ? "Excédent" : "Déficit",
                    }}
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex gap-2">
                    <Button onClick={() => setIsAddExpenseModalOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-black">
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter Charge
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Période : <span className="font-medium text-foreground">{periodLabel}</span>
                  </div>
                </div>

                {/* Tableau des charges */}
                <Card>
                  <CardHeader>
                    <CardTitle>Charges et Dépenses ({expenses.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {expenses.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground">
                        Aucune charge enregistrée.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Catégorie</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Montant</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {expenses.map((expense) => (
                            <TableRow key={expense.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {getExpenseIcon(expense.type)}
                                  <span className="font-medium">{getExpenseTypeLabel(expense.type)}</span>
                                </div>
                              </TableCell>
                              <TableCell>{expense.description}</TableCell>
                              <TableCell>
                                {expense.category ? (
                                  <Badge variant="outline">{expense.category}</Badge>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>{formatDate(expense.date)}</TableCell>
                              <TableCell className="font-medium text-red-500">
                                -{expense.amount.toFixed(2)}€
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteExpense(expense.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                {/* Tableau rentabilité par produit */}
                <Card>
                  <CardHeader>
                    <CardTitle>Rentabilité par Produit ({productProfits.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {productProfits.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground">
                        Aucune donnée sur la période.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produit</TableHead>
                            <TableHead>Catégorie</TableHead>
                            <TableHead>Vendus</TableHead>
                            <TableHead>Prix Achat</TableHead>
                            <TableHead>Prix Vente</TableHead>
                            <TableHead>Marge</TableHead>
                            <TableHead>Profit</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {productProfits.map((product) => (
                            <TableRow key={product.id}>
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell>{product.category}</TableCell>
                              <TableCell>{product.soldQuantity}</TableCell>
                              <TableCell>{product.buyPrice.toFixed(2)}€</TableCell>
                              <TableCell>{product.sellPrice.toFixed(2)}€</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    product.margin > 40
                                      ? "default"
                                      : product.margin > 20
                                        ? "secondary"
                                        : "destructive"
                                  }
                                >
                                  {product.margin.toFixed(1)}%
                                </Badge>
                              </TableCell>
                              <TableCell
                                className={`font-medium ${product.profit >= 0 ? "text-green-500" : "text-red-500"}`}
                              >
                                {product.profit >= 0 ? "+" : ""}
                                {product.profit.toFixed(2)}€
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </SidebarInset>

      {/* Modal Ajout Charge */}
      <Modal
        isOpen={isAddExpenseModalOpen}
        onClose={() => setIsAddExpenseModalOpen(false)}
        title="Ajouter une Charge"
        className="max-w-md"
      >
        <div className="space-y-4">
          <div>
            <Label>Type de charge</Label>
            <Select
              value={newExpense.type}
              onValueChange={(value) => setNewExpense({ ...newExpense, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fuel">Carburant</SelectItem>
                <SelectItem value="salary">Salaire</SelectItem>
                <SelectItem value="rent">Loyer</SelectItem>
                <SelectItem value="electricity">Électricité</SelectItem>
                <SelectItem value="supply">Facture Fournisseur</SelectItem>
                <SelectItem value="loss">Perte/Destruction</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Description</Label>
            <Input
              value={newExpense.description}
              onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
              placeholder="Description de la charge"
            />
          </div>

          <div>
            <Label>Montant (€)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={newExpense.amount}
              onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={newExpense.date}
              onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
            />
          </div>

          <div>
            <Label>Catégorie (optionnel)</Label>
            <Input
              value={newExpense.category}
              onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
              placeholder="Personnel, Transport, etc."
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleAddExpense}
              disabled={submitting}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-black"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ajouter"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsAddExpenseModalOpen(false)}
              disabled={submitting}
              className="flex-1"
            >
              Annuler
            </Button>
          </div>
        </div>
      </Modal>
    </SidebarProvider>
  )
}
