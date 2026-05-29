'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Category from '@/lib/models/Category'
import { categorySchema } from '@/lib/schemas/category'
import type { CategoryInput } from '@/lib/schemas/category'
import type { ActionResult, FieldErrors } from '@/lib/types/action-result'
import type { SerializedCategory } from '@/lib/data/categories'

function serialize(c: InstanceType<typeof Category>): SerializedCategory {
  return {
    id: c._id.toString(),
    name: c.name,
    isDefault: c.isDefault,
  }
}

export async function createCategory(
  input: CategoryInput,
): Promise<ActionResult<SerializedCategory>> {
  const session = await getServerSession(authOptions)
  if (!session) return { success: false, error: 'You must be signed in.' }

  const result = categorySchema.safeParse(input)
  if (!result.success) {
    return {
      success: false,
      error: 'Please fix the errors below.',
      fields: result.error.flatten().fieldErrors as FieldErrors<CategoryInput>,
    }
  }

  try {
    await connectDB()
    const created = await Category.create({ ...result.data, userId: session.user.id })
    revalidatePath('/categories')
    return { success: true, data: serialize(created) }
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      return { success: false, error: 'A category with that name already exists.' }
    }
    return { success: false, error: 'Unable to save the category. Please try again.' }
  }
}

export async function updateCategory(
  id: string,
  input: CategoryInput,
): Promise<ActionResult<SerializedCategory>> {
  const session = await getServerSession(authOptions)
  if (!session) return { success: false, error: 'You must be signed in.' }

  const result = categorySchema.safeParse(input)
  if (!result.success) {
    return {
      success: false,
      error: 'Please fix the errors below.',
      fields: result.error.flatten().fieldErrors as FieldErrors<CategoryInput>,
    }
  }

  try {
    await connectDB()
    const updated = await Category.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $set: result.data },
      { new: true },
    )
    if (!updated) return { success: false, error: 'Category not found.' }
    revalidatePath('/categories')
    return { success: true, data: serialize(updated) }
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      return { success: false, error: 'A category with that name already exists.' }
    }
    return { success: false, error: 'Unable to update the category. Please try again.' }
  }
}

export async function deleteCategory(id: string): Promise<ActionResult<{ id: string }>> {
  const session = await getServerSession(authOptions)
  if (!session) return { success: false, error: 'You must be signed in.' }

  try {
    await connectDB()
    const deleted = await Category.findOneAndDelete({ _id: id, userId: session.user.id })
    if (!deleted) return { success: false, error: 'Category not found.' }
    revalidatePath('/categories')
    revalidatePath('/expenses')
    return { success: true, data: { id: deleted._id.toString() } }
  } catch {
    return { success: false, error: 'Unable to delete the category. Please try again.' }
  }
}
