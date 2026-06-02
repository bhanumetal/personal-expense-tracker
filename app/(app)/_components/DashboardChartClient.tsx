'use client'

import '@/lib/chart-registry'
import { Bar } from 'react-chartjs-2'
import type { ChartOptions } from 'chart.js'
import type { MonthlyTrendItem } from '@/lib/data/summary'

interface Props {
  data: MonthlyTrendItem[]
}

function getCSSVar(name: string): string {
  if (typeof window === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export function DashboardChartClient({ data }: Props) {
  const primary = `hsl(${getCSSVar('--heroui-primary')})`
  const gridColor = `var(--heroui-default-200)`
  const tickColor = `var(--heroui-default-500)`

  const chartData = {
    labels: data.map((d) => d.label),
    datasets: [
      {
        data: data.map((d) => d.total),
        backgroundColor: primary,
        borderRadius: 4,
        borderSkipped: false as const,
      },
    ],
  }

  const options: ChartOptions<'bar'> = {
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
              maximumFractionDigits: 0,
            }).format(ctx.parsed.y ?? 0),
        },
        backgroundColor: `var(--heroui-content1)`,
        borderColor: `var(--heroui-default-200)`,
        borderWidth: 1,
        titleColor: tickColor,
        bodyColor: tickColor,
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: tickColor, font: { size: 12 } },
      },
      y: {
        grid: { color: gridColor },
        border: { display: false, dash: [4, 4] },
        ticks: {
          color: tickColor,
          font: { size: 12 },
          callback: (v) => {
            const n = Number(v)
            if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`
            if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}k`
            return `₹${n}`
          },
        },
      },
    },
  }

  return (
    <div className="h-[220px] w-full">
      <Bar data={chartData} options={options} />
    </div>
  )
}
