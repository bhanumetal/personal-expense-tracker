import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock external dependencies before importing the module under test.
// ---------------------------------------------------------------------------

// 'server-only' is already mocked globally in setup.ts.
// We need to mock the modules that lib/auth.ts imports so the tests are
// fully isolated from the database and bcrypt I/O.

vi.mock('@/lib/db', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/models/User', () => ({
  default: {
    findOne: vi.fn(),
  },
}))

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
  },
}))

// Now import the module under test and its mocked dependencies.
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import UserModel from '@/lib/models/User'
import bcrypt from 'bcryptjs'
import type { Session } from 'next-auth'
import type { JWT } from 'next-auth/jwt'

// Typed references to the mocked functions for easier assertion.
const mockConnectDB = vi.mocked(connectDB)
const mockFindOne = vi.mocked(UserModel.findOne)
const mockBcryptCompare = vi.mocked(bcrypt.compare)

// ---------------------------------------------------------------------------
// Helpers to reach into authOptions
// ---------------------------------------------------------------------------

// The CredentialsProvider's authorize function
function getAuthorize() {
  const provider = authOptions.providers[0] as {
    options?: { authorize?: (credentials: Record<string, string> | undefined) => Promise<unknown> }
    authorize?: (credentials: Record<string, string> | undefined) => Promise<unknown>
  }
  // next-auth wraps the provider, we need the authorize from the options
  if (provider.options?.authorize) return provider.options.authorize
  if (provider.authorize) return provider.authorize
  throw new Error('authorize function not found on CredentialsProvider')
}

function getJwtCallback() {
  const cb = authOptions.callbacks?.jwt
  if (!cb) throw new Error('jwt callback not defined')
  return cb
}

function getSessionCallback() {
  const cb = authOptions.callbacks?.session
  if (!cb) throw new Error('session callback not defined')
  return cb
}

