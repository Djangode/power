"use client"

import React, { useState } from "react"
import { AppSidebar } from "@/components/admin/app-sidebar"
import { SiteHeader } from "@/components/admin/site-header"
import { SectionCards } from "@/components/admin/section-cards"
import { StatCard } from "@/components/admin/stat-card"
import { ChartComponent } from "@/components/admin/chart-component"
import { Modal } from "@/components/admin/modal"
import { SidebarInset, SidebarProvider } from "@/components/admin/ui/sidebar"
import { Button } from "@/components/admin/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select"
import { Label } from "@/components/admin/ui/label"
import { Separator } from "@/components/admin/ui/separator"
import { 
  BarChart3, 
  TrendingUp, 
  Target,
  RefreshCw
} from "lucide-react"
import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react"

// Types pour les modals
interface ModalContent {
  title: string
  description: string
  insights: string[]
  recommendations: string[]
  isPositive: boolean
}

export default function AnalyticsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("month")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalContent, setModalContent] = useState<ModalContent | null>(null)

  // Données pour les graphiques
  const salesData = [
    { name: 'Jan', value: 4000, orders: 120 },
    { name: 'Fév', value: 3000, orders: 98 },
    { name: 'Mar', value: 5000, orders: 150 },
    { name: 'Avr', value: 4500, orders: 135 },
    { name: 'Mai', value: 6000, orders: 180 },
    { name: 'Jun', value: 5500, orders: 165 },
    { name: 'Jul', value: 7000, orders: 210 }
  ]

  const categoryData = [
    { name: 'Fruits', value: 35 },
    { name: 'Légumes', value: 28 },
    { name: 'Jus', value: 22 },
    { name: 'Soupes', value: 15 }
  ]

  const trafficData = [
    { name: 'Lun', visitors: 240 },
    { name: 'Mar', visitors: 300 },
    { name: 'Mer', visitors: 280 },
    { name: 'Jeu', visitors: 350 },
    { name: 'Ven', visitors: 420 },
    { name: 'Sam', visitors: 380 },
    { name: 'Dim', visitors: 320 }
  ]

  // Configurations des graphiques
  const salesConfig = {
    value: { label: "Chiffre d'affaires", color: "var(--primary)" }
  }

  const ordersConfig = {
    orders: { label: "Commandes", color: "var(--primary)" }
  }

  const categoryConfig = {
    value: { label: "Pourcentage", color: "var(--primary)" }
  }

  const trafficConfig = {
    visitors: { label: "Visiteurs", color: "var(--primary)" }
  }

  // Données pour SectionCards - STRUCTURE CORRECTE
  const statsData = [
    {
      title: "Chiffre d'Affaires",
      value: "€47,250",
      description: "Revenue mensuel",
      trend: {
        value: "+12.5%",
        isPositive: true,
        icon: IconTrendingUp
      },
      footer: {
        label: "vs mois précédent",
        subtitle: "Objectif: €50,000"
      }
    },
    {
      title: "Commandes",
      value: "1,247",
      description: "Total des commandes",
      trend: {
        value: "+8.2%",
        isPositive: true,
        icon: IconTrendingUp
      },
      footer: {
        label: "vs mois précédent", 
        subtitle: "Panier moyen: €37.90"
      }
    },
    {
      title: "Taux de Conversion",
      value: "2.85%",
      description: "Visiteurs → Acheteurs",
      trend: {
        value: "-0.3%",
        isPositive: false,
        icon: IconTrendingDown
      },
      footer: {
        label: "vs mois précédent",
        subtitle: "Objectif: 3.5%"
      }
    }
  ]

  // Contenu des modals
  const modalContents: { [key: string]: ModalContent } = {
    revenue: {
      title: "Analyse du Chiffre d'Affaires",
      description: "Le chiffre d'affaires représente le montant total des ventes réalisées sur la période sélectionnée.",
      insights: [
        "Croissance de 12.5% par rapport au mois précédent",
        "Pic de ventes en juillet avec 7000€",
        "Tendance générale positive avec quelques fluctuations saisonnières"
      ],
      recommendations: [
        "Analyser les facteurs du pic de juillet pour les reproduire",
        "Mettre en place des promotions pour les mois plus faibles",
        "Diversifier l'offre pour maintenir la croissance"
      ],
      isPositive: true
    },
    ca_restaurants: {
      title: "Analyse CA Restaurants",
      description: "Chiffre d'affaires généré par les clients professionnels.",
      insights: [
        "€28,750 de CA ce mois (+18.5%)",
        "60.8% du chiffre d'affaires total",
        "Panier moyen restaurants: €85.30"
      ],
      recommendations: [
        "Développer des offres spéciales pour les pros",
        "Proposer des tarifs dégressifs sur gros volumes",
        "Créer un service de livraison prioritaire"
      ],
      isPositive: true
    },
    ca_particuliers: {
      title: "Analyse CA Particuliers",
      description: "Chiffre d'affaires généré par les clients particuliers.",
      insights: [
        "€18,500 de CA ce mois (+4.2%)",
        "39.2% du chiffre d'affaires total",
        "Panier moyen particuliers: €25.40"
      ],
      recommendations: [
        "Améliorer l'expérience d'achat en ligne",
        "Proposer des paniers famille/hebdomadaires",
        "Lancer des promotions weekend"
      ],
      isPositive: true
    },
    clients_reguliers_inactifs: {
      title: "Clients Réguliers Inactifs",
      description: "Clients habituellement actifs qui n'ont pas commandé selon leur rythme habituel.",
      insights: [
        "7 clients réguliers inactifs (+3 vs semaine précédente)",
        "Ces clients commandent habituellement 2-3x/semaine",
        "Impact potentiel: €650 de CA manqué"
      ],
      recommendations: [
        "Contacter ces clients immédiatement par téléphone",
        "Proposer une offre de retour personnalisée",
        "Vérifier s'il y a eu un problème de service"
      ],
      isPositive: false
    }
  }

  const openModal = (key: string) => {
    setModalContent(modalContents[key])
    setIsModalOpen(true)
  }

  const timeRanges = [
    { value: "7d", label: "7 derniers jours" },
    { value: "30d", label: "30 derniers jours" },
    { value: "90d", label: "3 derniers mois" }
  ]

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
                <p className="text-muted-foreground">Analysez les performances de votre boutique</p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label>Période:</Label>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">Cette semaine</SelectItem>
                      <SelectItem value="month">Ce mois</SelectItem>
                      <SelectItem value="quarter">Ce trimestre</SelectItem>
                      <SelectItem value="year">Cette année</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button variant="outline" size="icon">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Stats Cards principales */}
            <SectionCards data={statsData} />

            {/* Métriques Clients Pro vs Particuliers */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Analyse Clientèle</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="CA Restaurants"
                  value="€28,750"
                  description="chiffre d'affaires pros"
                  trend={{ value: "+18.5%", isPositive: true }}
                  footer={{
                    label: "60.8% du CA total",
                    subtitle: "Clients pros dominants"
                  }}
                  onClick={() => openModal('ca_restaurants')}
                />
                
                <StatCard
                  title="CA Particuliers"
                  value="€18,500"
                  description="chiffre d'affaires particuliers"
                  trend={{ value: "+4.2%", isPositive: true }}
                  footer={{
                    label: "39.2% du CA total",
                    subtitle: "Croissance modérée"
                  }}
                  onClick={() => openModal('ca_particuliers')}
                />
                
                <StatCard
                  title="Fréquence Pros"
                  value="3.2x/sem"
                  description="commandes restaurants"
                  trend={{ value: "+0.4", isPositive: true }}
                  footer={{
                    label: "vs semaine précédente",
                    subtitle: "Très réguliers"
                  }}
                  onClick={() => openModal('ca_restaurants')}
                />
                
                <StatCard
                  title="Fréquence Particuliers"
                  value="1.8x/sem"
                  description="commandes particuliers"
                  trend={{ value: "-0.1", isPositive: false }}
                  footer={{
                    label: "vs semaine précédente",
                    subtitle: "Légère baisse"
                  }}
                  onClick={() => openModal('ca_particuliers')}
                />
              </div>
            </div>

            {/* Alertes Clients Inactifs */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Alertes Clientèle</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  title="Clients Réguliers Inactifs"
                  value="7"
                  description="clients habituels silencieux"
                  trend={{ value: "+3", isPositive: false }}
                  footer={{
                    label: "vs semaine précédente",
                    subtitle: "⚠️ Nécessite attention"
                  }}
                  onClick={() => openModal('clients_reguliers_inactifs')}
                />
                
                <StatCard
                  title="Restaurants Sans Commande"
                  value="2"
                  description="pros inactifs cette semaine"
                  trend={{ value: "+1", isPositive: false }}
                  footer={{
                    label: "Habituellement actifs",
                    subtitle: "🚨 Relance urgente"
                  }}
                  onClick={() => openModal('clients_reguliers_inactifs')}
                />
                
                <StatCard
                  title="Risque de Churn"
                  value="12"
                  description="clients à risque de partir"
                  trend={{ value: "-2", isPositive: true }}
                  footer={{
                    label: "Inactivité > 2 semaines",
                    subtitle: "🎯 Campagne nécessaire"
                  }}
                  onClick={() => openModal('clients_reguliers_inactifs')}
                />
              </div>
            </div>

            {/* Graphiques principaux */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartComponent
                title="Évolution du Chiffre d'Affaires"
                description="Revenue mensuel en euros"
                type="area"
                data={salesData}
                config={salesConfig}
                dataKey="value"
                xAxisKey="name"
                timeRanges={timeRanges}
                onClick={() => openModal('revenue')}
              />
              
              <ChartComponent
                title="Nombre de Commandes"
                description="Commandes passées par mois"
                type="bar"
                data={salesData}
                config={ordersConfig}
                dataKey="orders"
                xAxisKey="name"
                timeRanges={timeRanges}
                onClick={() => openModal('revenue')}
              />
              
              <ChartComponent
                title="Ventes par Catégorie"
                description="Répartition des ventes"
                type="pie"
                data={categoryData}
                config={categoryConfig}
                dataKey="value"
                onClick={() => openModal('revenue')}
              />
              
              <ChartComponent
                title="Trafic Hebdomadaire"
                description="Visiteurs par jour"
                type="line"
                data={trafficData}
                config={trafficConfig}
                dataKey="visitors"
                xAxisKey="name"
                onClick={() => openModal('revenue')}
              />
            </div>
          </div>
        </div>
      </SidebarInset>

      {/* Modal explicatif */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalContent?.title || ""}
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        {modalContent && (
          <div className="space-y-6">
            <div>
              <p className="text-muted-foreground">{modalContent.description}</p>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Insights Clés
              </h3>
              <ul className="space-y-2">
                {modalContent.insights.map((insight, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-sm">{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <Separator />
            
            <div>
              <h3 className={`font-semibold mb-3 flex items-center gap-2 ${modalContent.isPositive ? 'text-green-600' : 'text-orange-600'}`}>
                {modalContent.isPositive ? <TrendingUp className="h-5 w-5" /> : <Target className="h-5 w-5" />}
                {modalContent.isPositive ? 'Recommandations pour Maintenir' : 'Actions pour Améliorer'}
              </h3>
              <ul className="space-y-2">
                {modalContent.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${modalContent.isPositive ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                    <span className="text-sm">{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className={`p-4 rounded-lg ${modalContent.isPositive ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
              <p className={`text-sm font-medium ${modalContent.isPositive ? 'text-green-800' : 'text-orange-800'}`}>
                {modalContent.isPositive 
                  ? '✅ Performance positive - Continuez sur cette voie !' 
                  : '⚠️ Point d\'amélioration identifié - Actions recommandées'
                }
              </p>
            </div>
          </div>
        )}
      </Modal>
    </SidebarProvider>
  )
}