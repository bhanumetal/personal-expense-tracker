# Routing — Next.js App Router

This document defines the routing conventions, folder structure, and route-protection model for this project. All routing uses the **App Router** (`app/` directory). The Pages Router is not used.

---

## How Routes Are Defined

A **folder** creates a URL segment. A route is only publicly accessible when a `page.tsx` (or `route.ts`) file exists inside that folder. Folders without those files are non-routable — safe for colocating components, hooks, and utilities.

```
app/
  dashboard/             → /dashboard   (only if page.tsx exists)
    _components/         → not routable (private folder)
    expenses/            → /dashboard/expenses
      [id]/              → /dashboard/expenses/:id
        page.tsx         ← makes the route public
```

---

## Special Files

Every route segment can contain any combination of these reserved filenames:

| File | Purpose |
|---|---|
| `page.tsx` | The page UI. Required to make the segment publicly accessible. |
| `layout.tsx` | Persistent shell wrapping child segments. Does not remount on navigation. |
| `loading.tsx` | Suspense boundary skeleton shown while the page streams in. |
| `error.tsx` | React error boundary for the segment and its children. Must be a Client Component (`"use client"`). |
| `not-found.tsx` | Rendered when `notFound()` is called inside the segment. |
| `route.ts` | API route handler. Exports named HTTP verb functions (`GET`, `POST`, etc.). Cannot coexist with `page.tsx` in the same folder. |
| `template.tsx` | Like `layout`, but remounts on every navigation. Use only when fresh mount behavior is required. |
| `default.tsx` | Fallback UI for a parallel route slot when no active match exists. |

**Component render order within a segment:**

```
layout → template → error boundary → loading (Suspense) → not-found → page
```

---

## Folder Naming Conventions

### Static segments
Use lowercase kebab-case named after the resource or feature.

```
app/
  dashboard/
  expenses/
  categories/
  reports/
  settings/
```

### Dynamic segments — `[param]`
Square brackets create a named URL parameter accessible via `params.param`.

```
app/dashboard/expenses/[id]/page.tsx     → /dashboard/expenses/abc123
```

```tsx
// app/dashboard/expenses/[id]/page.tsx
export default async function ExpensePage({ params }: { params: { id: string } }) {
  const expense = await getExpense(params.id)
  // ...
}
```

### Catch-all segments — `[...param]`
Matches one or more path segments.

```
app/dashboard/reports/[...slug]/page.tsx  → /dashboard/reports/2024/january
```

### Optional catch-all — `[[...param]]`
Matches zero or more segments (including the segment itself).

```
app/dashboard/[[...filters]]/page.tsx     → /dashboard  and  /dashboard/category/food
```

### Route groups — `(group)`
Parentheses wrap a folder for organizational purposes only. The name is **excluded from the URL**.

Use route groups to:
- Share a layout among a subset of routes without changing URLs
- Create separate root layouts for distinct sections (e.g., auth pages vs. app pages)

```
app/
  (auth)/                ← group — not in URL
    login/
      page.tsx           → /login
    signup/
      page.tsx           → /signup
  (app)/                 ← group — not in URL
    layout.tsx           ← shared authenticated shell
    dashboard/
      page.tsx           → /dashboard
    expenses/
      page.tsx           → /expenses
```

### Private folders — `_folder`
Prefix with underscore to exclude from routing entirely. Use for colocated components, utilities, and hooks that belong to a specific route but are not pages.

```
app/dashboard/
  _components/
    ExpenseTable.tsx     ← not routable
    BudgetCard.tsx       ← not routable
  _lib/
    queries.ts           ← not routable
  page.tsx               → /dashboard
```

---

## Route Structure for This Project

