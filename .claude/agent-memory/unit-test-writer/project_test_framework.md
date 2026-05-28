---
name: project-test-framework
description: Vitest setup details — version, config file location, scripts, and key mock patterns used across the project
metadata:
  type: project
---

## Test framework: Vitest 4.1.7

**Config file:** `vitest.config.ts` at project root.

Key settings:
- `environment: 'node'`
- `setupFiles: ['__tests__/setup.ts']` — mocks `server-only` and sets env vars (`MONGODB_URI`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`)
- `include: ['__tests__/**/*.test.ts']`
- Path alias `@/*` → project root (mirrors `tsconfig.json`)

**Scripts added to `package.json`:**
- `npm test` → `vitest run`
- `npm run test:watch` → `vitest`
- `npm run test:coverage` → `vitest run --coverage` (uses `@vitest/coverage-v8`)

**Why:** No test runner existed before; Vitest was chosen because it natively understands TypeScript and ESM without extra config, and aligns with the project's modern toolchain.

**How to apply:** Any new test file must go under `__tests__/` with a `.test.ts` extension. The setup file handles the global mocks automatically — individual test files only need to mock their own direct dependencies.
