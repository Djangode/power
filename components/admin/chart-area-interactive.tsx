"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/admin/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/admin/ui/chart"

const chartConfig = {
  revenue: {
    label: "Revenus (€)",
    color: "hsl(var(--primary))",
  },
  orders: {
    label: "Commandes",
    color: "hsl(var(--secondary))",
  },
} satisfies ChartConfig

export interface ChartPoint {
  name: string
  revenue: number
  orders: number
}

interface ChartAreaInteractiveProps {
  data: ChartPoint[]
}

export function ChartAreaInteractive({ data }: ChartAreaInteractiveProps) {
  const hasData = Array.isArray(data) && data.some((d) => d.revenue > 0 || d.orders > 0)

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Performance des Ventes</CardTitle>
        <CardDescription>
          Chiffre d&apos;affaires et volume de commandes sur les 6 derniers mois
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {!hasData ? (
          <div className="flex h-[250px] w-full items-center justify-center text-sm text-muted-foreground">
            Pas encore de données
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <AreaChart data={data}>
              <defs>
                <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-revenue)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-revenue)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={16}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}€`}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Area
                dataKey="revenue"
                name="revenue"
                type="natural"
                fill="url(#fillRevenue)"
                stroke="var(--color-revenue)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
