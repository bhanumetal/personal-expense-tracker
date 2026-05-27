# Security

This document defines the security rules for this project. These are not optional guidelines — they are hard requirements that apply to every file, every commit, and every deployment.

---

## The Non-Negotiables

These four rules have zero exceptions:

1. **Never hardcode a secret.** No API keys, connection strings, tokens, passwords, or signing secrets appear anywhere in source code — not in comments, not in test files, not in config objects.
2. **Never commit a `.env` file.** `.env`, `.env.local`, `.env.development.local`, and `.env.production.local` are never committed to Git.
3. **Never expose a secret to the client.** Secrets only exist in server-side code. A variable prefixed `NEXT_PUBLIC_` is inlined into the browser bundle at build time — never put a secret there.
4. **Never log sensitive data.** No passwords, tokens, full MongoDB documents, or session objects appear in `console.log`, error logs, or monitoring services.

---

## Environment Variables

### How Next.js loads them

Next.js loads `.env` files at startup in this priority order (first match wins):

```
process.env
.env.$(NODE_ENV).local     ← e.g. .env.production.local
.env.local                 ← not loaded in test environment
.env.$(NODE_ENV)           ← e.g. .env.development
.env
```

Variables loaded this way are available only on the server as `process.env.VARIABLE_NAME`.

### Server-only vs. public variables

| Prefix | Where available | Use for |
|---|---|---|
| No prefix | Server only (never sent to browser) | Secrets: DB URI, auth secret, API keys |
| `NEXT_PUBLIC_` | Inlined into browser bundle at build time | Non-secret public config only |

**`NEXT_PUBLIC_` variables are permanently public.** They are baked into the JavaScript bundle that every visitor downloads. Treat them as if they are published on the internet, because they are.

```bash
# CORRECT — secret stays on server
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
NEXTAUTH_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxx

# CORRECT — non-secret, safe to be public
NEXT_PUBLIC_APP_NAME=Spendly

# WRONG — never do this
NEXT_PUBLIC_MONGODB_URI=mongodb+srv://...     # exposed to every browser
NEXT_PUBLIC_NEXTAUTH_SECRET=xxxx             # invalidates your auth security
```

### Required variables for this project

```bash
# .env.local (never committed)
MONGODB_URI=           # MongoDB Atlas connection string
NEXTAUTH_SECRET=       # Random 32-byte string — generate: openssl rand -base64 32
NEXTAUTH_URL=          # http://localhost:3000 in dev; full URL in prod
```

Generate `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

### `.gitignore` — verify these lines exist

```
.env
.env.local
.env.*.local
```

Run this to confirm no `.env` file has ever been committed:

```bash
git log --all --full-history -- "**/.env*"
```

If any `.env` file appears in the output, its secrets are compromised and must be rotated immediately — even if the file was later deleted. Git history is permanent.

### Providing a safe reference file

Commit a `.env.example` file with all required variable names but no real values:

```bash
# .env.example — safe to commit, contains no secrets
MONGODB_URI=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
```

Every developer copies this to `.env.local` and fills in real values. The `.env.example` file is the only `.env` file that belongs in Git.

---

## Accessing Environment Variables in Code

Read `process.env` only in server-side files. Never read it in Client Components or files that could be imported by Client Components.

```ts
// lib/db.ts — server-only file, safe to read process.env
import 'server-only'

const uri = process.env.MONGODB_URI
if (!uri) throw new Error('MONGODB_URI is not set')
```

```tsx
// app/components/Header.tsx — Client Component
'use client'

// WRONG — leaks to browser bundle if MONGODB_URI is accidentally NEXT_PUBLIC_
const uri = process.env.NEXT_PUBLIC_MONGODB_URI

// CORRECT — only read public, non-secret config in client code
const appName = process.env.NEXT_PUBLIC_APP_NAME
```

### Fail fast on missing secrets

Validate required environment variables at startup, not lazily at the point of use. Put this in `lib/env.ts`:

```ts
// lib/env.ts
import 'server-only'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export const env = {
  mongodbUri:      requireEnv('MONGODB_URI'),
  nextauthSecret:  requireEnv('NEXTAUTH_SECRET'),
  nextauthUrl:     requireEnv('NEXTAUTH_URL'),
} as const
```

This surfaces misconfiguration immediately on startup rather than producing a cryptic runtime failure when the variable is first accessed.

---

## The `server-only` Package

Mark every module that handles secrets or database access with `import 'server-only'`. This causes a build-time error if the module is accidentally imported by a Client Component.

```ts
// lib/db.ts
import 'server-only'

// lib/auth.ts
import 'server-only'

// lib/schemas/expense.ts  ← Zod schemas: no secrets, no server-only needed
// app/components/ExpenseCard.tsx  ← Client Component: never import server-only modules
```

The build error message is explicit: "This module cannot be imported from a Client Component module. It should only be used from a Server Component."

---

## Secrets Must Never Touch Client Components

Server Components and Client Components run in isolated module systems. Server Components can access `process.env` and database connections. Client Components cannot — and must not.

```tsx
// WRONG — Server Component passes a secret-bearing object to a Client Component
export default async function Page() {
  const expense = await Expense.findById(id).lean()
  return <ExpenseCard expense={expense} />  // passes userId, __v, _id, all fields
}

