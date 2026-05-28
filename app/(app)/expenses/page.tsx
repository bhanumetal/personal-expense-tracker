import { getExpenses } from '@/lib/data/expenses'
import { getCategories } from '@/lib/data/categories'
import { ExpensesClient } from './_components/ExpensesClient'

export default async function ExpensesPage() {
  const [expenses, categories] = await Promise.all([getExpenses(), getCategories()])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Expenses</h1>
        <p className="text-default-500 text-sm">{expenses.length} total expenses</p>
      </div>
      <ExpensesClient expenses={expenses} categories={categories} />
    </div>
  )
}
