"use client"

import React, { useState } from "react"
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
  Upload, 
  Plus, 
  Fuel, 
  Users, 
  Home, 
  Zap,

  AlertTriangle
} from "lucide-react"
import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react"

// Types
interface Expense {
  id: string
  type: 'fuel' | 'salary' | 'rent' | 'electricity' | 'invoice' | 'loss'
  description: string
  amount: number
  date: string
  category: string
  receipt?: string
  employee?: string
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
  lossQuantity: number
  lossValue: number
}

// Données d'exemple
const expenses: Expense[] = [
  {
    id: "EXP-001",
    type: "salary",
    description: "Salaire Sophie - Juillet",
    amount: 2100.00,
    date: "2025-07-31",
    category: "Personnel",
    employee: "Sophie Préparatrice"
  },
  {
    id: "EXP-002", 
    type: "fuel",
    description: "Gasoil livraison",
    amount: 145.50,
    date: "2025-07-05",
    category: "Transport",
    receipt: "ticket_gasoil_050725.pdf"
  },
  {
    id: "EXP-003",
    type: "rent",
    description: "Loyer entrepôt - Juillet",
    amount: 1800.00,
    date: "2025-07-01",
    category: "Immobilier"
  },
  {
    id: "EXP-004",
    type: "electricity",
    description: "EDF - Juin",
    amount: 320.45,
    date: "2025-07-02",
    category: "Énergie"
  },
  {
    id: "EXP-005",
    type: "invoice",
    description: "Fournisseur fruits - Lot 15",
    amount: 850.00,
    date: "2025-07-03",
    category: "Achats",
    receipt: "facture_fruits_030725.pdf"
  },
  {
    id: "EXP-006",
    type: "loss",
    description: "Destruction produits périmés",
    amount: 125.80,
    date: "2025-07-04",
    category: "Pertes"
  }
]

const productProfits: ProductProfit[] = [
  {
    id: "PROD-001",
    name: "Pommes Bio",
    category: "Fruits",
    soldQuantity: 150,
    buyPrice: 2.80,
    sellPrice: 4.20,
    totalRevenue: 630.00,
    totalCost: 420.00,
    profit: 210.00,
    margin: 33.3,
    lossQuantity: 8,
    lossValue: 22.40
  },
  {
    id: "PROD-002",
    name: "Carottes",
    category: "Légumes", 
    soldQuantity: 85,
    buyPrice: 1.50,
    sellPrice: 2.80,
    totalRevenue: 238.00,
    totalCost: 127.50,
    profit: 110.50,
    margin: 46.4,
    lossQuantity: 5,
    lossValue: 7.50
  },
  {
    id: "PROD-003",
    name: "Jus Orange",
    category: "Jus",
    soldQuantity: 45,
    buyPrice: 3.20,
    sellPrice: 5.50,
    totalRevenue: 247.50,
    totalCost: 144.00,
    profit: 103.50,
    margin: 41.8,
    lossQuantity: 2,
    lossValue: 6.40
  }
]