// ---------------------------------------------------------------------------
// CredentialsProvider — authorize
// ---------------------------------------------------------------------------
describe('authOptions.providers[0] — authorize', () => {
  const authorize = getAuthorize()

  const validCredentials = {
    email: 'user@example.com',
    password: 'correct-password',
  }

  const fakeUser = {
    _id: { toString: () => 'user-object-id-123' },
    name: 'Test User',
    email: 'user@example.com',
    passwordHash: 'hashed-password',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('happy path', () => {
    it('returns the user object when credentials are valid', async () => {
      mockFindOne.mockReturnValueOnce({ lean: () => Promise.resolve(fakeUser) } as never)
      mockBcryptCompare.mockResolvedValueOnce(true as never)

      const result = await authorize(validCredentials)

      expect(result).toEqual({
        id: 'user-object-id-123',
        name: 'Test User',
        email: 'user@example.com',
      })
    })

    it('calls connectDB before querying the database', async () => {
      mockFindOne.mockReturnValueOnce({ lean: () => Promise.resolve(fakeUser) } as never)
      mockBcryptCompare.mockResolvedValueOnce(true as never)

      await authorize(validCredentials)

      expect(mockConnectDB).toHaveBeenCalledOnce()
    })

    it('queries the database by email', async () => {
      mockFindOne.mockReturnValueOnce({ lean: () => Promise.resolve(fakeUser) } as never)
      mockBcryptCompare.mockResolvedValueOnce(true as never)

      await authorize(validCredentials)

      expect(mockFindOne).toHaveBeenCalledWith({ email: 'user@example.com' })
    })

    it('compares the submitted password against the stored passwordHash', async () => {
      mockFindOne.mockReturnValueOnce({ lean: () => Promise.resolve(fakeUser) } as never)
      mockBcryptCompare.mockResolvedValueOnce(true as never)

      await authorize(validCredentials)

      expect(mockBcryptCompare).toHaveBeenCalledWith('correct-password', 'hashed-password')
    })
  })

  describe('missing credentials', () => {
    it('returns null when credentials are undefined', async () => {
      const result = await authorize(undefined)
      expect(result).toBeNull()
      expect(mockConnectDB).not.toHaveBeenCalled()
    })

    it('returns null when email is missing from credentials', async () => {
      const result = await authorize({ password: 'secret' })
      expect(result).toBeNull()
      expect(mockConnectDB).not.toHaveBeenCalled()
    })

    it('returns null when password is missing from credentials', async () => {
      const result = await authorize({ email: 'user@example.com' })
      expect(result).toBeNull()
      expect(mockConnectDB).not.toHaveBeenCalled()
    })

    it('returns null when both email and password are empty strings', async () => {
      const result = await authorize({ email: '', password: '' })
      expect(result).toBeNull()
      expect(mockConnectDB).not.toHaveBeenCalled()
    })
  })

  describe('user not found', () => {
    it('returns null when no user exists for the given email', async () => {
      mockFindOne.mockReturnValueOnce({ lean: () => Promise.resolve(null) } as never)

      const result = await authorize(validCredentials)

      expect(result).toBeNull()
      expect(mockBcryptCompare).not.toHaveBeenCalled()
    })
  })

  describe('wrong password', () => {
    it('returns null when bcrypt.compare returns false', async () => {
      mockFindOne.mockReturnValueOnce({ lean: () => Promise.resolve(fakeUser) } as never)
      mockBcryptCompare.mockResolvedValueOnce(false as never)

      const result = await authorize(validCredentials)

      expect(result).toBeNull()
    })
  })
})

// ---------------------------------------------------------------------------
// jwt callback
// ---------------------------------------------------------------------------
describe('authOptions.callbacks.jwt', () => {
  const jwtCallback = getJwtCallback()

  it('adds user.id to the token on first sign-in (when user is present)', async () => {
    const token: JWT = { sub: 'sub-value', iat: 0, exp: 0, jti: 'jti' }
    const user = { id: 'user-object-id-123', name: 'Test User', email: 'user@example.com' }

    const result = await jwtCallback({ token, user, account: null, trigger: 'signIn' })

    expect(result.id).toBe('user-object-id-123')
  })

  it('passes the token through unchanged on subsequent requests (no user)', async () => {
    const token: JWT = { sub: 'sub-value', id: 'existing-id', iat: 0, exp: 0, jti: 'jti' }

    const result = await jwtCallback({ token, account: null, trigger: 'update' })

    expect(result).toEqual(token)
    expect(result.id).toBe('existing-id')
  })

  it('does not overwrite an existing token.id when user is absent', async () => {
    const token: JWT = { sub: 'sub', id: 'pre-existing-id', iat: 0, exp: 0, jti: 'jti' }

    const result = await jwtCallback({ token, account: null, trigger: 'update' })

    expect(result.id).toBe('pre-existing-id')
  })
})

// ---------------------------------------------------------------------------
// session callback
// ---------------------------------------------------------------------------
describe('authOptions.callbacks.session', () => {
  const sessionCallback = getSessionCallback()

  function makeSession(overrides: Partial<Session['user']> = {}): Session {
    return {
      expires: '2099-01-01',
      user: { name: 'Test User', email: 'test@example.com', ...overrides },
    }
  }

  it('copies token.id onto session.user.id', async () => {
    const session = makeSession()
    const token: JWT = { sub: 'sub', id: 'user-object-id-123', iat: 0, exp: 0, jti: 'jti' }

    const result = await sessionCallback({ session, token, user: {} as never, newSession: null, trigger: 'update' })

    expect(result.user.id).toBe('user-object-id-123')
  })

  it('does not set session.user.id when token.id is absent', async () => {
    const session = makeSession()
    // Cast to satisfy types while simulating a token without id
    const token = { sub: 'sub', iat: 0, exp: 0, jti: 'jti' } as JWT

    const result = await sessionCallback({ session, token, user: {} as never, newSession: null, trigger: 'update' })

    expect(result.user.id).toBeUndefined()
  })

  it('returns the session object (not a new object, preserving reference equality on mutated fields)', async () => {
    const session = makeSession()
    const token: JWT = { sub: 'sub', id: 'some-id', iat: 0, exp: 0, jti: 'jti' }

    const result = await sessionCallback({ session, token, user: {} as never, newSession: null, trigger: 'update' })

    // The callback mutates and returns the same session object
    expect(result).toBe(session)
  })
})

// ---------------------------------------------------------------------------
// Static config properties
// ---------------------------------------------------------------------------
describe('authOptions static config', () => {
  it('uses jwt session strategy', () => {
    expect(authOptions.session?.strategy).toBe('jwt')
  })

  it('sets the signIn page to /login', () => {
    expect(authOptions.pages?.signIn).toBe('/login')
  })

  it('has exactly one provider', () => {
    expect(authOptions.providers).toHaveLength(1)
  })
})
