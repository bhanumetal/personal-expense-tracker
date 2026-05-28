import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Mock all I/O dependencies before importing the route handler.
// ---------------------------------------------------------------------------

vi.mock('@/lib/db', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/models/User', () => ({
  default: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
}))

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
  },
}))

import { POST } from '@/app/api/register/route'
import { connectDB } from '@/lib/db'
import UserModel from '@/lib/models/User'
import bcrypt from 'bcryptjs'

const mockConnectDB = vi.mocked(connectDB)
const mockFindOne = vi.mocked(UserModel.findOne)
const mockCreate = vi.mocked(UserModel.create)
const mockBcryptHash = vi.mocked(bcrypt.hash)

// ---------------------------------------------------------------------------
// Helper to create a NextRequest with a JSON body
// ---------------------------------------------------------------------------
function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeMalformedRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'this is not json{{{',
  })
}

const validBody = {
  name: 'Alice Smith',
  email: 'alice@example.com',
  password: 'securePass1',
  confirmPassword: 'securePass1',
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('POST /api/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: no existing user
    mockFindOne.mockResolvedValue(null)
    mockCreate.mockResolvedValue({} as never)
    mockBcryptHash.mockResolvedValue('hashed-password' as never)
  })

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------
  describe('happy path — valid new user', () => {
    it('returns 201 with a success message', async () => {
      const res = await POST(makeRequest(validBody))
      expect(res.status).toBe(201)
      const json = await res.json()
      expect(json.message).toBe('Account created')
    })

    it('calls connectDB before any database operation', async () => {
      await POST(makeRequest(validBody))
      expect(mockConnectDB).toHaveBeenCalledOnce()
    })

    it('checks for a duplicate email before creating', async () => {
      await POST(makeRequest(validBody))
      expect(mockFindOne).toHaveBeenCalledWith({ email: 'alice@example.com' })
    })

    it('hashes the password with cost factor 12', async () => {
      await POST(makeRequest(validBody))
      expect(mockBcryptHash).toHaveBeenCalledWith('securePass1', 12)
    })

    it('creates the user with name, email, and hashed password', async () => {
      mockBcryptHash.mockResolvedValue('stored-hash' as never)
      await POST(makeRequest(validBody))
      expect(mockCreate).toHaveBeenCalledWith({
        name: 'Alice Smith',
        email: 'alice@example.com',
        passwordHash: 'stored-hash',
      })
    })

    it('does not expose the password hash in the response body', async () => {
      const res = await POST(makeRequest(validBody))
      const text = await res.text()
      expect(text).not.toContain('hashed-password')
      expect(text).not.toContain('passwordHash')
    })
  })

  // -------------------------------------------------------------------------
  // Malformed / unparseable request body
  // -------------------------------------------------------------------------
  describe('malformed request body', () => {
    it('returns 400 when the body is not valid JSON', async () => {
      const res = await POST(makeMalformedRequest())
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toBe('Invalid request body')
    })

    it('does not touch the database when the body cannot be parsed', async () => {
      await POST(makeMalformedRequest())
      expect(mockConnectDB).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // Zod validation failures — 422
  // -------------------------------------------------------------------------
  describe('validation failures — 422', () => {
    it('returns 422 when name is missing', async () => {
      const { name: _n, ...rest } = validBody
      const res = await POST(makeRequest(rest))
      expect(res.status).toBe(422)
    })

    it('returns 422 when name is too short (< 2 chars)', async () => {
      const res = await POST(makeRequest({ ...validBody, name: 'A' }))
      expect(res.status).toBe(422)
      const json = await res.json()
      expect(json.error).toBe('Validation failed')
      expect(json.fields.name).toBeDefined()
    })

    it('returns 422 when name exceeds 100 characters', async () => {
      const res = await POST(makeRequest({ ...validBody, name: 'A'.repeat(101) }))
      expect(res.status).toBe(422)
      const json = await res.json()
      expect(json.fields.name).toBeDefined()
    })

    it('returns 422 when email is missing', async () => {
      const { email: _e, ...rest } = validBody
      const res = await POST(makeRequest(rest))
      expect(res.status).toBe(422)
    })

    it('returns 422 when email is not a valid address', async () => {
      const res = await POST(makeRequest({ ...validBody, email: 'not-an-email' }))
      expect(res.status).toBe(422)
      const json = await res.json()
      expect(json.fields.email).toBeDefined()
    })

    it('returns 422 when password is fewer than 8 characters', async () => {
      const res = await POST(makeRequest({ ...validBody, password: 'short', confirmPassword: 'short' }))
      expect(res.status).toBe(422)
      const json = await res.json()
      expect(json.fields.password).toBeDefined()
    })

    it('returns 422 when passwords do not match', async () => {
      const res = await POST(makeRequest({ ...validBody, confirmPassword: 'different' }))
      expect(res.status).toBe(422)
      const json = await res.json()
      expect(json.fields.confirmPassword).toBeDefined()
    })

    it('returns the fieldErrors structure for validation failures', async () => {
      const res = await POST(makeRequest({ ...validBody, name: 'X' }))
      const json = await res.json()
      expect(json).toMatchObject({ error: 'Validation failed', fields: expect.any(Object) })
    })

    it('does not call connectDB when validation fails', async () => {
      await POST(makeRequest({ ...validBody, email: 'invalid' }))
      expect(mockConnectDB).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // Duplicate email — 409
  // -------------------------------------------------------------------------
  describe('duplicate email — 409', () => {
    it('returns 409 when the email is already registered', async () => {
      mockFindOne.mockResolvedValue({ _id: 'existing-id', email: 'alice@example.com' } as never)

      const res = await POST(makeRequest(validBody))

      expect(res.status).toBe(409)
      const json = await res.json()
      expect(json.error).toBe('An account with this email already exists.')
    })

    it('does not hash or create when a duplicate email is found', async () => {
      mockFindOne.mockResolvedValue({ _id: 'existing-id', email: 'alice@example.com' } as never)

      await POST(makeRequest(validBody))

      expect(mockBcryptHash).not.toHaveBeenCalled()
      expect(mockCreate).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // Database / unexpected error — 500
  // -------------------------------------------------------------------------
  describe('unexpected database error — 500', () => {
    it('returns 500 when connectDB throws', async () => {
      mockConnectDB.mockRejectedValueOnce(new Error('DB connection failed'))

      const res = await POST(makeRequest(validBody))

      expect(res.status).toBe(500)
      const json = await res.json()
      expect(json.error).toBe('Unable to create account. Please try again.')
    })

    it('returns 500 when User.findOne throws', async () => {
      mockFindOne.mockRejectedValueOnce(new Error('DB query failed'))

      const res = await POST(makeRequest(validBody))

      expect(res.status).toBe(500)
      const json = await res.json()
      expect(json.error).toBe('Unable to create account. Please try again.')
    })

    it('returns 500 when User.create throws', async () => {
      mockCreate.mockRejectedValueOnce(new Error('DB write failed'))

      const res = await POST(makeRequest(validBody))

      expect(res.status).toBe(500)
    })

    it('does not leak internal error details in the 500 response', async () => {
      mockCreate.mockRejectedValueOnce(new Error('Internal details you should not see'))

      const res = await POST(makeRequest(validBody))
      const json = await res.json()

      expect(json.error).not.toContain('Internal details')
      expect(json.error).not.toContain('DB')
    })
  })
})
