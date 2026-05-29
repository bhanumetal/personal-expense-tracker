'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { MonthlyTrendItem } from '@/lib/data/summary'

interface Props {
  data: MonthlyTrendItem[]
}

export function DashboardChartClient({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--heroui-default-200)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: 'var(--heroui-default-500)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: 'var(--heroui-default-500)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
          width={48}
        />
        <Tooltip
          formatter={(value) =>
            new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value))
          }
          contentStyle={{ borderRadius: '8px', border: '1px solid var(--heroui-default-200)' }}
        />
        <Bar dataKey="total" fill="hsl(var(--heroui-primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
