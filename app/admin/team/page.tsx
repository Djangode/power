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
import {
  Users,
  Plus,
  Edit,
  Mail,
  Shield,
  CreditCard,
  Package,
  UserCheck,
  Clock,
  DollarSign,
  Eye,
  Settings
} from "lucide-react"
import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react"

// Types
interface Employee {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: 'admin' | 'cashier' | 'preparation' | 'delivery'
  salary: number
  salaryType: 'hourly' | 'monthly'
  hoursPerWeek: number
  startDate: string
  isActive: boolean
  hasAccount: boolean
  accountCreated: boolean
  permissions: {
    caisse: boolean
    preparation: boolean
    orders: boolean
    products: boolean
    customers: boolean
  }
}

// Les données sont maintenant tirées de la base de données

export default function TeamPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  React.useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/team")
      if (res.ok) {
        const data = await res.json()
        setEmployees(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }
  const [newEmployee, setNewEmployee] = useState<{
    firstName: string
    lastName: string
    email: string
    phone: string
    role: 'admin' | 'cashier' | 'preparation' | 'delivery'
    salary: string
    salaryType: 'hourly' | 'monthly'
    hoursPerWeek: string
  }>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'preparation',
    salary: '',
    salaryType: 'hourly',
    hoursPerWeek: '35'
  })

  // Calculs
  const activeEmployees = employees.filter(e => e.isActive).length
  const totalEmployees = employees.length
  const pendingAccounts = employees.filter(e => !e.accountCreated && e.isActive).length
  const monthlySalaryCost = employees
    .filter(e => e.isActive)
    .reduce((sum, e) => {
      if (e.salaryType === 'monthly') return sum + e.salary
      return sum + (e.salary * e.hoursPerWeek * 4.33) // 4.33 semaines par mois
    }, 0)

  // Données pour SectionCards
  const statsData = [
    {
      title: "Employés Actifs",
      value: activeEmployees,
      description: "équipe actuelle",
      trend: {
        value: "+1",
        isPositive: true,
        icon: IconTrendingUp
      },
      footer: {
        label: `${totalEmployees} total`,
        subtitle: "Équipe stable"
      }
    },
    {
      title: "Comptes en Attente",
      value: pendingAccounts,
      description: "invitations à envoyer",
      trend: {
        value: pendingAccounts > 0 ? "+1" : "0",
        isPositive: false,
        icon: pendingAccounts > 0 ? IconTrendingUp : IconTrendingDown
      },
      footer: {
        label: "Créations compte",
        subtitle: pendingAccounts > 0 ? "Action requise" : "À jour"
      }
    },
    {
      title: "Masse Salariale",
      value: `€${monthlySalaryCost.toFixed(0)}`,
      description: "coût mensuel",
      trend: {
        value: "+5.2%",
        isPositive: false,
        icon: IconTrendingUp
      },
      footer: {
        label: "vs mois précédent",
        subtitle: "Charges sociales incluses"
      }
    }
  ]

  const handleAddEmployee = async () => {
    try {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: newEmployee.firstName,
          lastName: newEmployee.lastName,
          email: newEmployee.email,
          password: "Power2024!", // Mot de passe temporaire
          phone: newEmployee.phone,
          role: newEmployee.role,
          salary: newEmployee.salary ? parseFloat(newEmployee.salary) : undefined,
          salaryType: newEmployee.salaryType,
          hoursPerWeek: newEmployee.hoursPerWeek ? parseInt(newEmployee.hoursPerWeek) : undefined,
        })
      })

      if (res.ok) {
        await loadEmployees()
        setIsAddModalOpen(false)
        setNewEmployee({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          role: 'preparation',
          salary: '',
          salaryType: 'hourly',
          hoursPerWeek: '35'
        })
      } else {
        const data = await res.json()
        alert(data.error || "Erreur lors de l'ajout")
      }
    } catch (error) {
      console.error("Erreur ajout employé:", error)
      alert("Erreur lors de l'ajout de l'employé")
    }
  }

  const sendAccountInvitation = (employeeId: string) => {
    setEmployees(employees.map(emp =>
      emp.id === employeeId
        ? { ...emp, accountCreated: true, hasAccount: true }
        : emp
    ))
    alert(`Invitation envoyée à ${employees.find(e => e.id === employeeId)?.email}`)
  }

  const toggleEmployeeStatus = (employeeId: string) => {
    setEmployees(employees.map(emp =>
      emp.id === employeeId
        ? { ...emp, isActive: !emp.isActive }
        : emp
    ))
  }

  const togglePermission = (employeeId: string, permission: keyof Employee['permissions']) => {
    setEmployees(employees.map(emp =>
      emp.id === employeeId
        ? {
          ...emp,
          permissions: {
            ...emp.permissions,
            [permission]: !emp.permissions[permission]
          }
        }
        : emp
    ))
  }

  const getRoleLabel = (role: string) => {
    const labels = {
      admin: 'Administrateur',
      cashier: 'Caissier',
      preparation: 'Préparateur',
      delivery: 'Livreur'
    }
    return labels[role as keyof typeof labels] || role
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800'
      case 'cashier': return 'bg-blue-100 text-blue-800'
      case 'preparation': return 'bg-green-100 text-green-800'
      case 'delivery': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const PermissionIndicator = ({ isActive, permission, employeeId }: { isActive: boolean, permission: keyof Employee['permissions'], employeeId: string }) => {
    const icons = {
      caisse: CreditCard,
      preparation: Package,
      orders: UserCheck,
      products: Eye,
      customers: Users
    }
    const Icon = icons[permission]

    return (
      <button
        onClick={() => togglePermission(employeeId, permission)}
        className={`relative p-1 rounded transition-all ${isActive
            ? 'text-green-600 bg-green-50 border-green-200'
            : 'text-gray-400 bg-gray-50 border-gray-200'
          } border hover:scale-110`}
        title={`${permission} ${isActive ? 'activé' : 'désactivé'}`}
      >
        <Icon className="h-4 w-4" />
        {isActive && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        )}
      </button>
    )
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
                <h1 className="text-2xl font-bold">Gestion de l'Équipe</h1>
                <p className="text-muted-foreground">Employés, rôles et droits d'accès</p>
              </div>

              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nouvel Employé
              </Button>
            </div>

            {/* Stats Cards */}
            <SectionCards data={statsData} />

            {/* Tableau des employés */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Équipe ({employees.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employé</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead>Salaire</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Compte</TableHead>
                      <TableHead>Droits d'Accès</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.id} className={!employee.isActive ? 'opacity-50' : ''}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{employee.firstName} {employee.lastName}</div>
                            <div className="text-sm text-muted-foreground">{employee.email}</div>
                            <div className="text-xs text-muted-foreground">{employee.phone}</div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge className={getRoleBadgeColor(employee.role)}>
                            {getRoleLabel(employee.role)}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {employee.salaryType === 'monthly'
                                ? `${employee.salary}€/mois`
                                : `${employee.salary}€/h`
                              }
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {employee.hoursPerWeek}h/semaine
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant={employee.isActive ? 'default' : 'secondary'}>
                            {employee.isActive ? 'Actif' : 'Inactif'}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            {employee.accountCreated ? (
                              <Badge className="bg-green-100 text-green-800">
                                <UserCheck className="h-3 w-3 mr-1" />
                                Créé
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => sendAccountInvitation(employee.id)}
                                className="text-orange-600 border-orange-200"
                              >
                                <Mail className="h-3 w-3 mr-1" />
                                Inviter
                              </Button>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex gap-1">
                            <PermissionIndicator
                              isActive={employee.permissions.caisse}
                              permission="caisse"
                              employeeId={employee.id}
                            />
                            <PermissionIndicator
                              isActive={employee.permissions.preparation}
                              permission="preparation"
                              employeeId={employee.id}
                            />
                            <PermissionIndicator
                              isActive={employee.permissions.orders}
                              permission="orders"
                              employeeId={employee.id}
                            />
                            <PermissionIndicator
                              isActive={employee.permissions.products}
                              permission="products"
                              employeeId={employee.id}
                            />
                            <PermissionIndicator
                              isActive={employee.permissions.customers}
                              permission="customers"
                              employeeId={employee.id}
                            />
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedEmployee(employee)
                                setIsEditModalOpen(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleEmployeeStatus(employee.id)}
                              className={employee.isActive ? 'text-red-600' : 'text-green-600'}
                            >
                              {employee.isActive ? 'Désactiver' : 'Activer'}
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

      {/* Modal Ajout Employé */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Nouvel Employé"
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Prénom</Label>
              <Input
                value={newEmployee.firstName}
                onChange={(e) => setNewEmployee({ ...newEmployee, firstName: e.target.value })}
                placeholder="Prénom"
              />
            </div>
            <div>
              <Label>Nom</Label>
              <Input
                value={newEmployee.lastName}
                onChange={(e) => setNewEmployee({ ...newEmployee, lastName: e.target.value })}
                placeholder="Nom"
              />
            </div>
          </div>

          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={newEmployee.email}
              onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
              placeholder="email@power.gp"
            />
          </div>

          <div>
            <Label>Téléphone</Label>
            <Input
              value={newEmployee.phone}
              onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
              placeholder="0690 12 34 56"
            />
          </div>

          <div>
            <Label>Rôle</Label>
            <Select value={newEmployee.role} onValueChange={(value: string) => setNewEmployee({ ...newEmployee, role: value as 'admin' | 'cashier' | 'preparation' | 'delivery' })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="preparation">Préparateur</SelectItem>
                <SelectItem value="cashier">Caissier</SelectItem>
                <SelectItem value="delivery">Livreur</SelectItem>
                <SelectItem value="admin">Administrateur</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Type salaire</Label>
              <Select value={newEmployee.salaryType} onValueChange={(value) => setNewEmployee({ ...newEmployee, salaryType: value as 'hourly' | 'monthly' })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Horaire</SelectItem>
                  <SelectItem value="monthly">Mensuel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Salaire (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={newEmployee.salary}
                onChange={(e) => setNewEmployee({ ...newEmployee, salary: e.target.value })}
                placeholder={newEmployee.salaryType === 'monthly' ? '2000' : '12.50'}
              />
            </div>

            <div>
              <Label>Heures/semaine</Label>
              <Input
                type="number"
                value={newEmployee.hoursPerWeek}
                onChange={(e) => setNewEmployee({ ...newEmployee, hoursPerWeek: e.target.value })}
                placeholder="35"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleAddEmployee} className="flex-1">
              Ajouter Employé
            </Button>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)} className="flex-1">
              Annuler
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Édition Employé */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Modifier - ${selectedEmployee?.firstName} ${selectedEmployee?.lastName}`}
        className="max-w-md"
      >
        {selectedEmployee && (
          <div className="space-y-4">
            <div>
              <Label>Informations de base</Label>
              <div className="text-sm text-muted-foreground mt-1">
                <p><strong>Email:</strong> {selectedEmployee.email}</p>
                <p><strong>Téléphone:</strong> {selectedEmployee.phone}</p>
                <p><strong>Embauché le:</strong> {selectedEmployee.startDate}</p>
              </div>
            </div>

            <Separator />

            <div>
              <Label>Droits d'accès configurés</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span className="text-sm">Caisse: {selectedEmployee.permissions.caisse ? '✅' : '❌'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  <span className="text-sm">Préparation: {selectedEmployee.permissions.preparation ? '✅' : '❌'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  <span className="text-sm">Commandes: {selectedEmployee.permissions.orders ? '✅' : '❌'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span className="text-sm">Produits: {selectedEmployee.permissions.products ? '✅' : '❌'}</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded">
              <p className="text-sm">
                <strong>Note:</strong> Cliquez sur les icônes clignotantes dans le tableau
                pour modifier les droits d'accès en temps réel.
              </p>
            </div>

            <Button onClick={() => setIsEditModalOpen(false)} className="w-full">
              Fermer
            </Button>
          </div>
        )}
      </Modal>
    </SidebarProvider>
  )
}