# React & Next.js Best Practices

**Source:** [vercel-labs/agent-skills — react-best-practices/AGENTS.md](https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/AGENTS.md)
**Version:** 1.0.0 (Vercel Engineering, January 2026)
**Adapted for:** personal-expense-tracker (Next.js App Router, React 19, TypeScript strict mode)

Rules are ordered by impact: **CRITICAL → HIGH → MEDIUM-HIGH → MEDIUM → LOW-MEDIUM → LOW**.

---

## 1. Eliminating Waterfalls — CRITICAL

Waterfalls are the #1 performance killer. Every sequential `await` that could be parallel adds full round-trip latency.

### 1.1 Check cheap conditions before async flags
Evaluate synchronous guards (auth check, feature flag, type narrowing) before any `await`. If the compound condition can't be true, skip the network call entirely.

```ts
// bad
const flag = await getFeatureFlag('expense-import')
if (!user || !flag) return

// good
if (!user) return
const flag = await getFeatureFlag('expense-import')
if (!flag) return
```

### 1.2 Defer `await` until the value is actually used
Move `await` into the branch that needs it, not before the branch.

```ts
// bad
const categories = await fetchCategories()
if (req.method !== 'GET') return 405

// good
if (req.method !== 'GET') return 405
const categories = await fetchCategories()
```

### 1.3 `Promise.all()` for independent operations
When two or more async calls have no dependency on each other, run them in parallel.

```ts
// bad
const user = await getUser(userId)
const expenses = await getExpenses(userId)

// good
const [user, expenses] = await Promise.all([
  getUser(userId),
  getExpenses(userId),
])
```

### 1.4 Dependency-based parallelization
When operations have partial dependencies, start each task as early as possible rather than waiting for the full previous result.

```ts
// bad
const user = await getUser(userId)
const profile = await getProfile(user.profileId)
const budget = await getBudget(user.budgetId)

// good — profile and budget are independent; start both after user resolves
const userPromise = getUser(userId)
const [profile, budget] = await Promise.all([
  userPromise.then(u => getProfile(u.profileId)),
  userPromise.then(u => getBudget(u.budgetId)),
])
```

### 1.5 Prevent waterfall chains in Server Actions and API Routes
In Server Actions (e.g., `app/actions/expenses.ts`), kick off independent operations before awaiting them.

```ts
// bad
export async function createExpense(data: ExpenseInput) {
  const user = await auth()
  const category = await getCategory(data.categoryId)  // sequential
  await saveExpense({ ...data, userId: user.id })
}

// good
export async function createExpense(data: ExpenseInput) {
  const [user, category] = await Promise.all([
    auth(),
    getCategory(data.categoryId),   // runs in parallel
  ])
  await saveExpense({ ...data, userId: user.id })
}
```

### 1.6 Strategic Suspense boundaries
Wrap independently-fetching Server Components in `<Suspense>` so the surrounding shell renders immediately while data loads. Do not block an entire layout on a single slow fetch.

```tsx
// good — sidebar renders while expense list streams in
export default function DashboardPage() {
  return (
    <main>
      <Sidebar />
      <Suspense fallback={<ExpenseSkeleton />}>
        <ExpenseList />
      </Suspense>
    </main>
  )
}
```

---

## 2. Bundle Size Optimization — CRITICAL

### 2.1 Avoid barrel file imports
Import directly from source files. Barrel files (e.g., `lucide-react`, `date-fns`) can pull in thousands of unused modules.

```ts
// bad
import { DollarSign, TrendingUp, Calendar } from 'lucide-react'

// good — direct import
import DollarSign from 'lucide-react/dist/esm/icons/dollar-sign'
import TrendingUp  from 'lucide-react/dist/esm/icons/trending-up'
```

Or configure `optimizePackageImports` in `next.config.ts` (Next.js 13.5+):

```ts
// next.config.ts
const nextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', '@heroui/react'],
  },
}
```

### 2.2 Dynamic imports for heavy components
Components not needed on initial render (modals, charts, rich-text editors) should be lazy-loaded.

```ts
import dynamic from 'next/dynamic'

const ExpenseChart = dynamic(() => import('@/components/ExpenseChart'), {
  loading: () => <ChartSkeleton />,
})
```

### 2.3 Defer non-critical third-party libraries
Analytics, logging, and error tracking should load after hydration.

```ts
const Analytics = dynamic(() => import('@/components/Analytics'), {
  ssr: false,
})
```

