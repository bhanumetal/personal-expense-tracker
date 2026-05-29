import { Card, CardContent, Chip } from '@heroui/react'
import { getDashboardSummary } from '@/lib/data/summary'

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

export async function DashboardSummaryCards() {
  const { currentMonthTotal, currentMonthCount, lastMonthTotal, largestCategory } = await getDashboardSummary()

  const delta =
    lastMonthTotal > 0
      ? Math.round(((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100)
      : null

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="flex flex-col gap-1 p-4">
          <Chip size="sm" variant="soft" color="accent">Total This Month</Chip>
          <p className="text-2xl font-bold">{formatINR(currentMonthTotal)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-1 p-4">
          <Chip size="sm" variant="soft" color="default">Expenses Count</Chip>
          <p className="text-2xl font-bold">{currentMonthCount}</p>
          <p className="text-xs text-default-400">transactions</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-1 p-4">
          <Chip size="sm" variant="soft" color="warning">Largest Category</Chip>
          {largestCategory ? (
            <>
              <p className="text-2xl font-bold">{formatINR(largestCategory.amount)}</p>
              <p className="text-xs text-default-400">{largestCategory.name}</p>
            </>
          ) : (
            <p className="text-sm text-default-400">No data</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-1 p-4">
          <Chip
            size="sm"
            variant="soft"
            color={delta === null ? 'default' : delta > 0 ? 'danger' : 'success'}
          >
            vs Last Month
          </Chip>
          {delta === null ? (
            <p className="text-sm text-default-400">No prior data</p>
          ) : (
            <p className={`text-2xl font-bold ${delta > 0 ? 'text-danger-600' : 'text-success-600'}`}>
              {delta > 0 ? '+' : ''}{delta}%
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
