'use client'

import '@/lib/chart-registry'
import { Doughnut } from 'react-chartjs-2'
import type { ChartOptions } from 'chart.js'
import type { CategoryBreakdownItem } from '@/lib/data/summary'

interface Props {
  data: CategoryBreakdownItem[]
}

function getCSSVar(name: string): string {
  if (typeof window === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

const SLICE_VARS = [
  '--heroui-primary',
  '--heroui-success',
  '--heroui-warning',
  '--heroui-danger',
  '--heroui-secondary',
]

const formatINR = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)

export function CategoryPieClient({ data }: Props) {
  const colors = SLICE_VARS.map((v) => `hsl(${getCSSVar(v)})`)
  const tickColor = 'var(--heroui-default-500)'

  const chartData = {
    labels: data.map((d) => d.categoryName),
    datasets: [
      {
        data: data.map((d) => d.amount),
        backgroundColor: data.map((_, i) => colors[i % colors.length]),
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  }

  const options: ChartOptions<'doughnut'> = {
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const value = ctx.parsed
            const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0)
            const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
            return `${ctx.label}: ${formatINR(value)} (${pct}%)`
          },
        },
        backgroundColor: 'var(--heroui-content1)',
        borderColor: 'var(--heroui-default-200)',
        borderWidth: 1,
        titleColor: tickColor,
        bodyColor: tickColor,
        padding: 10,
        cornerRadius: 8,
      },
    },
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="h-[200px] w-full">
        <Doughnut data={chartData} options={options} />
      </div>
      <ul className="flex flex-col gap-2">
        {data.map((cat, i) => (
          <li key={cat.categoryId} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: colors[i % colors.length] }}
              />
              <span className="text-sm">{cat.categoryName}</span>
            </div>
            <span className="text-sm font-medium">{formatINR(cat.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
