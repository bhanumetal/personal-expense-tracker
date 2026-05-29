import { cache } from 'react'
import { getServerSession } from 'next-auth'
import { Types } from 'mongoose'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Expense from '@/lib/models/Expense'

export type CategoryBreakdownItem = {
  categoryId: string
  categoryName: string
  amount: number
  percent: number
}

export type DashboardSummary = {
  currentMonthTotal: number
  currentMonthCount: number
  lastMonthTotal: number
  largestCategory: { name: string; amount: number } | null
  categoryBreakdown: CategoryBreakdownItem[]
}

export type MonthlyTrendItem = {
  label: string
  total: number
}

export const getDashboardSummary = cache(async (): Promise<DashboardSummary> => {
  const session = await getServerSession(authOptions)
  if (!session) {
    return {
      currentMonthTotal: 0,
      currentMonthCount: 0,
      lastMonthTotal: 0,
      largestCategory: null,
      categoryBreakdown: [],
    }
  }

  await connectDB()
  const userId = new Types.ObjectId(session.user.id)

  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1)

  const [currentMonthAgg, lastMonthAgg, categoryAgg] = await Promise.all([
    Expense.aggregate([
      {
        $match: {
          userId,
          type: 'expense',
          date: { $gte: currentMonthStart },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]),
    Expense.aggregate([
      {
        $match: {
          userId,
          type: 'expense',
          date: { $gte: lastMonthStart, $lt: lastMonthEnd },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]),
    Expense.aggregate([
      {
        $match: {
          userId,
          type: 'expense',
          date: { $gte: currentMonthStart },
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'categoryId',
          foreignField: '_id',
          as: 'category',
        },
      },
      {
        $group: {
          _id: '$categoryId',
          categoryName: { $first: { $arrayElemAt: ['$category.name', 0] } },
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { amount: -1 } },
    ]),
  ])

  const currentMonthTotal: number = currentMonthAgg[0]?.total ?? 0
  const currentMonthCount: number = currentMonthAgg[0]?.count ?? 0
  const lastMonthTotal: number = lastMonthAgg[0]?.total ?? 0

  const categoryBreakdown: CategoryBreakdownItem[] = categoryAgg.map((c) => ({
    categoryId: c._id.toString(),
    categoryName: c.categoryName ?? 'Unknown',
    amount: c.amount,
    percent: currentMonthTotal > 0 ? Math.round((c.amount / currentMonthTotal) * 100) : 0,
  }))

  const largestCategory =
    categoryAgg.length > 0
      ? { name: categoryAgg[0].categoryName ?? 'Unknown', amount: categoryAgg[0].amount }
      : null

  return {
    currentMonthTotal,
    currentMonthCount,
    lastMonthTotal,
    largestCategory,
    categoryBreakdown,
  }
})

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const getMonthlyTrend = cache(async (months = 6): Promise<MonthlyTrendItem[]> => {
  const session = await getServerSession(authOptions)
  if (!session) return []

  await connectDB()
  const userId = new Types.ObjectId(session.user.id)

  const now = new Date()
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1)

  const agg = await Expense.aggregate([
    {
      $match: {
        userId,
        type: 'expense',
        date: { $gte: rangeStart },
      },
    },
    {
      $group: {
        _id: { year: { $year: '$date' }, month: { $month: '$date' } },
        total: { $sum: '$amount' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ])

  const resultMap = new Map(agg.map((r) => [`${r._id.year}-${r._id.month}`, r.total]))

  const trend: MonthlyTrendItem[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`
    trend.push({
      label: MONTH_LABELS[d.getMonth()],
      total: resultMap.get(key) ?? 0,
    })
  }

  return trend
})
