# Charts and Visualizations

## Overview

All charts in this application are built with **[react-chartjs-2](https://react-chartjs-2.js.org/)** wrapping **Chart.js**. This replaces the previous `recharts` dependency.

Charts are always:
- **Client Components** — Chart.js uses browser APIs; every chart file must start with `'use client'`
- **Fully responsive** — use `maintainAspectRatio: false` with a sized wrapper `<div>` instead of a fixed `height` prop
- **Theme-aware** — read HeroUI CSS variables for all colors so charts adapt to light/dark mode automatically
- **Wrapped in a Server Component** — data fetching happens in a Server Component parent; only the canvas is a Client Component

---

## Installation

```bash
npm install react-chartjs-2 chart.js
```

---

## Required Setup: Chart.js Registration

Chart.js uses a tree-shakeable registry. Every component type and scale you use must be explicitly registered before rendering. Create a single shared registration file:

**`lib/chart-registry.ts`**

```ts
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
)
```

Import this file at the top of every Client Component that renders a chart — before any chart component is mounted. A missing registration causes a runtime error ("X is not a registered scale").

---

## Reading HeroUI Theme Tokens

Charts must use the same color palette as the rest of the app. HeroUI exposes its design tokens as CSS custom properties on `:root`. Read them at render time so they automatically respond to light/dark mode:

```ts
function getCSSVar(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
}
```

Key variables used in charts:

| Purpose | CSS variable |
|---|---|
| Primary fill (bars, lines) | `--heroui-primary` (HSL value — wrap in `hsl(...)`) |
| Grid lines / borders | `--heroui-default-200` |
| Axis tick labels | `--heroui-default-500` |
| Tooltip background | `--heroui-content1` |
| Tooltip border | `--heroui-default-200` |
| Danger (overspend) | `--heroui-danger` |
| Success (positive delta) | `--heroui-success` |
| Warning (budget alert) | `--heroui-warning` |

Because CSS variables are only readable in the browser, always initialize chart colors inside the component body (not at module scope), and re-derive them when the theme changes by watching `document.documentElement.classList` if needed.

---

## Responsive Containers

Never set a fixed pixel height on a `<Bar>`, `<Line>`, or `<Doughnut>` component. Instead:

1. Set `maintainAspectRatio: false` in options
2. Wrap the chart in a `<div>` with an explicit Tailwind height class

```tsx
<div className="h-[220px] w-full">
  <Bar data={data} options={{ maintainAspectRatio: false, ...rest }} />
</div>
```

The parent `<div>` drives the canvas size; Chart.js fills it. This works correctly with HeroUI `Card` / `CardBody` layouts because `CardBody` is `w-full`.

---

## Chart Components

### Bar Chart — Monthly Spending Trend

Used on: `/dashboard`, `/reports`

**`app/(app)/_components/DashboardChartClient.tsx`**

```tsx
'use client'

import '@/lib/chart-registry'
import { Bar } from 'react-chartjs-2'
import type { ChartOptions } from 'chart.js'
import type { MonthlyTrendItem } from '@/lib/data/summary'

interface Props {
  data: MonthlyTrendItem[]
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
        borderSkipped: false,
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
            }).format(ctx.parsed.y),
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
        grid: { color: gridColor, drawBorder: false },
        border: { display: false, dash: [4, 4] },
        ticks: {
          color: tickColor,
          font: { size: 12 },
          callback: (v) => `₹${(Number(v) / 1000).toFixed(0)}k`,
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

function getCSSVar(name: string): string {
  if (typeof window === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}
```

---

### Line Chart — Monthly Trend (Reports)

Used on: `/reports`

```tsx
'use client'

import '@/lib/chart-registry'
import { Line } from 'react-chartjs-2'
import type { ChartOptions } from 'chart.js'

interface Props {
  labels: string[]
  values: number[]
}

export function ReportsTrendClient({ labels, values }: Props) {
  const primary = `hsl(${getCSSVar('--heroui-primary')})`
  const gridColor = `var(--heroui-default-200)`
  const tickColor = `var(--heroui-default-500)`

  const chartData = {
    labels,
    datasets: [
      {
        data: values,
        borderColor: primary,
        backgroundColor: primary + '1A', // 10% opacity fill
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: primary,
        fill: true,
        tension: 0.4,
      },
    ],
  }

  const options: ChartOptions<'line'> = {
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
            }).format(ctx.parsed.y),
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
          callback: (v) => `₹${(Number(v) / 1000).toFixed(0)}k`,
        },
      },
    },
  }

  return (
    <div className="h-[220px] w-full">
      <Line data={chartData} options={options} />
    </div>
  )
}

function getCSSVar(name: string): string {
  if (typeof window === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}
```

---

### Doughnut Chart — Category Breakdown

Used on: `/dashboard` (optional alternative to the `Progress` bar list)

```tsx
'use client'

import '@/lib/chart-registry'
import { Doughnut } from 'react-chartjs-2'
import type { ChartOptions } from 'chart.js'

interface CategorySlice {
  label: string
  value: number
  color: string // HeroUI semantic color name, e.g. "primary", "success"
}

interface Props {
  slices: CategorySlice[]
}

// Map HeroUI semantic color names to their CSS variable equivalents
const HEROUI_COLORS: Record<string, string> = {
  primary: 'hsl(var(--heroui-primary))',
  success: 'hsl(var(--heroui-success))',
  warning: 'hsl(var(--heroui-warning))',
  danger: 'hsl(var(--heroui-danger))',
  secondary: 'hsl(var(--heroui-secondary))',
  default: 'hsl(var(--heroui-default-400))',
}

export function CategoryDoughnutClient({ slices }: Props) {
  const tickColor = `var(--heroui-default-500)`

  const chartData = {
    labels: slices.map((s) => s.label),
    datasets: [
      {
        data: slices.map((s) => s.value),
        backgroundColor: slices.map((s) => HEROUI_COLORS[s.color] ?? HEROUI_COLORS.default),
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  }

  const options: ChartOptions<'doughnut'> = {
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: tickColor,
          font: { size: 12 },
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 8,
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const value = ctx.parsed
            const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0)
            const pct = ((value / total) * 100).toFixed(1)
            const formatted = new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
              maximumFractionDigits: 0,
            }).format(value)
            return `${ctx.label}: ${formatted} (${pct}%)`
          },
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
  }

  return (
    <div className="h-[220px] w-full">
      <Doughnut data={chartData} options={options} />
    </div>
  )
}
```

---

## Server Component Wrapper Pattern

Data fetching must not happen inside Client Components. The canonical pattern for every chart:

```
app/(app)/_components/
  DashboardChart.tsx         ← async Server Component: fetches data, renders Card shell
  DashboardChartClient.tsx   ← 'use client': receives data as props, renders <Bar>
```

**`DashboardChart.tsx`** (Server Component)

```tsx
import { Card, CardHeader, CardContent, Tabs, Tab } from '@heroui/react'
import { getMonthlyTrend } from '@/lib/data/summary'
import { DashboardChartClient } from './DashboardChartClient'

export async function DashboardChart() {
  const trend = await getMonthlyTrend(6)

  return (
    <Card shadow="sm">
      <CardHeader className="flex items-center justify-between pb-0">
        <p className="text-base font-semibold">Monthly Spending</p>
        <Tabs size="sm" color="primary" variant="underlined" aria-label="Chart range">
          <Tab key="6m" title="6 Months" />
          <Tab key="year" title="This Year" />
        </Tabs>
      </CardHeader>
      <CardContent>
        <DashboardChartClient data={trend} />
      </CardContent>
    </Card>
  )
}
```

Rules:
- The Server Component owns the `Card` shell — this keeps HeroUI structure server-rendered
- The Client Component receives only serializable plain objects (no Mongoose documents, no Date objects — pass ISO strings)
- Never import `react-chartjs-2` or `chart.js` in a Server Component; they reference `window` at module scope

---

## Loading State

Wrap the Server Component with a `Suspense` boundary in the page. The fallback uses HeroUI `Skeleton` sized to match the chart card:

```tsx
import { Suspense } from 'react'
import { Skeleton } from '@heroui/react'
import { DashboardChart } from './_components/DashboardChart'

function ChartSkeleton() {
  return (
    <Skeleton className="w-full rounded-xl">
      <div className="h-[300px]" />
    </Skeleton>
  )
}

// Inside the page:
<Suspense fallback={<ChartSkeleton />}>
  <DashboardChart />
</Suspense>
```

---

## Currency Formatting

All monetary values displayed in tooltips and tick labels use `Intl.NumberFormat` with Indian locale:

```ts
const formatINR = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
```

Y-axis ticks abbreviate large values: `₹12k`, `₹1.5L`. Use this formatter for the `ticks.callback` option:

```ts
callback: (v) => {
  const n = Number(v)
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}k`
  return `₹${n}`
}
```

---

## Global Rules

- **No canvas outside a `'use client'` component.** Chart.js requires the DOM.
- **No inline styles on chart wrappers.** Use Tailwind height utilities only (`h-[220px]`, `h-[300px]`).
- **No custom legend HTML.** Use Chart.js `plugins.legend` config. The only exception is a custom legend built entirely from HeroUI `Chip` + `Flex` layout.
- **No hardcoded hex colors.** All colors must reference HeroUI CSS variables so they adapt to light/dark mode.
- **No fixed `width` on the wrapper div.** Always `w-full` — the parent card controls width.
- **Always register before rendering.** Import `@/lib/chart-registry` before any `<Bar>`, `<Line>`, or `<Doughnut>` usage.