### 2.4 Conditional module loading
Load large data or config modules only when features are activated.

```ts
// bad — always bundled
import { currencyData } from '@/data/currencies'

// good — loaded only when the currency selector opens
const { currencyData } = await import('@/data/currencies')
```

### 2.5 Prefer statically analyzable import paths
Use explicit maps or literal paths so the bundler can narrow which files to include.

```ts
// bad — dynamic path defeats tree-shaking
const mod = await import(`@/utils/${name}`)

// good
const loaders: Record<string, () => Promise<unknown>> = {
  csv:  () => import('@/utils/importCsv'),
  json: () => import('@/utils/importJson'),
}
const mod = await loaders[format]?.()
```

### 2.6 Preload based on user intent
Preload heavy bundles on hover or focus to reduce perceived latency.

```tsx
const preloadChart = () => import('@/components/ExpenseChart')

<button onMouseEnter={preloadChart} onClick={openChart}>
  View Chart
</button>
```

---

## 3. Server-Side Performance — HIGH

### 3.1 Authenticate Server Actions like API routes
Server Actions are public endpoints. Always verify auth inside the action itself — never rely solely on middleware or page-level guards.

```ts
// app/actions/expenses.ts
'use server'
import { auth } from '@/lib/auth'

export async function deleteExpense(id: string) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')
  // proceed
}
```

### 3.2 Per-request deduplication with `React.cache()`
Wrap data-fetching functions with `React.cache()` so multiple Server Components in one request share a single fetch.

```ts
import { cache } from 'react'
import { getExpenses } from '@/lib/db'

export const getCachedExpenses = cache(async (userId: string) => {
  return getExpenses(userId)
})
```

Pass the same primitive argument — do not pass inline objects (they break cache key equality).

### 3.3 Parallel data fetching with component composition
Structure Server Components so siblings fetch concurrently, not sequentially.

```tsx
// bad — sequential inside one component
export default async function Dashboard({ userId }: { userId: string }) {
  const expenses  = await getExpenses(userId)
  const budget    = await getBudget(userId)
  return <View expenses={expenses} budget={budget} />
}

// good — siblings run concurrently
export default function Dashboard({ userId }: { userId: string }) {
  return (
    <>
      <Suspense fallback={<Skeleton />}><ExpensePanel userId={userId} /></Suspense>
      <Suspense fallback={<Skeleton />}><BudgetPanel  userId={userId} /></Suspense>
    </>
  )
}
```

### 3.4 Minimize serialization at RSC boundaries
Only pass fields the client component actually needs across the Server→Client boundary.

```tsx
// bad — sends full Mongoose document
<ExpenseCard expense={expense} />

// good — send only what is rendered
<ExpenseCard
  id={expense._id.toString()}
  amount={expense.amount}
  label={expense.label}
  date={expense.date.toISOString()}
/>
```

### 3.5 Avoid duplicate serialization in RSC props
Perform array transformations (`.filter`, `.map`, `.toSorted`) on the client, not the server, to leverage RSC's reference-based deduplication.

### 3.6 Avoid shared module state for request-scoped data
Never store request-scoped values (user ID, session, locale) in mutable module-level variables inside Server Components — concurrent renders will race.

```ts
// bad
let currentUser: User | null = null   // shared across requests!

// good — use React.cache() or pass as arguments
```

### 3.7 Hoist static I/O to module level
Load config files, font assets, and static JSON once at module initialization, not on every request.

```ts
// bad
export async function getCurrencies() {
  const data = await readFile('./data/currencies.json')  // per-request
  return JSON.parse(data)
}

// good
import currencies from '@/data/currencies.json'  // once at build/module init
```

### 3.8 `after()` for non-blocking post-response work
Use Next.js `after()` to schedule logging, analytics, and cache invalidation after the response is sent.

```ts
import { after } from 'next/server'

export async function createExpense(data: ExpenseInput) {
  const expense = await saveExpense(data)
  after(() => logExpenseCreated(expense.id))  // doesn't block response
  return expense
}
```

### 3.9 Cross-request LRU caching
For data shared across sequential requests (e.g., category lists, exchange rates), use an LRU cache.

```ts
import LRU from 'lru-cache'

const cache = new LRU<string, Category[]>({ max: 100, ttl: 60_000 })

export async function getCategories() {
  if (cache.has('all')) return cache.get('all')!
  const data = await db.category.findMany()
  cache.set('all', data)
  return data
}
```

