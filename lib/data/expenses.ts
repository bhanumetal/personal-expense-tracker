import { cache } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Expense from '@/lib/models/Expense'

export type SerializedExpense = {
  id: string
  categoryId: string
  amount: number
  type: 'expense' | 'income'
  description: string
  date: string
  note: string
}

export const getExpenses = cache(async (): Promise<SerializedExpense[]> => {
  const session = await getServerSession(authOptions)
  if (!session) return []

  await connectDB()
  const expenses = await Expense.find({ userId: session.user.id })
    .sort({ date: -1 })
    .lean()

  return expenses.map((e) => ({
    id: e._id.toString(),
    categoryId: e.categoryId.toString(),
    amount: e.amount,
    type: (e.type ?? 'expense') as 'expense' | 'income',
    description: e.description ?? '',
    date: e.date.toISOString().split('T')[0],
    note: e.note ?? '',
  }))
})

export const getRecentExpenses = cache(async (limit = 5): Promise<SerializedExpense[]> => {
  const session = await getServerSession(authOptions)
  if (!session) return []

  await connectDB()
  const expenses = await Expense.find({ userId: session.user.id })
    .sort({ date: -1 })
    .limit(limit)
    .lean()

  return expenses.map((e) => ({
    id: e._id.toString(),
    categoryId: e.categoryId.toString(),
    amount: e.amount,
    type: (e.type ?? 'expense') as 'expense' | 'income',
    description: e.description ?? '',
    date: e.date.toISOString().split('T')[0],
    note: e.note ?? '',
  }))
})
