# Data Fetching

This document defines how data is fetched in this project. One rule is non-negotiable:

**All data fetching happens in Server Components. No data fetching inside Client Components, and no API routes created solely for reading data.**

---

## Why Server Components Only

Server Components run exclusively on the server. They have direct access to the database, the session, and server-only modules — no network hop, no API surface to secure separately, no client exposure of sensitive data.

- Secrets (database credentials, session tokens) never leave the server
- No `useEffect` + `fetch` patterns that create waterfalls and loading jank
- No over-fetching — the component requests exactly the fields it will render
- Authorization is enforced in the same file that renders the data

Client Components handle interactivity. They receive data as props from Server Components and call Server Actions for mutations. They never fetch data themselves.

---

## File and Folder Convention

Data-fetching functions live in `lib/data/`. One file per resource.

```
lib/
  data/
    expenses.ts       ← getExpenses, getExpenseById, getExpensesByMonth
    categories.ts     ← getCategories, getCategoryById
    summary.ts        ← getMonthlySummary
```

Each function is a plain `async` function. No hooks, no `fetch`, no Route Handlers.

---

## Reading the Session

Every data-fetching function that touches user-owned data must read the session server-side using `getServerSession`. The `userId` from the session is injected into every query — never accepted as a parameter from the caller.

```ts
// lib/data/expenses.ts
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Expense from '@/lib/models/Expense'

export async function getExpenses() {
  const session = await getServerSession(authOptions)
  if (!session) return []

  await connectDB()
  return Expense.find({ userId: session.user.id })
    .sort({ date: -1 })
    .lean()
}
```

**Never accept `userId` as a function parameter.** Doing so would allow a caller to pass any ID and read another user's data.

```ts
// WRONG — any caller can pass any userId
export async function getExpenses(userId: string) { ... }

// CORRECT — userId always comes from the session
export async function getExpenses() {
  const session = await getServerSession(authOptions)
  const userId = session!.user.id
  ...
}
```

---

## Using Data in Server Components

Call data-fetching functions directly inside `async` Server Components. No `useEffect`, no `useState`, no client-side fetch.

```tsx
// app/(app)/expenses/page.tsx
import { getExpenses } from '@/lib/data/expenses'

export default async function ExpensesPage() {
  const expenses = await getExpenses()

  return (
    <ul>
      {expenses.map(expense => (
        <li key={expense._id.toString()}>{expense.description}</li>
      ))}
    </ul>
  )
}
```

The proxy guarantees a session exists for every route under `/(app)`, so `getExpenses` will always have a valid session. The `if (!session) return []` guard in the data function is defense-in-depth.

---

## Authorization: Users Only See Their Own Data

Middleware guarantees authentication — it does not guarantee data ownership. The `userId` filter in every query is what prevents one authenticated user from reading another user's records.

### Rules

| Operation | Required pattern |
|---|---|
| `find` / `findOne` | `{ userId }` in the query |
| `findById` | Use `findOne({ _id: id, userId })` instead |
| `countDocuments` | `{ userId }` in the query |
| `aggregate` | `$match: { userId: new Types.ObjectId(userId) }` as the first stage |

### Correct patterns

```ts
// List all expenses for the session user
await Expense.find({ userId }).sort({ date: -1 }).lean()

// Fetch a single expense — ownership checked in the query
await Expense.findOne({ _id: id, userId }).lean()

// Count
await Expense.countDocuments({ userId })

// Aggregate — cast userId to ObjectId in the first $match stage
import { Types } from 'mongoose'

await Expense.aggregate([
  { $match: { userId: new Types.ObjectId(userId) } },
  { $group: { _id: '$categoryId', total: { $sum: '$amount' } } },
])
```

### Wrong patterns — never do these

```ts
// WRONG: fetches by ID alone — any user can read any record
await Expense.findById(id)

// WRONG: trusting userId from props or route params
export default async function Page({ params }: { params: { userId: string } }) {
  const expenses = await Expense.find({ userId: params.userId })
}

// WRONG: fetch-then-check in JavaScript
const expense = await Expense.findById(id)
if (expense.userId.toString() !== session.user.id) redirect('/expenses')
```