---

## 4. Client-Side Data Fetching — MEDIUM-HIGH

### 4.1 Use SWR for automatic deduplication
Prefer `useSWR` for client-side data fetching — it deduplicates, caches, and revalidates automatically.

```ts
import useSWR from 'swr'

function useExpenses(userId: string) {
  return useSWR(`/api/expenses?userId=${userId}`, fetcher, {
    revalidateOnFocus: false,
  })
}
```

### 4.2 Use passive event listeners for scroll performance
Add `{ passive: true }` to `touchstart`, `touchmove`, and `wheel` event listeners to enable immediate scrolling.

```ts
useEffect(() => {
  const handler = (e: TouchEvent) => { /* ... */ }
  window.addEventListener('touchmove', handler, { passive: true })
  return () => window.removeEventListener('touchmove', handler)
}, [])
```

### 4.3 Deduplicate global event listeners
Use module-level Maps to share a single event listener across component instances.

```ts
const listeners = new Map<string, Set<() => void>>()

function subscribe(event: string, cb: () => void) {
  if (!listeners.has(event)) listeners.set(event, new Set())
  listeners.get(event)!.add(cb)
}
```

### 4.4 Version and minimize localStorage data
Add version prefixes, store only needed fields, and wrap in try-catch.

```ts
const STORAGE_KEY = 'expense-tracker:v2:filters'

function saveFilters(filters: Filters) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: filters.category,
      period: filters.period,
    }))
  } catch {
    // incognito / quota exceeded — fail silently
  }
}
```

---

## 5. Re-render Optimization — MEDIUM

### 5.1 Calculate derived state during rendering
Compute values from props/state inline during render — do not store them in state or sync via effects.

```ts
// bad
const [total, setTotal] = useState(0)
useEffect(() => { setTotal(expenses.reduce((s, e) => s + e.amount, 0)) }, [expenses])

// good
const total = expenses.reduce((s, e) => s + e.amount, 0)
```

### 5.2 Do not wrap simple expressions with `useMemo`
The hook overhead exceeds computation cost for primitives and simple expressions.

```ts
// bad
const isOverBudget = useMemo(() => spent > budget, [spent, budget])

// good
const isOverBudget = spent > budget
```

### 5.3 Do not define components inside components
Inline component definitions remount on every parent render, destroying state and DOM.

```tsx
// bad
function ExpenseList({ items }: Props) {
  function Row({ item }: { item: Expense }) {   // remounts every render
    return <li>{item.label}</li>
  }
  return <ul>{items.map(i => <Row key={i.id} item={i} />)}</ul>
}

// good — defined outside
function Row({ item }: { item: Expense }) {
  return <li>{item.label}</li>
}
```

### 5.4 Extract default non-primitive parameter values
Move default array/object values for memoized components to module-level constants.

```ts
const EMPTY_EXPENSES: Expense[] = []

function ExpenseList({ items = EMPTY_EXPENSES }: Props) { /* ... */ }
```

### 5.5 Narrow effect dependencies
Use primitive values rather than objects in dependency arrays.

```ts
// bad
useEffect(() => { fetchExpenses(user) }, [user])

// good
useEffect(() => { fetchExpenses(user.id) }, [user.id])
```

### 5.6 Use functional `setState` updates
Avoid stale closures and stabilize callback references.

```ts
// bad
setCount(count + 1)

// good
setCount(curr => curr + 1)
```

### 5.7 Use lazy state initialization
Pass a function to `useState` for expensive initial computations.

```ts
// bad
const [filters, setFilters] = useState(parseFiltersFromURL(window.location.search))

// good
const [filters, setFilters] = useState(() => parseFiltersFromURL(window.location.search))
```

### 5.8 Use `useRef` for transient values
Values that change frequently but don't drive rendering (mouse position, interval IDs, scroll offset) belong in refs.

```ts
const scrollY = useRef(0)
const onScroll = () => { scrollY.current = window.scrollY }
```

### 5.9 Use `startTransition` for non-urgent updates
Mark filtering, sorting, and search updates as transitions to keep input responsive.

```ts
import { useTransition } from 'react'

const [isPending, startTransition] = useTransition()

function handleSearch(q: string) {
  startTransition(() => setQuery(q))
}
```

### 5.10 Use `useDeferredValue` for expensive derived renders
Defer heavy re-renders triggered by user input while keeping the input itself snappy.

