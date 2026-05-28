---
name: project-coverage-status
description: Coverage status per source file after the authentication feature tests were written
metadata:
  type: project
---

## Coverage as of feature/authentication branch (2026-05-28)

| Source file | Test file | Coverage |
|---|---|---|
| `lib/schemas/auth.ts` — `loginSchema`, `registerSchema` | `__tests__/schemas/auth.test.ts` | Full: happy paths, all field validations, boundary values, cross-field refine |
| `lib/auth.ts` — `authorize`, `jwt` callback, `session` callback | `__tests__/lib/auth.test.ts` | Full: happy path, missing/empty credentials, user-not-found, wrong password, token propagation, static config |
| `app/api/register/route.ts` — `POST` | `__tests__/api/register.test.ts` | Full: 201, 400 (bad JSON), 422 (all field errors), 409 (duplicate), 500 (DB errors), no-leak check |
| `middleware.ts` — inner function + config | `__tests__/middleware.test.ts` | Full: redirect on /login + /signup for authed users, pass-through for unauthed, pass-through for other routes, matcher pattern coverage |
| `lib/db.ts` | Not tested | Intentionally excluded — pure DB bootstrapping code, no unit-testable logic |
| `lib/models/User.ts` | Not tested | Intentionally excluded — Mongoose model definition, no logic |
| `app/api/auth/[...nextauth]/route.ts` | Not tested | Just re-exports NextAuth handler; no logic to test |

## Total: 84 tests across 4 files, all passing
