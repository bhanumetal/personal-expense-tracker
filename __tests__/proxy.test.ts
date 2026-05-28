import { describe, it, expect, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// The actual proxy export wraps the inner function with withAuth, which
// requires a real NextAuth runtime. Instead of fighting the NextAuth wrapper,
// we test the inner proxy *logic* by extracting and calling it directly.
//
// The two behaviours to test are:
//   1. Authenticated user on /login or /signup  → redirect to /
//   2. Any other path  → pass through (NextResponse.next())
//
// We also test the static `config.matcher` pattern to ensure it excludes the
// correct public routes.
// ---------------------------------------------------------------------------

// Mock next-auth/middleware so that withAuth is a passthrough — it just calls
// our inner function directly. This lets us test the inner logic without
// needing a real JWT verification stack.
vi.mock('next-auth/middleware', () => ({
  withAuth: (innerFn: (req: unknown) => unknown) => innerFn,
}))

// Import AFTER the mock is set up so the mock is active at module evaluation time.
import proxyDefault, { config } from '@/proxy'

// ---------------------------------------------------------------------------
// Helper: create a minimal request that satisfies the shape the inner
// proxy function expects.
// ---------------------------------------------------------------------------
type MockToken = Record<string, string> | null

function makeReq(url: string, token: MockToken) {
  const req = new NextRequest(url) as NextRequest & { nextauth: { token: MockToken } }
  req.nextauth = { token }
  return req
}

const ORIGIN = 'http://localhost:3000'

// Cast to the shape we need after bypassing withAuth
const proxy = proxyDefault as unknown as (
  req: NextRequest & { nextauth: { token: MockToken } }
) => NextResponse | undefined

// ---------------------------------------------------------------------------
// Inner proxy logic
// ---------------------------------------------------------------------------
describe('proxy — inner function logic', () => {
  describe('authenticated user on auth pages', () => {
    it('redirects to / when an authenticated user visits /login', () => {
      const req = makeReq(`${ORIGIN}/login`, { sub: 'user-id', id: 'user-id' })
      const res = proxy(req)

      expect(res?.status).toBe(307)
      const location = res?.headers.get('location')
      expect(location).toBe(`${ORIGIN}/`)
    })

    it('redirects to / when an authenticated user visits /signup', () => {
      const req = makeReq(`${ORIGIN}/signup`, { sub: 'user-id', id: 'user-id' })
      const res = proxy(req)

      expect(res?.status).toBe(307)
      const location = res?.headers.get('location')
      expect(location).toBe(`${ORIGIN}/`)
    })
  })

  describe('unauthenticated user on auth pages', () => {
    it('passes through (next()) when an unauthenticated user visits /login', () => {
      const req = makeReq(`${ORIGIN}/login`, null)
      const res = proxy(req)

      expect(res?.status).toBe(200)
      expect(res?.headers.get('location')).toBeNull()
    })

    it('passes through when an unauthenticated user visits /signup', () => {
      const req = makeReq(`${ORIGIN}/signup`, null)
      const res = proxy(req)

      expect(res?.status).toBe(200)
      expect(res?.headers.get('location')).toBeNull()
    })
  })

  describe('authenticated user on protected pages', () => {
    it('passes through for an authenticated user on an arbitrary protected path', () => {
      const req = makeReq(`${ORIGIN}/dashboard`, { sub: 'user-id', id: 'user-id' })
      const res = proxy(req)

      expect(res?.status).toBe(200)
      expect(res?.headers.get('location')).toBeNull()
    })

    it('passes through for an authenticated user on the root path', () => {
      const req = makeReq(`${ORIGIN}/`, { sub: 'user-id', id: 'user-id' })
      const res = proxy(req)

      expect(res?.status).toBe(200)
    })
  })
})

// ---------------------------------------------------------------------------
// Matcher pattern — ensures public routes are excluded from the proxy
// ---------------------------------------------------------------------------
describe('proxy config.matcher', () => {
  const matchers = config.matcher as string[]

  it('exports a matcher array', () => {
    expect(Array.isArray(matchers)).toBe(true)
    expect(matchers.length).toBeGreaterThan(0)
  })

  function matchesPath(pattern: string, path: string): boolean {
    const re = new RegExp(`^${pattern}$`)
    return re.test(path)
  }

  const pattern = matchers[0]

  it('does not match _next/static paths', () => {
    expect(matchesPath(pattern, '/_next/static/chunks/main.js')).toBe(false)
  })

  it('does not match _next/image paths', () => {
    expect(matchesPath(pattern, '/_next/image?url=foo')).toBe(false)
  })

  it('does not match favicon.ico', () => {
    expect(matchesPath(pattern, '/favicon.ico')).toBe(false)
  })

  it('does not match api/auth paths', () => {
    expect(matchesPath(pattern, '/api/auth/callback/credentials')).toBe(false)
  })

  it('does not match api/register', () => {
    expect(matchesPath(pattern, '/api/register')).toBe(false)
  })

  it('does not match /login', () => {
    expect(matchesPath(pattern, '/login')).toBe(false)
  })

  it('does not match /signup', () => {
    expect(matchesPath(pattern, '/signup')).toBe(false)
  })

  it('matches the root path /', () => {
    expect(matchesPath(pattern, '/')).toBe(true)
  })

  it('matches /dashboard', () => {
    expect(matchesPath(pattern, '/dashboard')).toBe(true)
  })

  it('matches an arbitrary protected route like /expenses/123', () => {
    expect(matchesPath(pattern, '/expenses/123')).toBe(true)
  })
})