```ts
const deferredQuery = useDeferredValue(query)
const filteredExpenses = useMemo(
  () => expenses.filter(e => e.label.includes(deferredQuery)),
  [expenses, deferredQuery]
)
```

### 5.11 Put interaction logic in event handlers, not effects
Side effects from specific user actions should live in the handler, not in a `state + useEffect` pattern.

```ts
// bad
const [submitted, setSubmitted] = useState(false)
useEffect(() => { if (submitted) sendToAPI() }, [submitted])

// good
async function handleSubmit() {
  await sendToAPI()
}
```

---

## 6. Rendering Performance — MEDIUM

### 6.1 Use explicit conditional rendering
Use ternary operators, not `&&`, to prevent accidentally rendering `0` or `NaN`.

```tsx
// bad
{expenses.length && <ExpenseList expenses={expenses} />}

// good
{expenses.length > 0 ? <ExpenseList expenses={expenses} /> : null}
```

### 6.2 Use `useTransition` over manual loading states
`useTransition` provides built-in `isPending` and transition management.

```tsx
const [isPending, startTransition] = useTransition()

<button onClick={() => startTransition(loadExpenses)} disabled={isPending}>
  {isPending ? 'Loading…' : 'Load Expenses'}
</button>
```

### 6.3 `CSS content-visibility` for long lists
Apply `content-visibility: auto` to defer off-screen rendering for long expense lists.

```css
.expense-row {
  content-visibility: auto;
  contain-intrinsic-size: 0 56px; /* estimated row height */
}
```

### 6.4 Hoist static JSX elements
Extract static JSX (icons, empty states, headings) outside components to avoid re-creation on every render.

```tsx
const EMPTY_STATE = (
  <div className="text-center text-muted">No expenses yet</div>
)

function ExpenseList({ items }: Props) {
  if (!items.length) return EMPTY_STATE
  // ...
}
```

### 6.5 Prevent hydration mismatch without flickering
Use inline synchronous scripts to apply client-side storage data before React hydrates.

```tsx
// in layout.tsx — runs before hydration
<script
  dangerouslySetInnerHTML={{
    __html: `
      try {
        const theme = localStorage.getItem('theme') || 'light'
        document.documentElement.dataset.theme = theme
      } catch {}
    `,
  }}
/>
```

### 6.6 Suppress expected hydration mismatches
Use `suppressHydrationWarning` on elements with intentional server/client differences (timestamps, locale-formatted numbers).

```tsx
<time suppressHydrationWarning>{new Date(expense.date).toLocaleDateString()}</time>
```

### 6.7 Use React DOM resource hints
Use `prefetchDNS`, `preconnect`, and `preload` APIs to hint the browser about critical resources.

```ts
import { preconnect, prefetchDNS } from 'react-dom'

preconnect('https://fonts.googleapis.com')
prefetchDNS('https://api.exchangerate.host')
```

### 6.8 Use `defer` / `async` on script tags
Use `next/script` with an appropriate `strategy` instead of bare `<script>` tags.

```tsx
import Script from 'next/script'

<Script src="/analytics.js" strategy="afterInteractive" />
```

---

## 7. JavaScript Performance — LOW-MEDIUM

### 7.1 Use `Set` / `Map` for O(1) lookups
Replace `.includes()` and `.find()` with Set/Map when checking membership inside loops or renders.

```ts
const selectedIds = new Set(selectedExpenses.map(e => e.id))
const isSelected = (id: string) => selectedIds.has(id)  // O(1)
```

### 7.2 Build index maps for repeated lookups
Pre-build a Map when you need to look up items by key repeatedly.

```ts
const categoryMap = new Map(categories.map(c => [c.id, c]))
const getCategory = (id: string) => categoryMap.get(id)
```

### 7.3 Combine multiple array iterations
Replace chained `.filter().map()` with a single `.reduce()` or `flatMap()`.

```ts
// bad
const visible   = expenses.filter(e => e.visible)
const formatted = visible.map(e => formatExpense(e))

// good
const formatted = expenses.flatMap(e => e.visible ? [formatExpense(e)] : [])
```

### 7.4 Use `.toSorted()` for immutable sorting
Prefer `.toSorted()` over `.sort()` to avoid mutating the original array.

```ts
const sorted = expenses.toSorted((a, b) => b.date - a.date)
```

### 7.5 Use loop for min/max instead of sort
A single O(n) loop beats O(n log n) sort when you only need the extreme value.

