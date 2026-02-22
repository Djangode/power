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

interface StatCardData {
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
}

interface StatsCardsProps {
  data: StatCardData[]
}

export function SectionCards({ data }: StatsCardsProps) {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {data.map((stat, index) => (
        <Card key={index} className="@container/card">
          <CardHeader>
            <CardDescription>{stat.title}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {stat.value}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className={stat.trend.isPositive ? "text-green-600" : "text-red-600"}>
                {stat.trend.isPositive ? <IconTrendingUp /> : <IconTrendingDown />}
                {stat.trend.value}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              {stat.footer.label}
              {stat.trend.isPositive ? (
                <IconTrendingUp className="size-4" />
              ) : (
                <IconTrendingDown className="size-4" />
              )}
            </div>
            <div className="text-muted-foreground">
              {stat.footer.subtitle}
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}