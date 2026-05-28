---
name: project-mock-patterns
description: Standard mock patterns used in this project's unit tests — server-only, DB, User model, bcrypt, next-auth/middleware
metadata:
  type: project
---

## Global mocks (setup.ts)

`server-only` is mocked globally because `lib/auth.ts` imports it and it throws outside the Next.js server runtime:
```ts
vi.mock('server-only', () => ({}))
```

Minimum env vars set globally:
```ts
process.env.MONGODB_URI = 'mongodb://localhost:27017/test'
process.env.NEXTAUTH_SECRET = 'test-secret-value-at-least-32-chars-long'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
```

## Per-file mocks

### lib/auth.test.ts and api/register.test.ts
```ts
vi.mock('@/lib/db', () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/models/User', () => ({ default: { findOne: vi.fn(), create: vi.fn() } }))
vi.mock('bcryptjs', () => ({ default: { compare: vi.fn(), hash: vi.fn() } }))
```

Use `vi.mocked(fn)` to get typed references. Always `vi.clearAllMocks()` in `beforeEach`.

### middleware.test.ts
```ts
vi.mock('next-auth/middleware', () => ({
  withAuth: (innerFn: (req: unknown) => unknown) => innerFn,
}))
```
This strips the `withAuth` wrapper so the inner middleware function is called directly. The test then augments `NextRequest` with `{ nextauth: { token } }` manually.

## CredentialsProvider authorize — how to extract it
```ts
const provider = authOptions.providers[0] as { options?: { authorize?: ... } }
const authorize = provider.options?.authorize
```
next-auth wraps the provider, so the function lives at `provider.options.authorize`, not `provider.authorize`.

## Register route — making test requests
Use `new NextRequest(url, { method, headers, body: JSON.stringify(payload) })` directly. No special test server needed.