```
app/
  layout.tsx                          ← root layout (fonts, global providers)
  (auth)/
    login/
      page.tsx                        → /login          PUBLIC
    signup/
      page.tsx                        → /signup         PUBLIC
  (app)/
    layout.tsx                        ← authenticated shell (nav, sidebar)
    dashboard/
      page.tsx                        → /dashboard      PROTECTED
      loading.tsx
    expenses/
      page.tsx                        → /expenses       PROTECTED
      loading.tsx
      [id]/
        page.tsx                      → /expenses/:id   PROTECTED
        error.tsx
    categories/
      page.tsx                        → /categories     PROTECTED
    reports/
      page.tsx                        → /reports        PROTECTED
    settings/
      page.tsx                        → /settings       PROTECTED
  api/
    auth/
      [...nextauth]/
        route.ts                      → /api/auth/*     PUBLIC (NextAuth)
    register/
      route.ts                        → /api/register   PUBLIC (POST only)
    expenses/
      route.ts                        → /api/expenses   PROTECTED
      [id]/
        route.ts                      → /api/expenses/:id  PROTECTED
    categories/
      route.ts                        → /api/categories PROTECTED
```

**Rule:** Every route under `(app)/` is protected. Every route under `(auth)/` and every `api/auth/*` and `api/register` path is public.

---

## Route Protection via Proxy

Route protection is enforced in `proxy.ts` using NextAuth's `withAuth` helper. It runs at the edge before any page or API handler.

```ts
// proxy.ts
import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function proxy(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Redirect authenticated users away from auth pages
    if (token && (pathname === "/login" || pathname === "/signup")) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized({ token }) {
        return !!token   // false → NextAuth redirects to /login
      },
    },
    pages: {
      signIn: "/login",
    },
  }
)

export const config = {
  matcher: [
    // Run on every path except Next.js internals, static files, and public API routes
    "/((?!_next/static|_next/image|favicon.ico|api/auth|api/register|login|signup).*)",
  ],
}
```

**How the matcher works:**

| Path | Middleware runs? | Outcome |
|---|---|---|
| `/dashboard` | Yes | Requires valid JWT token |
| `/expenses/abc` | Yes | Requires valid JWT token |
| `/login` | Yes | Redirects to `/dashboard` if already logged in |
| `/signup` | Yes | Redirects to `/dashboard` if already logged in |
| `/api/auth/session` | No | NextAuth handles it directly |
| `/api/register` | No | Public endpoint |
| `/_next/static/**` | No | Static asset, bypass |

**Critical:** Middleware is a first line of defense, not the only line. Every Server Component, Server Action, and Route Handler that reads or mutates user data must also call `getServerSession(authOptions)` and check ownership. See `docs/auth.md` for the full pattern.

---

## Layouts and Nested Layouts

### Root layout — `app/layout.tsx`
Wraps every page. Sets `<html>` and `<body>`. Applies global fonts and CSS. Must not contain any auth logic.

### Authenticated shell — `app/(app)/layout.tsx`
Wraps all protected pages. A good place for:
- Navigation / sidebar components
- Session provider (`SessionProvider` for Client Components that need session)
- Global error boundaries

```tsx
// app/(app)/layout.tsx
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")   // defense in depth — proxy should have caught this

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
```

### Auth layout — `app/(auth)/layout.tsx`
Optional. Provides a centered card shell for login and signup pages without the app navigation.

---

## API Route Handlers

Route handlers live in `app/api/**/route.ts`. Export named functions matching HTTP verbs.

```ts
// app/api/expenses/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return new Response("Unauthorized", { status: 401 })

  const userId = session.user.id
  const expenses = await Expense.find({ userId }).sort({ date: -1 })
  return NextResponse.json(expenses)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return new Response("Unauthorized", { status: 401 })

  const userId = session.user.id
  const body = await req.json()
  const expense = await Expense.create({ ...body, userId })
  return NextResponse.json(expense, { status: 201 })
}
```

**Rules for route handlers:**
- Always call `getServerSession` at the top — even on protected paths where proxy ran
- Never accept `userId` from the request body or URL params
- Return `401` if session is null; return `403` if session exists but user does not own the resource
- Use `findOneAndUpdate({ _id, userId })` / `findOneAndDelete({ _id, userId })` for mutations

---

