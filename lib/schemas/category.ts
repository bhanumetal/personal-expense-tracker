import { z } from 'zod'

export const categorySchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name cannot exceed 50 characters')
    .trim(),
})

export type CategoryInput = z.infer<typeof categorySchema>
