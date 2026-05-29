import { Card, CardContent, CardHeader, Chip, ProgressBarRoot, ProgressBarTrack, ProgressBarFill, ProgressBarOutput } from '@heroui/react'
import { getDashboardSummary } from '@/lib/data/summary'

const CATEGORY_COLORS = ['accent', 'success', 'warning', 'danger', 'default'] as const

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

export async function DashboardCategoryBreakdown() {
  const { categoryBreakdown } = await getDashboardSummary()

  return (
    <Card className="w-full">
      <CardHeader className="p-4 pb-0">
        <p className="text-base font-semibold">Spending by Category</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-4">
        {categoryBreakdown.length === 0 ? (
          <p className="text-sm text-default-400 text-center py-4">No expenses this month</p>
        ) : (
          categoryBreakdown.map((cat, i) => (
            <div key={cat.categoryId} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-sm">{cat.categoryName}</span>
                <Chip size="sm" variant="soft">{formatINR(cat.amount)}</Chip>
              </div>
              <ProgressBarRoot
                value={cat.percent}
                color={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                size="sm"
                aria-label={cat.categoryName}
              >
                <ProgressBarTrack>
                  <ProgressBarFill />
                </ProgressBarTrack>
                <ProgressBarOutput />
              </ProgressBarRoot>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