---

## Parallel Fetching — Eliminating Waterfalls

When a page needs multiple independent datasets, fetch them in parallel with `Promise.all`. Sequential `await` calls add full round-trip latency for no reason.

```tsx
// app/(app)/dashboard/page.tsx
import { getExpenses } from '@/lib/data/expenses'
import { getCategories } from '@/lib/data/categories'
import { getMonthlySummary } from '@/lib/data/summary'

export default async function DashboardPage() {
  // bad — sequential, three round-trips
  // const expenses = await getExpenses()
  // const categories = await getCategories()
  // const summary = await getMonthlySummary()

  // good — parallel, one round-trip
  const [expenses, categories, summary] = await Promise.all([
    getExpenses(),
    getCategories(),
    getMonthlySummary(),
  ])

  return <Dashboard expenses={expenses} categories={categories} summary={summary} />
}
```

---

## Parallel Fetching via Component Composition

For pages with sections that load at different speeds, compose sibling Server Components so they fetch independently inside `<Suspense>` boundaries. Next.js renders them concurrently — the fast section appears immediately while the slow one streams in.

```tsx
// app/(app)/dashboard/page.tsx
import { Suspense } from 'react'
import { SummaryPanel } from './_components/SummaryPanel'
import { ExpenseList } from './_components/ExpenseList'
import { SummarySkeleton, ExpenseListSkeleton } from './_components/Skeletons'

export default function DashboardPage() {
  return (
    <main>
      <Suspense fallback={<SummarySkeleton />}>
        <SummaryPanel />
      </Suspense>
      <Suspense fallback={<ExpenseListSkeleton />}>
        <ExpenseList />
      </Suspense>
    </main>
  )
}

// app/(app)/dashboard/_components/SummaryPanel.tsx
// (async Server Component — fetches its own data)
import { getMonthlySummary } from '@/lib/data/summary'

export async function SummaryPanel() {
  const summary = await getMonthlySummary()
  return <div>{summary.total}</div>
}
```

`SummaryPanel` and `ExpenseList` each call `getServerSession` and their own DB queries. Next.js starts both fetches concurrently because neither is inside a sequential `await` chain.

---

## Per-Request Deduplication with `React.cache()`

When multiple Server Components in the same request call the same data function, wrap it with `React.cache()` so the DB query runs only once. The cache is automatically scoped to a single request — it does not persist across requests.

```ts
// lib/data/expenses.ts
import { cache } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Expense from '@/lib/models/Expense'

export const getExpenses = cache(async () => {
  const session = await getServerSession(authOptions)
  if (!session) return []

  await connectDB()
  return Expense.find({ userId: session.user.id }).sort({ date: -1 }).lean()
})
```

If `DashboardPage` and `SummaryPanel` both call `getExpenses()` in the same render pass, the DB query executes once.

---

## Passing Data to Client Components

Server Components pass data to Client Components as props. Only pass the fields the component actually needs — do not forward full Mongoose documents.

```tsx
// Server Component — fetches and slims the data
import { getExpenses } from '@/lib/data/expenses'
import { ExpenseCard } from './_components/ExpenseCard'

export default async function ExpensesPage() {
  const expenses = await getExpenses()

  return (
    <ul>
      {expenses.map(e => (
        // GOOD — only the fields the card renders
        <ExpenseCard
          key={e._id.toString()}
          id={e._id.toString()}
          amount={e.amount}
          description={e.description ?? ''}
          date={e.date.toISOString()}
        />
      ))}
    </ul>
  )
}
```

```tsx
// Client Component — receives typed props, no fetching
'use client'

interface Props {
  id: string
  amount: number
  description: string
  date: string
}

export function ExpenseCard({ id, amount, description, date }: Props) {
  return (
    <li>
      <span>{description}</span>
      <span>{amount}</span>
    </li>
  )
}
```

**Never pass raw Mongoose documents to Client Components.** They contain internal fields, non-serializable ObjectIds, and Date objects that will fail serialization at the RSC boundary.

