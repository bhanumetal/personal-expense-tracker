# Data Mutations

This document defines how all data changes are performed in this project. One rule is non-negotiable:

**All mutations happen in Server Actions. No client-side fetch calls, no extra API routes, no mutation logic in Client Components.**

---

## Why Server Actions Only

Server Actions run on the server. They have direct access to the database, the session, and server-only modules. Moving mutation logic there means:

- No API surface to secure separately — authentication and authorization live in one place
- No round-trip serialization problems — typed inputs flow directly into validated DB writes
- No `fetch('/api/...')` calls in components that must handle their own error states, loading states, and retry logic
- Cache invalidation happens in the same function as the write, not in a separate client hook

Route Handlers (`app/api/*/route.ts`) exist only for third-party webhooks or OAuth callbacks — never for mutations initiated by the application's own UI.

---

## File and Folder Convention

All Server Actions live in `app/actions/`. One file per resource.

```
app/
  actions/
    expenses.ts     ← createExpense, updateExpense, deleteExpense
    categories.ts   ← createCategory, deleteCategory
```

Every file starts with `'use server'`. This directive marks every export in the file as a Server Action — no per-function annotation needed.

```ts
// app/actions/expenses.ts
'use server'

// All exports are automatically Server Actions
export async function createExpense(...) {}
export async function updateExpense(...) {}
export async function deleteExpense(...) {}
```

---

## Typed Inputs — Not FormData

**Never use `FormData` as a Server Action parameter.** `FormData` is untyped: every value is `string | File | null`. Using it requires manual casting, manual number coercion, and leaves a gap between what the type system claims and what actually arrives.

Instead, accept a typed input object whose shape is inferred from the Zod schema for that resource.

```ts
// lib/schemas/expense.ts
import { z } from 'zod'

export const expenseSchema = z.object({
  amount: z
    .number({ invalid_type_error: 'Amount must be a number' })
    .positive('Amount must be greater than zero')
    .multipleOf(0.01, 'Amount cannot have more than 2 decimal places'),
  categoryId: z
    .string({ required_error: 'Please select a category' })
    .min(1, 'Please select a category'),
  date: z
    .string({ required_error: 'Date is required' })
    .date('Invalid date format'),
  description: z.string().max(200, 'Description cannot exceed 200 characters').optional(),
})

export type ExpenseInput = z.infer<typeof expenseSchema>
```

The Server Action receives `ExpenseInput` — a concrete TypeScript type. Zod still validates it on arrival because the type annotation is a compile-time guarantee, not a runtime one.

---

## Writing a Server Action

Every Server Action follows this structure, in this order:

1. Authenticate — verify a session exists
2. Validate — parse and type-check the input with Zod's `safeParse`
3. Authorize — confirm the session user owns the resource being mutated (for updates/deletes)
4. Write — perform the database operation
5. Revalidate — invalidate the relevant cached routes
6. Return — an `ActionResult<T>` value

```ts
// app/actions/expenses.ts
'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Expense from '@/lib/models/Expense'
import { expenseSchema } from '@/lib/schemas/expense'
import type { ExpenseInput } from '@/lib/schemas/expense'
import type { ActionResult } from '@/lib/types/action-result'

export async function createExpense(
  input: ExpenseInput,
): Promise<ActionResult<ExpenseInput>> {
  // 1. Authenticate
  const session = await getServerSession(authOptions)
  if (!session) return { success: false, error: 'You must be signed in.' }

  // 2. Validate
  const result = expenseSchema.safeParse(input)
  if (!result.success) {
    return {
      success: false,
      error: 'Please fix the errors below.',
      fields: result.error.flatten().fieldErrors as ActionResult<ExpenseInput>['fields'],
    }
  }

  // 3. Write
  try {
    await connectDB()
    await Expense.create({ ...result.data, userId: session.user.id })
  } catch {
    return { success: false, error: 'Unable to save the expense. Please try again.' }
  }

  // 4. Revalidate
  revalidatePath('/dashboard')
  revalidatePath('/expenses')

  return { success: true }
}
```

### The `ActionResult<T>` type

Defined once in `lib/types/action-result.ts` and reused across all actions.

```ts
// lib/types/action-result.ts
export type FieldErrors<T> = Partial<Record<keyof T, string[]>>

export type ActionResult<T = unknown> =
  | { success: true; data?: T }
  | { success: false; error: string; fields?: FieldErrors<T> }
```

- `fields` carries per-field messages from `result.error.flatten().fieldErrors`
- `error` carries a single human-readable summary
- Never include internal error details, stack traces, or database error messages in either field

---

## Update Pattern

Updates require an additional authorization check: confirm the record belongs to the session user before writing. Do this in a single atomic query using `findOneAndUpdate({ _id, userId })` — never `findByIdAndUpdate(_id)`.