// CORRECT — pass only the fields needed for rendering
export default async function Page() {
  const doc = await Expense.findById(id).lean()
  return (
    <ExpenseCard
      amount={doc.amount}
      label={doc.description}
      date={doc.date.toISOString()}
    />
  )
}
```

Never pass raw Mongoose documents across the Server/Client boundary. They contain internal fields (`__v`, the full `userId`, timestamps) that the client has no reason to receive.

---

## Authentication Security

This project uses NextAuth v4. The security properties it provides are:

| Property | How it works |
|---|---|
| Session cookie is `httpOnly` | JavaScript in the browser cannot read it |
| Session cookie is `Secure` | Set automatically in production — only sent over HTTPS |
| Session cookie is `SameSite=lax` | Blocks cross-site request forgery |
| CSRF token on `signIn`/`signOut` | NextAuth v4 generates and validates automatically |
| Password hashing | `bcryptjs` with cost factor 12 |

### Never trust the client for identity

The `userId` used in every database query must come from the server-side session — never from the request body, URL params, or query string.

```ts
// WRONG — trusting userId from the client
const { userId } = await req.json()
await Expense.find({ userId })  // any user can query any user's data

// CORRECT — userId comes from the verified session
const session = await getServerSession(authOptions)
if (!session) return new Response('Unauthorized', { status: 401 })
const userId = session.user.id
await Expense.find({ userId })
```

### Defense in depth

Middleware checks that a session exists on every protected route. This is not sufficient on its own. Every Server Action and Route Handler must also call `getServerSession` and verify ownership at the database level:

```
Middleware (session exists?) → Route Handler / Server Action (session valid? user owns resource?) → DB query (userId filter)
```

All three layers must be present. Removing any one of them creates a vulnerability.

---

## Server Actions Security

Next.js Server Actions are public POST endpoints. They cannot be hidden or restricted to specific UI flows. Treat every Server Action as if it can be called by anyone with a network connection.

```ts
// app/actions/expenses.ts
'use server'

export async function deleteExpense(expenseId: string) {
  // 1. Authentication: is a user signed in?
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  // 2. Authorization: does this user own this specific record?
  //    Use findOneAndDelete({ _id, userId }) — NOT findByIdAndDelete(id)
  const deleted = await Expense.findOneAndDelete({
    _id: expenseId,
    userId: session.user.id,  // ← ownership verified in the query itself
  })

  if (!deleted) throw new Error('Not found')
}
```

**Never do this:**

```ts
// WRONG — finds by ID alone; any authenticated user can delete any record
await Expense.findByIdAndDelete(expenseId)

// WRONG — fetch-then-check is chatty and race-condition prone
const expense = await Expense.findById(expenseId)
if (expense.userId.toString() !== userId) throw new Error('Forbidden')
await expense.deleteOne()
```

### Server Action return values

Only return what the UI needs. Do not return raw database documents.

```ts
// WRONG — returns the full Mongoose document, including internal fields
return await Expense.create({ ...data, userId })

// CORRECT — return only what the UI needs to update its state
await Expense.create({ ...data, userId })
return { success: true }
```

---

## Input Validation

All user input is validated with Zod before touching the database. See `docs/errors-and-validation.md` for the full pattern.

Key rules:
- Use `safeParse`, not `parse` — validation failures return values, not thrown exceptions
- Validate in Server Actions and Route Handlers even if client-side validation ran
- Never trust `searchParams`, URL params, or request bodies without parsing them through a schema

```ts
// URL params are strings — always validate before using as a DB ID
import { z } from 'zod'

const paramSchema = z.object({ id: z.string().min(1) })

const parsed = paramSchema.safeParse(params)
if (!parsed.success) notFound()
```

---

## Preventing Information Disclosure

### Error messages

Never return library error messages, stack traces, or database error details to the client. See `docs/errors-and-validation.md` for the full error handling pattern.

```ts
// WRONG — exposes Mongoose error details
} catch (error) {
  return NextResponse.json({ error: error.message }, { status: 500 })
}

// CORRECT — log internally, return generic message
} catch (error) {
  console.error('[createExpense]', error)
  return NextResponse.json({ error: 'Unable to save expense.' }, { status: 500 })
}
```

### Logging

Never log values that could contain secrets or PII:

```ts
// WRONG
console.log('Session:', session)           // contains token
console.log('User:', user)                 // contains email, name
console.log('Body:', await req.json())     // may contain password
console.log('Env:', process.env)           // contains all secrets

// CORRECT — log only non-sensitive identifiers
console.log('Creating expense for userId:', session.user.id)
console.error('[createExpense] error digest:', error.digest)
```

### HTTP responses

Route Handlers must not include internal field names, database schema details, or error context in 4xx/5xx responses:

```ts
// WRONG
return NextResponse.json({
  error: 'MongoServerError: E11000 duplicate key error collection: expense-tracker.users index: email_1',
}, { status: 409 })

