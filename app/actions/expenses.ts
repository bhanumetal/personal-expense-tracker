'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Expense from '@/lib/models/Expense'
import { expenseSchema } from '@/lib/schemas/expense'
import type { ExpenseInput } from '@/lib/schemas/expense'
import type { ActionResult, FieldErrors } from '@/lib/types/action-result'
import type { SerializedExpense } from '@/lib/data/expenses'

function serialize(e: InstanceType<typeof Expense>): SerializedExpense {
  return {
    id: e._id.toString(),
    categoryId: e.categoryId.toString(),
    amount: e.amount,
    type: (e.type ?? 'expense') as 'expense' | 'income',
    description: e.description ?? '',
    date: e.date.toISOString().split('T')[0],
    note: e.note ?? '',
  }
}

export async function createExpense(input: ExpenseInput): Promise<ActionResult<SerializedExpense>> {
  const session = await getServerSession(authOptions)
  if (!session) return { success: false, error: 'You must be signed in.' }

  const result = expenseSchema.safeParse(input)
  if (!result.success) {
    return {
      success: false,
      error: 'Please fix the errors below.',
      fields: result.error.flatten().fieldErrors as FieldErrors<ExpenseInput>,
    }
  }

  try {
    await connectDB()
    const created = await Expense.create({ ...result.data, userId: session.user.id })
    revalidatePath('/expenses')
    return { success: true, data: serialize(created) }
  } catch {
    return { success: false, error: 'Unable to save the expense. Please try again.' }
  }
}

export async function updateExpense(
  id: string,
  input: ExpenseInput,
): Promise<ActionResult<SerializedExpense>> {
  const session = await getServerSession(authOptions)
  if (!session) return { success: false, error: 'You must be signed in.' }

  const result = expenseSchema.safeParse(input)
  if (!result.success) {
    return {
      success: false,
      error: 'Please fix the errors below.',
      fields: result.error.flatten().fieldErrors as FieldErrors<ExpenseInput>,
    }
  }

  try {
    await connectDB()
    const updated = await Expense.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $set: result.data },
      { new: true },
    )
    if (!updated) return { success: false, error: 'Expense not found.' }
    revalidatePath('/expenses')
    return { success: true, data: serialize(updated) }
  } catch {
    return { success: false, error: 'Unable to update the expense. Please try again.' }
  }
}

export async function deleteExpense(id: string): Promise<ActionResult<{ id: string }>> {
  const session = await getServerSession(authOptions)
  if (!session) return { success: false, error: 'You must be signed in.' }

  try {
    await connectDB()
    const deleted = await Expense.findOneAndDelete({ _id: id, userId: session.user.id })
    if (!deleted) return { success: false, error: 'Expense not found.' }
    revalidatePath('/expenses')
    return { success: true, data: { id: deleted._id.toString() } }
  } catch {
    return { success: false, error: 'Unable to delete the expense. Please try again.' }
  }
}
