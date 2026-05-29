import { Card, CardContent, CardHeader, Chip, Separator } from '@heroui/react'
import Link from 'next/link'
import { getRecentExpenses } from '@/lib/data/expenses'
import { getCategories } from '@/lib/data/categories'

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export async function DashboardRecentExpenses() {
  const [expenses, categories] = await Promise.all([getRecentExpenses(5), getCategories()])

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]))

  return (
    <Card className="w-full">
      <CardHeader className="flex items-center justify-between p-4 pb-0">
        <p className="text-base font-semibold">Recent Expenses</p>
        <Link
          href="/expenses"
          className="text-sm font-medium text-accent-600 hover:text-accent-700 transition-colors"
        >
          View All →
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {expenses.length === 0 ? (
          <p className="text-sm text-default-400 text-center py-6">No expenses yet</p>
        ) : (
          expenses.map((expense, i) => (
            <div key={expense.id}>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <Chip size="sm" variant="soft">
                    {categoryMap.get(expense.categoryId) ?? 'Unknown'}
                  </Chip>
                  <div>
                    <p className="text-sm">{expense.description || '—'}</p>
                    <p className="text-xs text-default-400">{formatDate(expense.date)}</p>
                  </div>
                </div>
                <p className="text-sm font-medium">{formatINR(expense.amount)}</p>
              </div>
              {i < expenses.length - 1 && <Separator />}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