// CORRECT
return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
```

---

## Content Security Policy

Add a Content Security Policy header in `proxy.ts` (or `next.config.ts` headers config) to restrict what scripts and resources the browser can load. This mitigates XSS attacks.

```ts
// proxy.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const response = NextResponse.next()

  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",   // tighten once nonces are set up
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join('; ')
  )

  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  return response
}
```

---

## Safe Deployment Practices

### Never hardcode environment-specific values

Every value that differs between development and production is an environment variable. This includes URLs, database names, and feature flags — not just secrets.

```ts
// WRONG
const dbName = 'expense-tracker-prod'   // hardcoded environment assumption

// CORRECT
const dbName = process.env.MONGODB_DB_NAME ?? 'expense-tracker'
```

### Setting secrets in production

Secrets are never stored in deployment scripts, CI/CD config files, or Dockerfiles. Use the secrets management system provided by your deployment platform:

| Platform | Where to set secrets |
|---|---|
| Vercel | Project → Settings → Environment Variables |
| Railway | Project → Variables |
| Render | Service → Environment |
| Docker / VPS | OS environment or a secrets manager |

Set `MONGODB_URI`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL` in the platform's secret store before the first deployment. Do not set these in `next.config.ts` or any committed file.

### `NEXTAUTH_URL` in production

Set this to the exact canonical URL of your production deployment, including protocol and no trailing slash:

```
NEXTAUTH_URL=https://spendly.yourdomain.com
```

Incorrect values cause broken redirects after sign-in.

### `NEXTAUTH_SECRET` rotation

When rotating the secret:
1. Generate a new value: `openssl rand -base64 32`
2. Set the new value in the platform secrets store
3. Redeploy — all active sessions will be invalidated (users must sign in again)
4. Confirm the old value is removed from all environments

### Multi-instance deployments

If running multiple Next.js instances (containers, edge replicas), set `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` so all instances share the same Server Action encryption key. Without this, Server Action calls routed to a different instance than the one that rendered the page will fail.

```bash
# Generate a 32-byte base64 key
openssl rand -base64 32
```

```bash
# .env.production (via platform secrets — never committed)
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=<generated value>
```

---

## Dependency Security

### Keep dependencies updated

Outdated dependencies are the most common source of known vulnerabilities.

```bash
# Check for vulnerabilities
npm audit

# Fix automatically where possible
npm audit fix

# Check for outdated packages
npm outdated
```

Run `npm audit` before every production deployment and address any high or critical findings.

### Do not install unvetted packages

Before installing a new package:
- Check the npm page for weekly downloads, last publish date, and maintainer count
- Review the package on GitHub for open issues and recent activity
- Check `npm audit` immediately after installing

Avoid packages with no recent activity, a single maintainer, or very low download counts for security-sensitive operations (auth, crypto, HTTP).

---

## Git Hygiene

### Pre-commit checklist

Before committing any file, verify:

- [ ] No `process.env.NEXTAUTH_SECRET`, connection strings, or tokens appear in the diff
- [ ] No `.env` files are staged
- [ ] No `console.log` statements that print request bodies, session objects, or user data

### If a secret is accidentally committed

1. **Do not just delete the file in a new commit.** The secret is in Git history.
2. Rotate the secret immediately — assume it is compromised.
3. Remove it from history using `git filter-repo` or contact your Git hosting provider.
4. Force-push the cleaned history and notify all collaborators to re-clone.

```bash
# Install git-filter-repo (pip install git-filter-repo)
git filter-repo --path .env --invert-paths

# Then force-push all branches
git push origin --force --all
```

Never use `git rebase` or `git commit --amend` alone — they do not remove the secret from all refs.

---

## Security Audit Checklist

Run through this list before any production deployment.

### Environment variables
- [ ] `.env.local` is in `.gitignore` and has never been committed
- [ ] `.env.example` is committed with empty values only
- [ ] `NEXTAUTH_SECRET` is a randomly generated 32+ byte value set in the platform
- [ ] `MONGODB_URI` is set in the platform, not in any committed file
- [ ] No `NEXT_PUBLIC_` variable contains a secret

### Authentication and authorization
- [ ] Every Server Action calls `getServerSession` before doing any work
- [ ] Every Route Handler calls `getServerSession` before doing any work
- [ ] `userId` is read from session, never from request body or params
- [ ] Mongoose mutations use `findOneAndUpdate({ _id, userId })` — not `findByIdAndUpdate`
- [ ] Mongoose deletes use `findOneAndDelete({ _id, userId })` — not `findByIdAndDelete`

### Data exposure
- [ ] No raw Mongoose documents are passed as props to Client Components
- [ ] Server Action return values include only what the UI needs
- [ ] No `error.message` from caught exceptions is returned to clients
- [ ] No stack traces or internal identifiers appear in HTTP responses
- [ ] No sensitive fields appear in `console.log` calls

### Code
- [ ] All modules that access `process.env` or the database have `import 'server-only'`
- [ ] No secrets exist as string literals anywhere in the codebase (`grep -r "mongodb+srv" .`)
- [ ] `npm audit` returns zero high or critical vulnerabilities
