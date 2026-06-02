import { Card, CardContent, CardHeader } from '@heroui/react'
import { getDashboardSummary } from '@/lib/data/summary'
import { CategoryPieClient } from './CategoryPieClient'

export async function DashboardCategoryBreakdown() {
  const { categoryBreakdown } = await getDashboardSummary()

  return (
    <Card className="w-full">
      <CardHeader className="p-4 pb-0">
        <p className="text-base font-semibold">Spending by Category</p>
      </CardHeader>
      <CardContent className="p-4">
        {categoryBreakdown.length === 0 ? (
          <p className="text-sm text-default-400 text-center py-4">No expenses this month</p>
        ) : (
          <CategoryPieClient data={categoryBreakdown} />
        )}
      </CardContent>
    </Card>
  )
}
