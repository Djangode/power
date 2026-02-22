"use client"

import * as React from "react"
import { Area, AreaChart, Bar, BarChart, Line, LineChart, Pie, PieChart, Cell, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  Card,
  CardAction,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/admin/ui/select"

interface ChartComponentProps {
  title: string
  description?: string
  type: 'area' | 'bar' | 'line' | 'pie'
  data: any[]
  config: ChartConfig
  dataKey: string
  xAxisKey?: string
  timeRanges?: { value: string; label: string }[]
  onClick?: () => void
  className?: string
  height?: number
}

const COLORS = ['var(--primary)', 'hsl(var(--muted-foreground))', '#10b981', '#3b82f6', '#f59e0b', '#ef4444']

export function ChartComponent({
  title,
  description,
  type,
  data,
  config,
  dataKey,
  xAxisKey = "name",
  timeRanges,
  onClick,
  className = "",
  height = 250
}: ChartComponentProps) {
  const [timeRange, setTimeRange] = React.useState(timeRanges?.[0]?.value || "all")

  const filteredData = React.useMemo(() => {
    if (!timeRanges || timeRange === "all") return data
    
    // Logique de filtrage basée sur le timeRange
    const now = new Date()
    const daysMap: { [key: string]: number } = {
      "7d": 7,
      "30d": 30,
      "90d": 90,
      "365d": 365
    }
    
    const days = daysMap[timeRange]
    if (!days) return data
    
    return data.slice(-days)
  }, [data, timeRange, timeRanges])

  const renderChart = (): React.ReactElement => {
    const commonProps = {
      data: filteredData,
      style: { height: `${height}px` },
      className: "aspect-auto w-full"
    }

    switch (type) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="fillArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey={xAxisKey}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
            />
            <YAxis hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Area
              dataKey={dataKey}
              type="natural"
              fill="url(#fillArea)"
              stroke="var(--primary)"
            />
          </AreaChart>
        )

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey={xAxisKey}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent />}
            />
            <Bar dataKey={dataKey} fill="var(--primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        )

      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey={xAxisKey}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent />}
            />
            <Line
              dataKey={dataKey}
              type="natural"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        )

      case 'pie':
        return (
          <PieChart {...commonProps}>
            <Pie
              data={filteredData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey={dataKey}
              label={({ name, value }) => `${name}: ${value}`}
            >
              {filteredData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
          </PieChart>
        )

      default:
        return <div>Type de graphique non supporté</div>
    }
  }

  return (
    <Card 
      className={`@container/card cursor-pointer hover:shadow-lg transition-shadow ${className}`}
      onClick={onClick}
    >
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {timeRanges && (
          <CardAction>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeRanges.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={config} className="aspect-auto w-full" style={{ height: `${height}px` }}>
          {renderChart()}
        </ChartContainer>
      </CardContent>
    </Card>
  )
}