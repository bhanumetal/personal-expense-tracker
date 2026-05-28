import { z } from 'zod'

export const expenseSchema = z.object({
  amount: z
    .number({ error: 'Amount must be a number' })
    .positive('Amount must be greater than zero')
    .multipleOf(0.01, 'Amount cannot have more than 2 decimal places'),
  categoryId: z
    .string()
    .min(1, 'Please select a category'),
  date: z
    .string()
    .min(1, 'Date is required')
    .date('Invalid date format'),
  type: z.enum(['expense', 'income']),
  description: z.string().max(200, 'Description cannot exceed 200 characters').optional(),
  note: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
})

export type ExpenseInput = z.infer<typeof expenseSchema>
