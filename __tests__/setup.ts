// Mock modules that are only valid inside the Next.js server runtime.
// These must be registered before any test file imports them.
import { vi } from 'vitest'

// 'server-only' is a package that throws if imported outside the Next.js server
// runtime. We replace it with an empty module so lib/auth.ts can be imported.
vi.mock('server-only', () => ({}))

// Provide the minimum environment variables required by lib/db.ts at module
// evaluation time.  Individual tests that need a different value can override
// these via vi.stubEnv() inside the test itself.
process.env.MONGODB_URI = 'mongodb://localhost:27017/test'
process.env.NEXTAUTH_SECRET = 'test-secret-value-at-least-32-chars-long'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
