import { describe, it, expect } from 'vitest'
import { loginSchema, registerSchema } from '@/lib/schemas/auth'

// ---------------------------------------------------------------------------
// loginSchema
// ---------------------------------------------------------------------------
describe('loginSchema', () => {
  describe('happy path', () => {
    it('accepts a valid email and password', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'secret',
      })
      expect(result.success).toBe(true)
    })

    it('trims nothing — returns exactly what is parsed', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'p',
      })
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.data.email).toBe('user@example.com')
      expect(result.data.password).toBe('p')
    })
  })

  describe('email validation', () => {
    it('rejects a missing email field', () => {
      const result = loginSchema.safeParse({ password: 'secret' })
      expect(result.success).toBe(false)
      if (result.success) return
      const issues = result.error.flatten().fieldErrors
      expect(issues.email).toBeDefined()
    })

    it('rejects an email that is not a valid address', () => {
      const result = loginSchema.safeParse({ email: 'not-an-email', password: 'secret' })
      expect(result.success).toBe(false)
      if (result.success) return
      const issues = result.error.flatten().fieldErrors
      expect(issues.email?.[0]).toBe('Enter a valid email address')
    })

    it('rejects an empty email string', () => {
      const result = loginSchema.safeParse({ email: '', password: 'secret' })
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.error.flatten().fieldErrors.email).toBeDefined()
    })
  })

  describe('password validation', () => {
    it('rejects a missing password field', () => {
      const result = loginSchema.safeParse({ email: 'user@example.com' })
      expect(result.success).toBe(false)
      if (result.success) return
      const issues = result.error.flatten().fieldErrors
      expect(issues.password).toBeDefined()
    })

    it('rejects an empty password string', () => {
      const result = loginSchema.safeParse({ email: 'user@example.com', password: '' })
      expect(result.success).toBe(false)
      if (result.success) return
      const issues = result.error.flatten().fieldErrors
      expect(issues.password?.[0]).toBe('Password is required')
    })

    it('accepts a single-character password (min is 1)', () => {
      const result = loginSchema.safeParse({ email: 'user@example.com', password: 'x' })
      expect(result.success).toBe(true)
    })
  })

  describe('combined failures', () => {
    it('reports both field errors when both are invalid', () => {
      const result = loginSchema.safeParse({ email: 'bad', password: '' })
      expect(result.success).toBe(false)
      if (result.success) return
      const issues = result.error.flatten().fieldErrors
      expect(issues.email).toBeDefined()
      expect(issues.password).toBeDefined()
    })
  })
})

// ---------------------------------------------------------------------------
// registerSchema
// ---------------------------------------------------------------------------
describe('registerSchema', () => {
  const validPayload = {
    name: 'Alice Smith',
    email: 'alice@example.com',
    password: 'securePass1',
    confirmPassword: 'securePass1',
  }

  describe('happy path', () => {
    it('accepts a fully valid registration payload', () => {
      const result = registerSchema.safeParse(validPayload)
      expect(result.success).toBe(true)
    })

    it('returns the parsed data on success', () => {
      const result = registerSchema.safeParse(validPayload)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.data.name).toBe('Alice Smith')
      expect(result.data.email).toBe('alice@example.com')
    })

    it('accepts a name that is exactly 2 characters (boundary min)', () => {
      const result = registerSchema.safeParse({ ...validPayload, name: 'Jo' })
      expect(result.success).toBe(true)
    })

    it('accepts a name that is exactly 100 characters (boundary max)', () => {
      const result = registerSchema.safeParse({ ...validPayload, name: 'A'.repeat(100) })
      expect(result.success).toBe(true)
    })

    it('accepts a password that is exactly 8 characters (boundary min)', () => {
      const result = registerSchema.safeParse({
        ...validPayload,
        password: 'abcdefgh',
        confirmPassword: 'abcdefgh',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('name validation', () => {
    it('rejects a missing name field', () => {
      const { name: _n, ...rest } = validPayload
      const result = registerSchema.safeParse(rest)
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.error.flatten().fieldErrors.name).toBeDefined()
    })

    it('rejects a name shorter than 2 characters', () => {
      const result = registerSchema.safeParse({ ...validPayload, name: 'A' })
      expect(result.success).toBe(false)
      if (result.success) return
      const msg = result.error.flatten().fieldErrors.name?.[0]
      expect(msg).toBe('Name must be at least 2 characters')
    })

    it('rejects a name longer than 100 characters', () => {
      const result = registerSchema.safeParse({ ...validPayload, name: 'A'.repeat(101) })
      expect(result.success).toBe(false)
      if (result.success) return
      const msg = result.error.flatten().fieldErrors.name?.[0]
      expect(msg).toBe('Name cannot exceed 100 characters')
    })

    it('rejects an empty name string', () => {
      const result = registerSchema.safeParse({ ...validPayload, name: '' })
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.error.flatten().fieldErrors.name).toBeDefined()
    })
  })

  describe('email validation', () => {
    it('rejects a missing email field', () => {
      const { email: _e, ...rest } = validPayload
      const result = registerSchema.safeParse(rest)
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.error.flatten().fieldErrors.email).toBeDefined()
    })

    it('rejects an invalid email format', () => {
      const result = registerSchema.safeParse({ ...validPayload, email: 'not-an-email' })
      expect(result.success).toBe(false)
      if (result.success) return
      const msg = result.error.flatten().fieldErrors.email?.[0]
      expect(msg).toBe('Enter a valid email address')
    })
  })

  describe('password validation', () => {
    it('rejects a missing password field', () => {
      const { password: _p, ...rest } = validPayload
      const result = registerSchema.safeParse(rest)
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.error.flatten().fieldErrors.password).toBeDefined()
    })

    it('rejects a password shorter than 8 characters', () => {
      const result = registerSchema.safeParse({
        ...validPayload,
        password: 'abc123',
        confirmPassword: 'abc123',
      })
      expect(result.success).toBe(false)
      if (result.success) return
      const msg = result.error.flatten().fieldErrors.password?.[0]
      expect(msg).toBe('Password must be at least 8 characters')
    })
  })

  describe('confirmPassword / refine', () => {
    it('rejects when password and confirmPassword do not match', () => {
      const result = registerSchema.safeParse({
        ...validPayload,
        password: 'securePass1',
        confirmPassword: 'differentPass',
      })
      expect(result.success).toBe(false)
      if (result.success) return
      const msg = result.error.flatten().fieldErrors.confirmPassword?.[0]
      expect(msg).toBe('Passwords do not match')
    })

    it('rejects a missing confirmPassword field', () => {
      const { confirmPassword: _c, ...rest } = validPayload
      const result = registerSchema.safeParse(rest)
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.error.flatten().fieldErrors.confirmPassword).toBeDefined()
    })

    it('does not report a mismatch error when passwords match exactly', () => {
      const result = registerSchema.safeParse(validPayload)
      if (!result.success) {
        // Should not happen, but surface the actual errors if it does
        throw new Error(JSON.stringify(result.error.flatten()))
      }
      expect(result.success).toBe(true)
    })
  })
})
