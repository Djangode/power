import { AppSidebar } from "@/components/admin/app-sidebar"
import { ChartAreaInteractive } from "@/components/admin/chart-area-interactive"
import { SectionCards } from "@/components/admin/section-cards"
import { SiteHeader } from "@/components/admin/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/admin/ui/sidebar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/admin/ui/table"
import { Badge } from "@/components/admin/ui/badge"
import { prisma } from "@/lib/db"
import { format } from "date-fns"

export const dynamic = 'force-dynamic'

export default async function Page() {
  // Période courante et précédente
  const now = new Date()
  const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const totalUsers = await prisma.user.count({ where: { role: "user" } })
  const newUsersThisMonth = await prisma.user.count({
    where: { role: "user", createdAt: { gte: firstDayThisMonth } }
  })
  const newUsersLastMonth = await prisma.user.count({
    where: { role: "user", createdAt: { gte: firstDayLastMonth, lt: firstDayThisMonth } }
  })

  const orders = await prisma.order.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { user: true }
  })

  const ordersThisMonth = await prisma.order.findMany({
    where: { createdAt: { gte: firstDayThisMonth } },
    select: { total: true, status: true }
  })
  const ordersLastMonth = await prisma.order.findMany({
    where: { createdAt: { gte: firstDayLastMonth, lt: firstDayThisMonth } },
    select: { total: true, status: true }
  })

  // CA = commandes réellement encaissées (delivered) ; volume = commandes non annulées
  const revenueThisMonth = ordersThisMonth.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.total, 0)
  const revenueLastMonth = ordersLastMonth.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.total, 0)
  const activeOrdersThisMonth = ordersThisMonth.filter(o => o.status !== 'cancelled').length
  const activeOrdersLastMonth = ordersLastMonth.filter(o => o.status !== 'cancelled').length
  const revenueTrend = revenueLastMonth > 0
    ? (((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100).toFixed(1)
    : "0"

  const usersTrend = newUsersLastMonth > 0
    ? (((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100).toFixed(0)
    : "0"

  const totalRevenue = revenueThisMonth

  // Évolution sur les 6 derniers mois (mois courant inclus)
  const firstMonthStart = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const monthlyOrders = await prisma.order.findMany({
    where: { createdAt: { gte: firstMonthStart } },
    select: { total: true, status: true, createdAt: true },
  })

  const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    return {
      key: `${monthDate.getFullYear()}-${monthDate.getMonth()}`,
      name: monthNames[monthDate.getMonth()],
      revenue: 0,
      orders: 0,
    }
  })
  const chartIndex = new Map(chartData.map((m, i) => [m.key, i]))

  for (const order of monthlyOrders) {
    const key = `${order.createdAt.getFullYear()}-${order.createdAt.getMonth()}`
    const idx = chartIndex.get(key)
    if (idx === undefined) continue
    // CA = commandes réellement encaissées (delivered)
    if (order.status === 'delivered') chartData[idx].revenue += order.total
    // Volume = commandes non annulées
    if (order.status !== 'cancelled') chartData[idx].orders += 1
  }

  const chartPoints = chartData.map(({ name, revenue, orders }) => ({
    name,
    revenue: Number(revenue.toFixed(2)),
    orders,
  }))

  const dashboardStats = [
    {
      title: "Revenus du Mois",
      value: `${totalRevenue.toFixed(2)}€`,
      description: "Chiffre d'affaires mensuel",
      trend: {
        value: `${parseFloat(revenueTrend) >= 0 ? '+' : ''}${revenueTrend}%`,
        isPositive: parseFloat(revenueTrend) >= 0
      },
      footer: {
        label: "vs mois précédent",
        subtitle: `Précédent: ${revenueLastMonth.toFixed(2)}€`
      }
    },
    {
      title: "Nouveaux Clients",
      value: newUsersThisMonth.toString(),
      description: "Inscriptions ce mois",
      trend: {
        value: `${parseInt(usersTrend) >= 0 ? '+' : ''}${usersTrend}%`,
        isPositive: parseInt(usersTrend) >= 0
      },
      footer: {
        label: "Croissance",
        subtitle: `Précédent: ${newUsersLastMonth}`
      }
    },
    {
      title: "Comptes Actifs",
      value: totalUsers.toString(),
      description: "Clients totaux",
      trend: {
        value: `+${newUsersThisMonth}`,
        isPositive: true
      },
      footer: {
        label: "Base de données usagers",
        subtitle: "Tous les clients"
      }
    },
    {
      title: "Commandes du Mois",
      value: activeOrdersThisMonth.toString(),
      description: "Commandes passées",
      trend: {
        value: `${activeOrdersThisMonth - activeOrdersLastMonth >= 0 ? '+' : ''}${activeOrdersThisMonth - activeOrdersLastMonth}`,
        isPositive: activeOrdersThisMonth >= activeOrdersLastMonth
      },
      footer: {
        label: "vs mois précédent",
        subtitle: `Précédent: ${activeOrdersLastMonth}`
      }
    }
  ]

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "18rem",
          "--header-height": "3rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards data={dashboardStats} />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive data={chartPoints} />
              </div>
              <div className="px-4 lg:px-6">
                <h3 className="text-xl font-bold mb-4">Dernières Commandes</h3>
                <div className="border rounded-lg overflow-hidden bg-background">
                  <Table>
                    <TableHeader className="bg-muted">
                      <TableRow>
                        <TableHead>Numéro</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">#{order.id.split('-')[0].toUpperCase()}</TableCell>
                          <TableCell>{order.user.firstName} {order.user.lastName}</TableCell>
                          <TableCell>{format(order.createdAt, 'dd/MM/yyyy HH:mm')}</TableCell>
                          <TableCell>{order.total.toFixed(2)}€</TableCell>
                          <TableCell>
                            <Badge variant={order.status === 'validated' ? 'default' : 'secondary'}>
                              {order.status === 'validated' ? 'Validée' : 'Pendante'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {orders.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                            Aucune commande récente.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}