## Navigation

### Server Components — `redirect()`
For programmatic navigation inside Server Components, Server Actions, and Route Handlers.

```ts
import { redirect } from "next/navigation"

redirect("/login")           // issues a 307 (temporary) by default
redirect("/login", "replace") // replaces history entry
```

### Client Components — `useRouter()`
For programmatic navigation inside Client Components.

```tsx
"use client"
import { useRouter } from "next/navigation"

const router = useRouter()
router.push("/dashboard")
router.replace("/dashboard")
router.back()
```

### Declarative links — `<Link>`
Prefer `<Link>` over `<a>` for all internal navigation. Next.js prefetches linked routes automatically.

```tsx
import Link from "next/link"

<Link href="/dashboard/expenses">View Expenses</Link>
<Link href={`/dashboard/expenses/${id}`}>Edit</Link>
```

---

## Loading and Streaming

Place `loading.tsx` alongside any `page.tsx` that fetches data. Next.js wraps the page in a `<Suspense>` boundary automatically — the shell renders immediately while the page streams in.

```
app/dashboard/
  loading.tsx    ← shown instantly
  page.tsx       ← streams in asynchronously
```

For finer-grained streaming, wrap individual data-fetching components in explicit `<Suspense>` boundaries inside the page:

```tsx
// app/dashboard/page.tsx
import { Suspense } from "react"

export default function DashboardPage() {
  return (
    <div>
      <Suspense fallback={<BudgetSkeleton />}>
        <BudgetSummary />
      </Suspense>
      <Suspense fallback={<ExpensesSkeleton />}>
        <RecentExpenses />
      </Suspense>
    </div>
  )
}
```

---

## Error Handling

`error.tsx` must be a Client Component. It receives `error` and `reset` props.

```tsx
// app/dashboard/expenses/error.tsx
"use client"

export default function ExpenseError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div>
      <p>Failed to load expenses.</p>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

For errors that escape all segment boundaries, add `app/global-error.tsx`. It must include its own `<html>` and `<body>` tags since the root layout is bypassed.

---

## Parallel Routes

Use `@slot` folders for layouts that render multiple independent panels simultaneously (e.g., a sidebar and a main area that load data independently).

```
app/(app)/
  layout.tsx          ← renders {children} and {@analytics}
  @analytics/
    page.tsx
  dashboard/
    page.tsx
```

```tsx
// app/(app)/layout.tsx
export default function AppLayout({
  children,
  analytics,
}: {
  children: React.ReactNode
  analytics: React.ReactNode
}) {
  return (
    <div className="flex">
      <main>{children}</main>
      <aside>{analytics}</aside>
    </div>
  )
}
```

---

## Intercepting Routes

Use intercepting routes to render a route inside the current layout — the most common use case is showing a detail view as a modal while keeping the list page visible in the background.

```
app/(app)/expenses/
  page.tsx                      → /expenses (list)
  [id]/
    page.tsx                    → /expenses/:id (full page, accessed directly)
  (.)expenses/[id]/
    page.tsx                    → renders /expenses/:id as a modal over /expenses
```

Convention:

| Pattern | Intercepts |
|---|---|
| `(.)segment` | Same level |
| `(..)segment` | One level up |
| `(..)(..)segment` | Two levels up |
| `(...)segment` | From the root |

---

## Naming Rules Summary

| What | Convention | Example |
|---|---|---|
| Route folders | `lowercase-kebab-case` | `monthly-summary/` |
| Dynamic param | `[param]` — singular noun | `[id]/`, `[slug]/` |
| Catch-all | `[...param]` | `[...filters]/` |
| Route group | `(lowercase)` | `(auth)/`, `(app)/` |
| Private folder | `_folderName` | `_components/`, `_lib/` |
| Parallel slot | `@slotName` | `@modal/`, `@sidebar/` |
| Special files | lowercase, `.tsx` | `page.tsx`, `layout.tsx` |
| Route handlers | `route.ts` | `app/api/expenses/route.ts` |