export default function AccountingPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("month")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false)
  const [newExpense, setNewExpense] = useState({
    type: 'fuel' as const,
    description: '',
    amount: '',
    category: '',
    receipt: ''
  })

  // Calculs financiers
  const totalRevenue = productProfits.reduce((sum, p) => sum + p.totalRevenue, 0)
  const totalCosts = productProfits.reduce((sum, p) => sum + p.totalCost, 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const totalLosses = productProfits.reduce((sum, p) => sum + p.lossValue, 0)
  const netProfit = totalRevenue - totalCosts - totalExpenses - totalLosses

  // Filtrer les dépenses
  const filteredExpenses = expenses.filter(expense => 
    selectedCategory === "all" || expense.category === selectedCategory
  )

  // Données pour SectionCards
  const statsData = [
    {
      title: "Chiffre d'Affaires",
      value: `€${totalRevenue.toFixed(2)}`,
      description: "Revenue total",
      trend: {
        value: "+12.5%",
        isPositive: true,
        icon: IconTrendingUp
      },
      footer: {
        label: "vs mois précédent",
        subtitle: "Performance solide"
      }
    },
    {
      title: "Charges Totales",
      value: `€${totalExpenses.toFixed(2)}`,
      description: "Toutes dépenses",
      trend: {
        value: "+5.2%",
        isPositive: false,
        icon: IconTrendingUp
      },
      footer: {
        label: "vs mois précédent",
        subtitle: "Contrôle nécessaire"
      }
    },
    {
      title: "Bénéfice Net",
      value: `€${netProfit.toFixed(2)}`,
      description: "Profit après charges",
      trend: {
        value: netProfit > 0 ? "+18.3%" : "-8.1%",
        isPositive: netProfit > 0,
        icon: netProfit > 0 ? IconTrendingUp : IconTrendingDown
      },
      footer: {
        label: "vs mois précédent",
        subtitle: netProfit > 0 ? "Excellent" : "À améliorer"
      }
    }
  ]

  const handleAddExpense = () => {
    const expense: Expense = {
      id: `EXP-${Date.now()}`,
      type: newExpense.type,
      description: newExpense.description,
      amount: parseFloat(newExpense.amount),
      date: new Date().toISOString().split('T')[0],
      category: newExpense.category,
      receipt: newExpense.receipt || undefined
    }
    
    expenses.push(expense)
    setIsAddExpenseModalOpen(false)
    setNewExpense({
      type: 'fuel',
      description: '',
      amount: '',
      category: '',
      receipt: ''
    })
  }

  const exportToExcel = () => {
    // Logique d'export Excel (à implémenter avec une librairie)
    alert("Export Excel en cours de développement...")
  }

  const getExpenseIcon = (type: string) => {
    switch (type) {
      case 'fuel': return <Fuel className="h-4 w-4 text-blue-600" />
      case 'salary': return <Users className="h-4 w-4 text-green-600" />
      case 'rent': return <Home className="h-4 w-4 text-purple-600" />
      case 'electricity': return <Zap className="h-4 w-4 text-yellow-600" />
      case 'invoice': return <FileText className="h-4 w-4 text-gray-600" />
      case 'loss': return <AlertTriangle className="h-4 w-4 text-red-600" />
      default: return <Calculator className="h-4 w-4" />
    }
  }

  const getExpenseTypeLabel = (type: string) => {
    const labels = {
      fuel: 'Carburant',
      salary: 'Salaire',
      rent: 'Loyer',
      electricity: 'Électricité',
      invoice: 'Facture',
      loss: 'Perte'
    }
    return labels[type as keyof typeof labels] || type
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
            
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold">Comptabilité</h1>
                <p className="text-muted-foreground">Gestion financière et export comptable</p>
              </div>
              
              <div className="flex items-center gap-2">
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Ce mois</SelectItem>
                    <SelectItem value="quarter">Ce trimestre</SelectItem>
                    <SelectItem value="year">Cette année</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700">
                  <Download className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <SectionCards data={statsData} />

            {/* Résumé par catégories */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Coûts Achats"
                value={`€${totalCosts.toFixed(2)}`}
                description="coût des marchandises"
                trend={{ value: "+3.1%", isPositive: false }}
                footer={{
                  label: "vs mois précédent",
                  subtitle: "Matières premières"
                }}
              />
              
              <StatCard
                title="Salaires"
                value={`€${expenses.filter(e => e.type === 'salary').reduce((sum, e) => sum + e.amount, 0).toFixed(2)}`}
                description="charges personnel"
                trend={{ value: "+2.5%", isPositive: false }}
                footer={{
                  label: "vs mois précédent",
                  subtitle: "Masse salariale"
                }}
              />
              
              <StatCard
                title="Charges Fixes"
                value={`€${expenses.filter(e => ['rent', 'electricity'].includes(e.type)).reduce((sum, e) => sum + e.amount, 0).toFixed(2)}`}
                description="loyer + énergie"
                trend={{ value: "+1.2%", isPositive: false }}
                footer={{
                  label: "vs mois précédent",
                  subtitle: "Frais généraux"
                }}
              />
              
              <StatCard
                title="Pertes"
                value={`€${totalLosses.toFixed(2)}`}
                description="produits détruits"
                trend={{ value: "-15.3%", isPositive: true }}
                footer={{
                  label: "vs mois précédent",
                  subtitle: "En amélioration"
                }}
              />
            </div>

            {/* Actions et filtres */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex gap-2">
                <Button onClick={() => setIsAddExpenseModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter Charge
                </Button>
                
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Import Factures
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Label>Catégorie:</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    <SelectItem value="Personnel">Personnel</SelectItem>
                    <SelectItem value="Transport">Transport</SelectItem>
                    <SelectItem value="Immobilier">Immobilier</SelectItem>
                    <SelectItem value="Énergie">Énergie</SelectItem>
                    <SelectItem value="Achats">Achats</SelectItem>
                    <SelectItem value="Pertes">Pertes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tableau des charges */}
            <Card>
              <CardHeader>
                <CardTitle>Charges et Dépenses ({filteredExpenses.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Justificatif</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getExpenseIcon(expense.type)}
                            <span className="font-medium">{getExpenseTypeLabel(expense.type)}</span>
                          </div>
                        </TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{expense.category}</Badge>
                        </TableCell>
                        <TableCell>{expense.date}</TableCell>
                        <TableCell className="font-medium text-red-600">
                          -{expense.amount.toFixed(2)}€
                        </TableCell>
                        <TableCell>
                          {expense.receipt ? (
                            <Button variant="outline" size="sm">
                              <FileText className="h-4 w-4 mr-1" />
                              Voir
                            </Button>
                          ) : (
                            <span className="text-gray-400">Aucun</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Tableau rentabilité par produit */}
            <Card>
              <CardHeader>
                <CardTitle>Rentabilité par Produit</CardTitle>
              </CardHeader>
              <CardContent>
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
                      <TableHead>Pertes</TableHead>
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
                            variant={product.margin > 40 ? 'default' : product.margin > 20 ? 'secondary' : 'destructive'}
                          >
                            {product.margin.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className={`font-medium ${product.profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {product.profit > 0 ? '+' : ''}{product.profit.toFixed(2)}€
                        </TableCell>
                        <TableCell className="text-red-600">
                          -{product.lossValue.toFixed(2)}€
                          <span className="text-xs text-gray-500 block">({product.lossQuantity} unités)</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
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
            <Select value={newExpense.type} onValueChange={(value: any) => setNewExpense({...newExpense, type: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fuel">Carburant</SelectItem>
                <SelectItem value="salary">Salaire</SelectItem>
                <SelectItem value="rent">Loyer</SelectItem>
                <SelectItem value="electricity">Électricité</SelectItem>
                <SelectItem value="invoice">Facture Fournisseur</SelectItem>
                <SelectItem value="loss">Perte/Destruction</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Description</Label>
            <Input
              value={newExpense.description}
              onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
              placeholder="Description de la charge"
            />
          </div>
          
          <div>
            <Label>Montant (€)</Label>
            <Input
              type="number"
              step="0.01"
              value={newExpense.amount}
              onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
              placeholder="0.00"
            />
          </div>
          
          <div>
            <Label>Catégorie</Label>
            <Input
              value={newExpense.category}
              onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
              placeholder="Personnel, Transport, etc."
            />
          </div>
          
          <div>
            <Label>Justificatif (optionnel)</Label>
            <Input
              type="file"
              accept=".pdf,.jpg,.png"
              onChange={(e) => setNewExpense({...newExpense, receipt: e.target.files?.[0]?.name || ''})}
            />
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleAddExpense} className="flex-1">
              Ajouter
            </Button>
            <Button variant="outline" onClick={() => setIsAddExpenseModalOpen(false)} className="flex-1">
              Annuler
            </Button>
          </div>
        </div>
      </Modal>
    </SidebarProvider>
  )
}