```ts
// app/actions/expenses.ts

import { expenseUpdateSchema } from '@/lib/schemas/expense'
import type { ExpenseUpdateInput } from '@/lib/schemas/expense'

export async function updateExpense(
  id: string,
  input: ExpenseUpdateInput,
): Promise<ActionResult<ExpenseUpdateInput>> {
  const session = await getServerSession(authOptions)
  if (!session) return { success: false, error: 'You must be signed in.' }

  const result = expenseUpdateSchema.safeParse(input)
  if (!result.success) {
    return {
      success: false,
      error: 'Please fix the errors below.',
      fields: result.error.flatten().fieldErrors as ActionResult<ExpenseUpdateInput>['fields'],
    }
  }

  try {
    await connectDB()
    const updated = await Expense.findOneAndUpdate(
      { _id: id, userId: session.user.id },  // ownership enforced in the query
      { $set: result.data },
      { new: true },
    )
    if (!updated) return { success: false, error: 'Expense not found.' }
  } catch {
    return { success: false, error: 'Unable to update the expense. Please try again.' }
  }

  revalidatePath('/expenses')
  revalidatePath(`/expenses/${id}`)

  return { success: true }
}
```

---

## Delete Pattern

Delete actions receive only the record ID. No body to validate beyond the ID itself.

```ts
// app/actions/expenses.ts

export async function deleteExpense(id: string): Promise<ActionResult> {
  const session = await getServerSession(authOptions)
  if (!session) return { success: false, error: 'You must be signed in.' }

  try {
    await connectDB()
    const deleted = await Expense.findOneAndDelete({
      _id: id,
      userId: session.user.id,  // ownership enforced — not findByIdAndDelete
    })
    if (!deleted) return { success: false, error: 'Expense not found.' }
  } catch {
    return { success: false, error: 'Unable to delete the expense. Please try again.' }
  }

  revalidatePath('/expenses')
  revalidatePath('/dashboard')

  return { success: true }
}
```

---

## Calling Actions from Client Components

Since the Server Actions accept typed objects (not `FormData`), they are called programmatically — not bound to a `<form action={...}>` attribute. Use `useTransition` to get a `pending` boolean without blocking the UI.

```tsx
// app/(app)/expenses/_components/ExpenseForm.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addToast } from '@heroui/toast'
import { Alert, Button, TextField, Label, Input, FieldError } from '@heroui/react'
import { createExpense } from '@/app/actions/expenses'
import type { ActionResult } from '@/lib/types/action-result'
import type { ExpenseInput } from '@/lib/schemas/expense'

const initialState: ActionResult<ExpenseInput> = { success: false, error: '' }

export function ExpenseForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [state, setState] = useState<ActionResult<ExpenseInput>>(initialState)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    startTransition(async () => {
      const result = await createExpense({
        amount: Number(amount),
        categoryId: 'placeholder',
        date,
        description: description || undefined,
      })
      setState(result)
      if (result.success) {
        addToast({ title: 'Expense saved', color: 'success' })
        router.push('/expenses')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {!state.success && state.error && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{state.error}</Alert.Title>
          </Alert.Content>
        </Alert>
      )}

      <TextField
        isRequired
        value={amount}
        onChange={setAmount}
        type="number"
        isInvalid={!!state.fields?.amount?.length}
        fullWidth
      >
        <Label>Amount</Label>
        <Input placeholder="0.00" />
        {state.fields?.amount?.[0] && <FieldError>{state.fields.amount[0]}</FieldError>}
      </TextField>

      <TextField
        isRequired
        value={date}
        onChange={setDate}
        type="date"
        isInvalid={!!state.fields?.date?.length}
        fullWidth
      >
        <Label>Date</Label>
        <Input />
        {state.fields?.date?.[0] && <FieldError>{state.fields.date[0]}</FieldError>}
      </TextField>

      <TextField
        value={description}
        onChange={setDescription}
        isInvalid={!!state.fields?.description?.length}
        fullWidth
      >
        <Label>Description</Label>
        <Input placeholder="Optional note" />
        {state.fields?.description?.[0] && (
          <FieldError>{state.fields.description[0]}</FieldError>
        )}
      </TextField>

      <Button type="submit" variant="primary" fullWidth isDisabled={isPending}>
        {isPending ? 'Saving…' : 'Save Expense'}
      </Button>
    </form>
  )
}
```

**Pattern summary:**
- `useTransition` provides `isPending` for loading state
- The action is called inside `startTransition(async () => { ... })` — this marks the state update as non-urgent and keeps the UI responsive
- `setState(result)` stores the latest result for re-render
- On success: show a toast and redirect; on failure: render `state.error` and `state.fields`

---

## Delete from a Button (No Form)

Deletes triggered by a button — not a form — follow the same `useTransition` pattern.

```tsx
// app/(app)/expenses/_components/DeleteButton.tsx
'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addToast } from '@heroui/toast'
import { Button } from '@heroui/react'
import { deleteExpense } from '@/app/actions/expenses'

export function DeleteButton({ id }: { id: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteExpense(id)
      if (result.success) {
        addToast({ title: 'Expense deleted', color: 'success' })
        router.push('/expenses')
      } else {
        addToast({ title: result.error, color: 'danger' })
      }
    })
  }

  return (
    <Button
      variant="outline"
      onPress={handleDelete}
      isDisabled={isPending}
    >
      {isPending ? 'Deleting…' : 'Delete'}
    </Button>
  )
}
```

