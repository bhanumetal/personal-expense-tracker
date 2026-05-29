import { Suspense } from 'react'
import { Card, CardContent, Skeleton } from '@heroui/react'
import { DashboardSummaryCards } from './_components/DashboardSummaryCards'
import { DashboardSummaryCardsSkeleton } from './_components/DashboardSummaryCardsSkeleton'
import { DashboardChart } from './_components/DashboardChart'
import { DashboardCategoryBreakdown } from './_components/DashboardCategoryBreakdown'
import { DashboardRecentExpenses } from './_components/DashboardRecentExpenses'

function ChartSkeleton() {
  return (
    <Card className="w-full">
      <CardContent className="flex flex-col gap-3 p-4">
        <Skeleton className="h-5 w-40 rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </CardContent>
    </Card>
  )
}

function PanelSkeleton() {
  return (
    <Card className="w-full">
      <CardContent className="flex flex-col gap-3 p-4">
        <Skeleton className="h-5 w-36 rounded-lg" />
        <Skeleton className="h-8 w-full rounded-lg" />
        <Skeleton className="h-8 w-full rounded-lg" />
        <Skeleton className="h-8 w-full rounded-lg" />
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  return (
    <div className="p-6 flex flex-col gap-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>

      <Suspense fallback={<DashboardSummaryCardsSkeleton />}>
        <DashboardSummaryCards />
      </Suspense>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <Suspense fallback={<ChartSkeleton />}>
            <DashboardChart />
          </Suspense>
        </div>
        <div className="w-full md:w-80">
          <Suspense fallback={<PanelSkeleton />}>
            <DashboardCategoryBreakdown />
          </Suspense>
        </div>
      </div>

      <Suspense fallback={<PanelSkeleton />}>
        <DashboardRecentExpenses />
      </Suspense>
    </div>
  )
}
