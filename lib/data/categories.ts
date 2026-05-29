import { cache } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Category from '@/lib/models/Category'

export type SerializedCategory = {
  id: string
  name: string
  isDefault: boolean
}

export const getCategories = cache(async (): Promise<SerializedCategory[]> => {
  const session = await getServerSession(authOptions)
  if (!session) return []

  await connectDB()
  const categories = await Category.find({ userId: session.user.id })
    .sort({ name: 1 })
    .lean()

  return categories.map((c) => ({
    id: c._id.toString(),
    name: c.name,
    isDefault: c.isDefault,
  }))
})

export const getCategoryById = cache(async (id: string): Promise<SerializedCategory | null> => {
  const session = await getServerSession(authOptions)
  if (!session) return null

  await connectDB()
  const c = await Category.findOne({ _id: id, userId: session.user.id }).lean()
  if (!c) return null

  return { id: c._id.toString(), name: c.name, isDefault: c.isDefault }
})
