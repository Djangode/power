"use client"

import React, { useState } from "react"
import { AppSidebar } from "@/components/admin/app-sidebar"
import { SiteHeader } from "@/components/admin/site-header"
import { SectionCards } from "@/components/admin/section-cards"
import { Modal } from "@/components/admin/modal"
import { SidebarInset, SidebarProvider } from "@/components/admin/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/ui/table"
import { Button } from "@/components/admin/ui/button"
import { Badge } from "@/components/admin/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select"
import { Input } from "@/components/admin/ui/input"
import { Label } from "@/components/admin/ui/label"
import { Separator } from "@/components/admin/ui/separator"
import { Users, Store, Eye, Edit, Plus, Search, Mail, Bell, Gift, Link2 } from "lucide-react"
import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react"

// Types
interface Customer {
  id: string
  firstName: string
  lastName: string
  email: string
  address: string
  city: string
  clientType: 'particulier' | 'restaurant'
  billingType: 'particulier' | 'pro'
  totalOrders: number
  totalSpent: number
  lastOrderDate: string
  notifications: {
    newsletter: boolean
    promotions: boolean
    sms: boolean
    updates: boolean
  }
  createdAt: string
  isActive: boolean
  abandonedCarts: number
}

// Les données sont maintenant tirées de la base de données

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState("month")
  const [filterType, setFilterType] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [proCode, setProCode] = useState("")
  const [loading, setLoading] = useState(true)

  // States pour les modals
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false)

  React.useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/customers")
      if (res.ok) {
        const data = await res.json()
        setCustomers(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Filtrer les clients
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.city.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = filterType === "all" || customer.clientType === filterType

    return matchesSearch && matchesType
  })

  // Calculer les statistiques
  const totalCustomers = customers.length
  const activeCustomers = customers.filter(c => c.isActive).length
  const totalAbandonedCarts = customers.reduce((sum, c) => sum + c.abandonedCarts, 0)
  const abandonmentRate = totalCustomers > 0 ? ((totalAbandonedCarts / totalCustomers) * 100).toFixed(1) : "0"

  const statsData = [
    {
      title: "Total Clients",
      value: totalCustomers,
      description: "Tous les clients",
      trend: {
        value: "+15%",
        isPositive: true,
        icon: IconTrendingUp
      },
      footer: {
        label: `${customers.filter(c => c.clientType === 'restaurant').length} restaurants`,
        subtitle: "Croissance mensuelle"
      }
    },
    {
      title: "Clients Actifs",
      value: activeCustomers,
      description: "Clients avec commandes récentes",
      trend: {
        value: "+8%",
        isPositive: true,
        icon: IconTrendingUp
      },
      footer: {
        label: `${((activeCustomers / totalCustomers) * 100).toFixed(1)}% du total`,
        subtitle: "Taux d'activité"
      }
    },
    {
      title: "Paniers Abandonnés",
      value: `${abandonmentRate}%`,
      description: "Taux d'abandon",
      trend: {
        value: "-3%",
        isPositive: true,
        icon: IconTrendingDown
      },
      footer: {
        label: `${totalAbandonedCarts} paniers`,
        subtitle: "En amélioration"
      }
    }
  ]

  // Fonctions de gestion
  const handleChangeClientType = (customerId: string, newType: 'particulier' | 'restaurant') => {
    setCustomers(customers.map(customer =>
      customer.id === customerId
        ? {
          ...customer,
          clientType: newType,
          billingType: newType === 'restaurant' ? 'pro' : 'particulier'
        }
        : customer
    ))
  }

  const toggleNotification = (customerId: string, notificationType: keyof Customer['notifications']) => {
    setCustomers(customers.map(customer =>
      customer.id === customerId
        ? {
          ...customer,
          notifications: {
            ...customer.notifications,
            [notificationType]: !customer.notifications[notificationType]
          }
        }
        : customer
    ))
  }

  const generateProCode = () => {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase()
    setProCode(`PRO-${code}`)
  }

  const generateProLink = () => {
    const code = Math.random().toString(36).substring(2, 15)
    setProCode(`https://power.gp/register?promo=${code}`)
  }

  const openDetailsModal = (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsDetailsModalOpen(true)
  }

  const openEditModal = (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsEditModalOpen(true)
  }

  const NotificationIcon = ({ isActive, type, customerId }: { isActive: boolean, type: keyof Customer['notifications'], customerId: string }) => {
    const icons = {
      newsletter: Mail,
      promotions: Gift,
      sms: Bell,
      updates: Bell
    }
    const Icon = icons[type]

    return (
      <button
        onClick={() => toggleNotification(customerId, type)}
        className={`p-1 rounded ${isActive ? 'text-green-600 bg-green-50' : 'text-muted-foreground bg-muted'}`}
        title={`${type} ${isActive ? 'activé' : 'désactivé'}`}
      >
        <Icon className="h-4 w-4" />
      </button>
    )
  }

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "18rem", "--header-height": "3rem",
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
                <h1 className="text-2xl font-bold">Gestion des Clients</h1>
                <p className="text-muted-foreground">Gérez vos clients particuliers et professionnels</p>
              </div>

              {/* Sélecteur de période */}
              <div className="flex items-center gap-2">
                <Label>Période:</Label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Aujourd'hui</SelectItem>
                    <SelectItem value="week">Cette semaine</SelectItem>
                    <SelectItem value="month">Ce mois</SelectItem>
                    <SelectItem value="year">Cette année</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Stats Cards */}
            <SectionCards data={statsData} />

            {/* Actions et filtres */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex gap-2">
                <Button onClick={() => setIsCodeModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Générer Code Pro
                </Button>

                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un client..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Label>Type:</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="particulier">Particuliers</SelectItem>
                    <SelectItem value="restaurant">Restaurants</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tableau des clients */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Clients ({filteredCustomers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Adresse</TableHead>
                      <TableHead>Ville</TableHead>
                      <TableHead>Facturation</TableHead>
                      <TableHead>Commandes</TableHead>
                      <TableHead>Dernière commande</TableHead>
                      <TableHead>Notifications</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{customer.firstName} {customer.lastName}</div>
                            <div className="text-sm text-muted-foreground">{customer.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {customer.clientType === 'restaurant' ? (
                              <Store className="h-4 w-4 text-blue-600" />
                            ) : (
                              <Users className="h-4 w-4 text-green-600" />
                            )}
                            <Badge variant={customer.clientType === 'restaurant' ? 'default' : 'secondary'}>
                              {customer.clientType === 'restaurant' ? 'Restaurant' : 'Particulier'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{customer.address}</TableCell>
                        <TableCell>{customer.city}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {customer.billingType === 'pro' ? 'Professionnel' : 'Particulier'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{customer.totalOrders}</div>
                            <div className="text-sm text-muted-foreground">{customer.totalSpent.toFixed(2)}€</div>
                          </div>
                        </TableCell>
                        <TableCell>{customer.lastOrderDate}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <NotificationIcon
                              isActive={customer.notifications.newsletter}
                              type="newsletter"
                              customerId={customer.id}
                            />
                            <NotificationIcon
                              isActive={customer.notifications.promotions}
                              type="promotions"
                              customerId={customer.id}
                            />
                            <NotificationIcon
                              isActive={customer.notifications.sms}
                              type="sms"
                              customerId={customer.id}
                            />
                            <NotificationIcon
                              isActive={customer.notifications.updates}
                              type="updates"
                              customerId={customer.id}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDetailsModal(customer)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditModal(customer)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
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

      {/* Modal Détails Client */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title={`Détails Client - ${selectedCustomer?.firstName} ${selectedCustomer?.lastName}`}
        className="max-w-3xl"
      >
        {selectedCustomer && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Informations personnelles</Label>
                <div className="mt-2 space-y-1">
                  <p><strong>Nom:</strong> {selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                  <p><strong>Email:</strong> {selectedCustomer.email}</p>
                  <p><strong>Type client:</strong> {selectedCustomer.clientType}</p>
                  <p><strong>Facturation:</strong> {selectedCustomer.billingType}</p>
                </div>
              </div>
              <div>
                <Label>Adresse</Label>
                <div className="mt-2 space-y-1">
                  <p>{selectedCustomer.address}</p>
                  <p>{selectedCustomer.city}</p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Activité</Label>
                <div className="mt-2 space-y-1">
                  <p><strong>Commandes:</strong> {selectedCustomer.totalOrders}</p>
                  <p><strong>Dépenses:</strong> {selectedCustomer.totalSpent.toFixed(2)}€</p>
                  <p><strong>Dernière commande:</strong> {selectedCustomer.lastOrderDate}</p>
                </div>
              </div>
              <div>
                <Label>Statut</Label>
                <div className="mt-2 space-y-1">
                  <p><strong>Actif:</strong> {selectedCustomer.isActive ? 'Oui' : 'Non'}</p>
                  <p><strong>Paniers abandonnés:</strong> {selectedCustomer.abandonedCarts}</p>
                  <p><strong>Inscrit le:</strong> {selectedCustomer.createdAt}</p>
                </div>
              </div>
              <div>
                <Label>Notifications</Label>
                <div className="mt-2 space-y-1">
                  <p><strong>Newsletter:</strong> {selectedCustomer.notifications.newsletter ? 'Oui' : 'Non'}</p>
                  <p><strong>Promotions:</strong> {selectedCustomer.notifications.promotions ? 'Oui' : 'Non'}</p>
                  <p><strong>SMS:</strong> {selectedCustomer.notifications.sms ? 'Oui' : 'Non'}</p>
                  <p><strong>Mises à jour:</strong> {selectedCustomer.notifications.updates ? 'Oui' : 'Non'}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Modification Client */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Modifier - ${selectedCustomer?.firstName} ${selectedCustomer?.lastName}`}
        className="max-w-md"
      >
        {selectedCustomer && (
          <div className="space-y-4">
            <div>
              <Label>Type de client</Label>
              <Select
                value={selectedCustomer.clientType}
                onValueChange={(value: 'particulier' | 'restaurant') =>
                  handleChangeClientType(selectedCustomer.id, value)
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="particulier">Particulier</SelectItem>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-muted rounded">
              <p className="text-sm">
                <strong>Note:</strong> Changer le type vers "Restaurant" activera automatiquement
                la facturation professionnelle.
              </p>
            </div>

            <Button onClick={() => setIsEditModalOpen(false)} className="w-full">
              Fermer
            </Button>
          </div>
        )}
      </Modal>

      {/* Modal Génération Code Pro */}
      <Modal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        title="Générer Code Professionnel"
        className="max-w-md"
      >
        <div className="space-y-4">
          <div>
            <Label>Générer un code ou lien pour inscription professionnelle</Label>
            <p className="text-sm text-muted-foreground mt-1">
              Ce code permettra aux nouveaux clients de s'inscrire directement en tant que professionnel.
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={generateProCode} className="flex-1">
              <Plus className="h-4 w-4 mr-2" />
              Code
            </Button>
            <Button onClick={generateProLink} variant="outline" className="flex-1">
              <Link2 className="h-4 w-4 mr-2" />
              Lien
            </Button>
          </div>

          {proCode && (
            <div className="p-3 bg-muted rounded">
              <Label>Code généré:</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input value={proCode} readOnly className="text-sm" />
                <Button
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(proCode)}
                >
                  Copier
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </SidebarProvider>
  )
}