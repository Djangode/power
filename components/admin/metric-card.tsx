"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card"
import { Badge } from "@/components/admin/ui/badge"
import { TrendingUp, TrendingDown, Info, type LucideIcon } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: {
    value: string
    isPositive: boolean
  }
  icon?: LucideIcon
  onClick?: () => void
  className?: string
  variant?: 'default' | 'success' | 'warning' | 'danger'
}

const variantStyles = {
  default: "border-border",
  success: "border-green-200 bg-green-50/50",
  warning: "border-yellow-200 bg-yellow-50/50", 
  danger: "border-red-200 bg-red-50/50"
}

export function MetricCard({ 
  title, 
  value, 
  subtitle,
  trend,
  icon: Icon,
  onClick,
  className = "",
  variant = 'default'
}: MetricCardProps) {
  
  return (
    <Card 
      className={`cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1 ${variantStyles[variant]} ${className}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          <Info className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-2xl font-bold">{value}</div>
          
          {trend && (
            <Badge 
              variant="outline" 
              className={`${trend.isPositive ? 'text-green-600 border-green-200' : 'text-red-600 border-red-200'}`}
            >
              {trend.isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {trend.value}
            </Badge>
          )}
          
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}