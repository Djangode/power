"use client"

import { IconTrendingDown, IconTrendingUp, type Icon } from "@tabler/icons-react"
import { Badge } from "@/components/admin/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/admin/ui/card"

interface StatCardProps {
  title: string
  value: string | number
  description: string
  trend: {
    value: string
    isPositive: boolean
    icon?: Icon
  }
  footer: {
    label: string
    subtitle: string
  }
  onClick?: () => void
  className?: string
}

export function StatCard({ 
  title, 
  value, 
  description, 
  trend, 
  footer, 
  onClick,
  className = ""
}: StatCardProps) {
  return (
    <Card 
      className={`@container/card cursor-pointer hover:shadow-lg transition-shadow ${className}`}
      onClick={onClick}
    >
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value}
        </CardTitle>
        <CardAction>
          <Badge variant="outline" className={trend.isPositive ? "text-green-600" : "text-red-600"}>
            {trend.isPositive ? <IconTrendingUp /> : <IconTrendingDown />}
            {trend.value}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="line-clamp-1 flex gap-2 font-medium">
          {footer.label}
          {trend.isPositive ? (
            <IconTrendingUp className="size-4" />
          ) : (
            <IconTrendingDown className="size-4" />
          )}
        </div>
        <div className="text-muted-foreground">
          {footer.subtitle}
        </div>
      </CardFooter>
    </Card>
  )
}