---

## No API Routes for Reading Data

Route Handlers (`app/api/*/route.ts`) exist for third-party webhooks and OAuth callbacks only. Never create a `GET` Route Handler to serve data to your own UI — that is what Server Components are for.

| Scenario | Correct approach |
|---|---|
| Page needs a list of expenses | Server Component calls `getExpenses()` directly |
| Dashboard needs summary totals | Server Component calls `getMonthlySummary()` directly |
| Client Component needs fresh data after a mutation | Server Action calls `revalidatePath()` — Next.js re-renders the Server Component |
| Third-party webhook delivers data | Route Handler |

---

## No Data Fetching in Client Components

Client Components must never call `fetch('/api/...')` or use SWR/React Query to load initial page data. If a Client Component needs data, a parent Server Component fetches it and passes it as props.

```tsx
// WRONG — client-side fetch for initial data
'use client'
import { useEffect, useState } from 'react'

export function ExpenseList() {
  const [expenses, setExpenses] = useState([])
  useEffect(() => {
    fetch('/api/expenses').then(r => r.json()).then(setExpenses)
  }, [])
  return <ul>{expenses.map(...)}</ul>
}

// CORRECT — Server Component fetches, Client Component renders
// Server:
import { getExpenses } from '@/lib/data/expenses'
import { ExpenseList } from './_components/ExpenseList'

export default async function Page() {
  const expenses = await getExpenses()
  return <ExpenseList expenses={expenses} />
}

// Client:
'use client'
export function ExpenseList({ expenses }: { expenses: Expense[] }) {
  return <ul>{expenses.map(...)}</ul>
}
```

---

## Fetch-by-ID Pattern

When a page displays a single record (detail page), verify ownership by including `userId` in the `findOne` query. If the record does not exist or belongs to another user, `notFound()` from `next/navigation`.

```tsx
// app/(app)/expenses/[id]/page.tsx
import { notFound } from 'next/navigation'
import { getExpenseById } from '@/lib/data/expenses'

export default async function ExpenseDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const expense = await getExpenseById(params.id)
  if (!expense) notFound()

  return <ExpenseDetail expense={expense} />
}
```

```ts
// lib/data/expenses.ts
export const getExpenseById = cache(async (id: string) => {
  const session = await getServerSession(authOptions)
  if (!session) return null

  await connectDB()
  return Expense.findOne({ _id: id, userId: session.user.id }).lean()
})
```

`notFound()` renders the nearest `not-found.tsx`. It does not leak whether the record exists but belongs to someone else — the caller cannot distinguish "not found" from "not yours."

---

## What Never to Do

| Forbidden | Why |
|---|---|
| `fetch('/api/expenses')` in a Client Component | Exposes an API surface, adds latency, requires a separate auth check |
| Creating a `GET` Route Handler for UI data | Adds an unnecessary network round-trip; Server Components have direct DB access |
| Accepting `userId` as a function parameter | Any caller can pass any ID; `userId` must always come from `getServerSession` |
| `Expense.findById(id)` without `userId` in the query | Any authenticated user can read any record by guessing an ID |
| Passing full Mongoose documents to Client Components | Non-serializable fields (`ObjectId`, `Date`) cause RSC serialization errors |
| Sequential `await` for independent queries | Creates unnecessary latency; use `Promise.all` |
| Fetching data inside a `useEffect` | Causes layout jank, waterfalls, and duplicate fetches; use Server Components |

---

## Checklist for Every Page That Displays Data

1. The page is an `async` Server Component (`export default async function`)
2. Data is fetched by calling a function from `lib/data/`
3. The data function reads `userId` from `getServerSession` — never from params or props
4. Every query includes `{ userId }` as a filter condition
5. Independent queries use `Promise.all` or sibling `<Suspense>`-wrapped Server Components
6. Frequently called functions are wrapped with `React.cache()`
7. Client Components receive only the fields they render — no raw Mongoose documents
8. Single-record pages call `notFound()` when the query returns `null`