```ts
const maxAmount = expenses.reduce((max, e) => Math.max(max, e.amount), 0)
```

### 7.6 Early return from functions
Return as soon as the result is determined.

```ts
function getExpenseStatus(expense: Expense) {
  if (!expense.amount) return 'empty'
  if (expense.amount > budget) return 'over'
  return 'ok'
}
```

### 7.7 Early length check for array comparisons
Check lengths before expensive deep equality or sort operations.

```ts
function expensesEqual(a: Expense[], b: Expense[]) {
  if (a.length !== b.length) return false
  return a.every((e, i) => e.id === b[i].id)
}
```

### 7.8 Hoist RegExp creation
Create regex patterns outside render to avoid allocating new instances on every call.

```ts
// bad — inside component
const re = new RegExp(query, 'i')

// good — memoized or module-level for static patterns
const AMOUNT_RE = /^\d+(\.\d{1,2})?$/
```

### 7.9 Cache repeated function calls
Use module-level Maps for memoizing pure functions called repeatedly with the same inputs.

```ts
const formatCache = new Map<number, string>()

function formatCurrency(amount: number) {
  if (formatCache.has(amount)) return formatCache.get(amount)!
  const result = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  formatCache.set(amount, result)
  return result
}
```

### 7.10 Defer non-critical work with `requestIdleCallback`
Schedule analytics, state persistence, and prefetching during browser idle time.

```ts
requestIdleCallback(() => {
  saveFiltersToStorage(filters)
})
```

### 7.11 Avoid layout thrashing
Batch all DOM writes before reads to prevent forced synchronous reflows.

```ts
// bad — interleaved read/write
element.style.height = '0'
const h = element.scrollHeight   // forces reflow
element.style.height = `${h}px`

// good — batch writes, then read once
requestAnimationFrame(() => {
  element.style.height = '0'
  requestAnimationFrame(() => {
    const h = element.scrollHeight
    element.style.height = `${h}px`
  })
})
```

---

## 8. Advanced Patterns — LOW

### 8.1 Initialize app-wide singletons once at module level
Run expensive initialization (DB connection, SDK setup) once, not on every component mount.

```ts
// lib/db.ts — initialized once when the module loads
import { MongoClient } from 'mongodb'

const client = new MongoClient(process.env.MONGODB_URI!)
export const db = client.db('expense-tracker')
```

### 8.2 Store event handlers in refs for stable references
Prevents dependency-array churn when handlers need to read latest state.

```ts
const handleKeyDown = useRef<(e: KeyboardEvent) => void>(() => {})
handleKeyDown.current = (e) => {
  if (e.key === 'Escape') closeModal()
}
useEffect(() => {
  const fn = (e: KeyboardEvent) => handleKeyDown.current(e)
  window.addEventListener('keydown', fn)
  return () => window.removeEventListener('keydown', fn)
}, [])
```

### 8.3 `useEffectEvent` for stable callback refs (React 19)
Use `useEffectEvent()` to create stable callbacks without adding them to dependency arrays.

```ts
import { useEffectEvent } from 'react'

const onMessage = useEffectEvent((msg: Message) => {
  setMessages(curr => [...curr, msg])
  if (soundEnabled) playSound()   // reads latest soundEnabled, no dep needed
})
```

### 8.4 Do not put effect event callbacks in dependency arrays
Effect event callbacks are stable by design — including them causes unnecessary re-runs.

```ts
useEffect(() => {
  socket.on('message', onMessage)   // stable ref — do not list in deps
  return () => socket.off('message', onMessage)
}, [socket])   // only real deps
```

---

## Quick Reference

| Priority | Category | Top Rules |
|---|---|---|
| CRITICAL | Waterfalls | `Promise.all()`, defer `await`, Suspense boundaries |
| CRITICAL | Bundle size | Direct imports, `optimizePackageImports`, `next/dynamic` |
| HIGH | Server perf | Auth in Server Actions, `React.cache()`, parallel RSC composition |
| MEDIUM-HIGH | Client data | SWR, passive listeners, deduplication |
| MEDIUM | Re-renders | Derived state in render, `startTransition`, functional `setState` |
| MEDIUM | Rendering | Ternary conditionals, `content-visibility`, resource hints |
| LOW-MEDIUM | JS perf | Set/Map O(1) lookups, `.toSorted()`, combine iterations |
| LOW | Advanced | Module-level init, handler refs, `useEffectEvent` |
