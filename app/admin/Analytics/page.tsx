"use client"

import React, { useState, useEffect, useCallback } from "react"
import { AppSidebar } from "@/components/admin/app-sidebar"
import { SiteHeader } from "@/components/admin/site-header"
import { SectionCards } from "@/components/admin/section-cards"
import { ChartComponent } from "@/components/admin/chart-component"
import { SidebarInset, SidebarProvider } from "@/components/admin/ui/sidebar"
import { Button } from "@/components/admin/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/admin/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select"
import { Label } from "@/components/admin/ui/label"
import { Loader2, RefreshCw, LineChart } from "lucide-react"
import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react"
import { getAnalyticsData, type AnalyticsData, type AnalyticsPeriod } from "@/app/actions/analytics"

const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  week: "cette semaine",
  month: "ce mois",
  year: "cette année",
}

function formatEuro(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value)
}

export default function AnalyticsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<AnalyticsPeriod>("month")
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async (period: AnalyticsPeriod) => {
    setLoading(true)
    setError(null)
    try {
      const res = await getAnalyticsData(period)
      if (res.success && res.data) {
        setData(res.data)
      } else {
        setData(null)
        setError(res.error || "Impossible de charger les données analytics.")
      }
    } catch (err) {
      console.error(err)
      setData(null)
      setError("Une erreur est survenue lors du chargement des données.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData(selectedPeriod)
  }, [selectedPeriod, loadData])

  const periodLabel = PERIOD_LABELS[selectedPeriod]

  // Cartes principales (toutes alimentées par les vraies données)
  const statsData = data
    ? [
        {
          title: "Chiffre d'Affaires",
          value: formatEuro(data.revenue),
          description: `Revenu encaissé (${periodLabel})`,
          trend: {
            value: data.revenueTrend.value,
            isPositive: data.revenueTrend.isPositive,
            icon: data.revenueTrend.isPositive ? IconTrendingUp : IconTrendingDown,
          },
          footer: {
            label: "vs période précédente",
            subtitle: "Commandes livrées (payées en caisse)",
          },
        },
        {
          title: "Commandes",
          value: formatNumber(data.ordersCount),
          description: `Commandes (${periodLabel})`,
          trend: {
            value: data.ordersTrend.value,
            isPositive: data.ordersTrend.isPositive,
            icon: data.ordersTrend.isPositive ? IconTrendingUp : IconTrendingDown,
          },
          footer: {
            label: "vs période précédente",
            subtitle: "Hors commandes annulées",
          },
        },
        {
          title: "Panier Moyen",
          value: formatEuro(data.avgBasket),
          description: "Par commande livrée",
          trend: {
            value: data.revenueTrend.value,
            isPositive: data.revenueTrend.isPositive,
            icon: data.revenueTrend.isPositive ? IconTrendingUp : IconTrendingDown,
          },
          footer: {
            label: "CA livré / commandes livrées",
            subtitle: "Sur la période sélectionnée",
          },
        },
        {
          title: "Nouveaux Clients",
          value: formatNumber(data.newCustomers),
          description: `Inscriptions (${periodLabel})`,
          trend: {
            value: data.newCustomersTrend.value,
            isPositive: data.newCustomersTrend.isPositive,
            icon: data.newCustomersTrend.isPositive ? IconTrendingUp : IconTrendingDown,
          },
          footer: {
            label: "vs période précédente",
            subtitle: "Comptes clients créés",
          },
        },
      ]
    : []

  const monthlyData = data?.monthlyEvolution ?? []
  const categoryData = data?.categoryDistribution ?? []
  const topProductsData =
    data?.topProducts.map((p) => ({ name: p.name, quantity: p.quantity, revenue: p.revenue })) ?? []

  const monthlyRevenueConfig = {
    revenue: { label: "Chiffre d'affaires", color: "var(--primary)" },
  }
  const monthlyOrdersConfig = {
    orders: { label: "Commandes", color: "var(--primary)" },
  }
  const categoryConfig = {
    value: { label: "Part du CA (%)", color: "var(--primary)" },
  }
  const topProductsConfig = {
    quantity: { label: "Quantité vendue", color: "var(--primary)" },
  }

  const hasMonthly = monthlyData.some((m) => m.revenue > 0 || m.orders > 0)
  const hasCategory = categoryData.length > 0
  const hasTopProducts = topProductsData.length > 0

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
                <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
                <p className="text-muted-foreground">Analysez les performances réelles de votre boutique</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label>Période :</Label>
                  <Select
                    value={selectedPeriod}
                    onValueChange={(v) => setSelectedPeriod(v as AnalyticsPeriod)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">Cette semaine</SelectItem>
                      <SelectItem value="month">Ce mois</SelectItem>
                      <SelectItem value="year">Cette année</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => loadData(selectedPeriod)}
                  disabled={loading}
                  aria-label="Rafraîchir"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            {/* État de chargement */}
            {loading && (
              <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card py-20 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <p className="text-sm">Chargement des données…</p>
              </div>
            )}

            {/* État d'erreur */}
            {!loading && error && (
              <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-red-500/40 bg-red-500/10 py-16 text-center">
                <p className="text-sm font-medium text-red-500">{error}</p>
                <Button variant="outline" size="sm" onClick={() => loadData(selectedPeriod)}>
                  Réessayer
                </Button>
              </div>
            )}

            {/* Contenu réel */}
            {!loading && !error && data && (
              <>
                {/* Cartes principales */}
                <SectionCards data={statsData} />

                {/* Graphiques principaux */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {hasMonthly ? (
                    <>
                      <ChartComponent
                        title="Évolution du Chiffre d'Affaires"
                        description="CA encaissé sur les 6 derniers mois (commandes livrées)"
                        type="area"
                        data={monthlyData}
                        config={monthlyRevenueConfig}
                        dataKey="revenue"
                        xAxisKey="name"
                      />

                      <ChartComponent
                        title="Nombre de Commandes"
                        description="Commandes passées par mois (hors annulées)"
                        type="bar"
                        data={monthlyData}
                        config={monthlyOrdersConfig}
                        dataKey="orders"
                        xAxisKey="name"
                      />
                    </>
                  ) : (
                    <Card className="lg:col-span-2">
                      <CardHeader>
                        <CardTitle>Évolution mensuelle</CardTitle>
                        <CardDescription>6 derniers mois</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="py-10 text-center text-sm text-muted-foreground">
                          Aucune vente enregistrée sur les 6 derniers mois.
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {hasCategory ? (
                    <ChartComponent
                      title="Ventes par Catégorie"
                      description={`Répartition du CA par catégorie (${periodLabel})`}
                      type="pie"
                      data={categoryData}
                      config={categoryConfig}
                      dataKey="value"
                    />
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>Ventes par Catégorie</CardTitle>
                        <CardDescription>Répartition du CA</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="py-10 text-center text-sm text-muted-foreground">
                          Aucune vente livrée sur la période.
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {hasTopProducts ? (
                    <ChartComponent
                      title="Top Produits"
                      description={`5 produits les plus vendus en quantité (${periodLabel})`}
                      type="bar"
                      data={topProductsData}
                      config={topProductsConfig}
                      dataKey="quantity"
                      xAxisKey="name"
                    />
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>Top Produits</CardTitle>
                        <CardDescription>Meilleures ventes</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="py-10 text-center text-sm text-muted-foreground">
                          Aucun produit vendu sur la période.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Détail Top Produits (chiffres réels) */}
                {hasTopProducts && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Détail des meilleures ventes</CardTitle>
                      <CardDescription>Quantités et CA généré ({periodLabel})</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="divide-y divide-border">
                        {data.topProducts.map((p, index) => (
                          <div key={p.name} className="flex items-center justify-between py-3">
                            <div className="flex items-center gap-3">
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500/15 text-sm font-semibold text-orange-500">
                                {index + 1}
                              </span>
                              <span className="font-medium">{p.name}</span>
                            </div>
                            <div className="flex items-center gap-6 text-sm">
                              <span className="text-muted-foreground">
                                {formatNumber(p.quantity)} vendus
                              </span>
                              <span className="font-semibold tabular-nums">{formatEuro(p.revenue)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Suivi d'audience à venir — bloc honnête (pas de chiffres inventés) */}
                <Card className="border-dashed">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <LineChart className="h-5 w-5 text-orange-500" />
                      Suivi d&apos;audience à venir
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Le trafic, le taux de conversion et la rétention nécessitent un outil de
                      mesure d&apos;audience (ex. Plausible / Google Analytics) qui sera intégré
                      prochainement.
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