---

## Cache Invalidation

After every successful write, call `revalidatePath` (or `revalidateTag` if using tagged caches) to ensure the next page load fetches fresh data. Do this before returning from the action.

```ts
// After a create
revalidatePath('/dashboard')      // summary counts change
revalidatePath('/expenses')       // list changes

// After an update
revalidatePath('/expenses')
revalidatePath(`/expenses/${id}`) // detail page changes

// After a delete
revalidatePath('/dashboard')
revalidatePath('/expenses')
```

`revalidatePath` marks the path as stale — Next.js re-fetches it on the next request. It does not trigger a client-side navigation. The client is notified of fresh data via React's concurrent rendering after the action resolves.

---

## Redirect After Mutation (Server-Side)

When a mutation always leads to a different page — e.g., creating a record navigates to its detail page — use `redirect` from `next/navigation` inside the action instead of returning a success value.

```ts
import { redirect } from 'next/navigation'

export async function createCategory(input: CategoryInput): Promise<ActionResult<CategoryInput>> {
  // ... auth, validate, write ...

  const category = await Category.create({ ...result.data, userId: session.user.id })
  revalidatePath('/categories')

  redirect(`/categories/${category._id.toString()}`)
  // redirect() throws internally — code after it does not run
}
```

Use `redirect` when the destination is always the same. Use `return { success: true }` and let the Client Component navigate when the destination depends on client state or the user should see a toast first.

---

## Optimistic Updates

For list mutations where latency matters (toggling a flag, reordering), use `useOptimistic` to update the UI immediately while the action runs in the background.

```tsx
'use client'

import { useOptimistic, useTransition } from 'react'
import { addToast } from '@heroui/toast'
import { deleteExpense } from '@/app/actions/expenses'
import type { Expense } from '@/lib/types'

export function ExpenseList({ expenses }: { expenses: Expense[] }) {
  const [isPending, startTransition] = useTransition()
  const [optimisticExpenses, removeOptimistic] = useOptimistic(
    expenses,
    (current, idToRemove: string) => current.filter((e) => e.id !== idToRemove),
  )

  function handleDelete(id: string) {
    startTransition(async () => {
      removeOptimistic(id)  // instant UI update
      const result = await deleteExpense(id)
      if (!result.success) {
        addToast({ title: result.error, color: 'danger' })
        // React automatically reverts optimistic state when the action fails
      }
    })
  }

  return (
    <ul>
      {optimisticExpenses.map((expense) => (
        <li key={expense.id}>
          {expense.description}
          <button onClick={() => handleDelete(expense.id)} disabled={isPending}>
            Delete
          </button>
        </li>
      ))}
    </ul>
  )
}
```

`useOptimistic` automatically reverts to the server state when the enclosing `startTransition` settles — no manual rollback needed.

---

## What Never to Do

| Forbidden | Why |
|---|---|
| `fetch('/api/expenses', { method: 'POST', body: ... })` in a component | Duplicates mutation logic in the client; bypasses Server Action auth/validation |
| Creating a `POST` Route Handler for a form mutation | Route Handlers exist for external webhooks, not internal UI mutations |
| `async function action(formData: FormData)` in a Server Action | `FormData` values are all `string \| File \| null`; coercion is error-prone and untested |
| `Object.fromEntries(formData)` passed to `safeParse` | Field types are strings; number/boolean fields silently fail Zod checks |
| Calling `schema.parse(input)` instead of `safeParse` | Throws a `ZodError` that becomes an unhandled 500 if not caught |
| Omitting `getServerSession` | Server Actions are public POST endpoints — any caller can invoke them |
| `findByIdAndDelete(id)` without `userId` | Allows any authenticated user to delete any record by guessing an ID |
| Returning `await Expense.create(...)` directly | Returns a raw Mongoose document with internal fields; expose only what the UI needs |
| `revalidatePath` inside a `try` block before the write succeeds | Invalidates the cache even if the write failed — stale data follows |

---

## Checklist for Every Mutation

1. Action file is in `app/actions/` with `'use server'` at the top
2. Input type is `z.infer<typeof schema>` — no `FormData`, no `any`
3. `getServerSession` is called first, before validation or DB access
4. `safeParse` is used, not `parse`
5. Updates and deletes use `findOneAndUpdate({ _id, userId })` / `findOneAndDelete({ _id, userId })`
6. `catch` block logs internally and returns a generic user message — never forwards the caught error
7. `revalidatePath` is called after a successful write, before returning
8. The Client Component uses `useTransition` and calls the action inside `startTransition`
9. Success path shows a toast or redirects — never leaves the form in an ambiguous state
10. Failure path renders `state.error` in an `Alert status="danger"` and field errors via `FieldError`
