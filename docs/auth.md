# Authentication Specification — Personal Expense Tracker

## Overview

Authentication is handled entirely by **NextAuth v4** (`next-auth@4`), the latest stable release. NextAuth owns session creation, session validation, CSRF protection, and the sign-in/sign-out lifecycle. No custom session logic is written outside of NextAuth's APIs.

The security model has two hard rules:
1. **Every route under `/app/*` requires an authenticated session.** Unauthenticated requests are redirected to `/login` at the middleware layer — before any page or API handler runs.
2. **Users can only access their own data.** The authenticated user's `id` is read from the server-side session and injected into every database query as a mandatory `userId` filter. Client-supplied user identifiers are never trusted.

---

## Package

```
next-auth@4        (latest stable — 4.24.14)
bcryptjs           (password hashing)
@types/bcryptjs    (dev dependency)
```

NextAuth v5 (Auth.js) is **not used** — it is still in beta and not stable.

---

## File Structure

```
app/
  api/
    auth/
      [...nextauth]/
        route.ts          ← NextAuth route handler (GET + POST)
    register/
      route.ts            ← POST /api/register — custom user creation
  login/
    page.tsx              ← public sign-in page
  signup/
    page.tsx              ← public registration page
lib/
  auth.ts                 ← authOptions config (shared across app)
  models/
    User.ts               ← existing Mongoose model
proxy.ts                  ← route protection
types/
  next-auth.d.ts          ← TypeScript module augmentation
```

---

## NextAuth Configuration — `lib/auth.ts`

The `authOptions` object lives here and is imported everywhere session access is needed.

### Session Strategy

Use **JWT sessions** (the NextAuth default). No session collection in MongoDB is needed. The JWT is stored in an `httpOnly`, `Secure`, `SameSite=lax` cookie managed by NextAuth.

### Credentials Provider

The only provider is `Credentials`. It:
1. Accepts `email` and `password`
2. Looks up the user in MongoDB by email
3. Compares the submitted password against `user.passwordHash` using `bcryptjs.compare`
4. Returns the user object on success, `null` on failure — never throws or leaks error detail to the client

```ts
// lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import User from "@/lib/models/User";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        await dbConnect();
        const user = await User.findOne({ email: credentials.email }).lean();
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],

  session: { strategy: "jwt" },

  callbacks: {
    async jwt({ token, user }) {
      // Persist the MongoDB _id into the token on first sign-in
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      // Expose id on the session object so server code can read it
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },
};
```

---

## Route Handler — `app/api/auth/[...nextauth]/route.ts`

```ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

This single file wires NextAuth into Next.js. Do not add any logic here.

---

## TypeScript Augmentation — `types/next-auth.d.ts`

```ts
import type { DefaultSession } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
  }
}
```

This makes `session.user.id` and `token.id` fully typed throughout the app.

---

## Proxy — `proxy.ts`

Uses NextAuth's `withAuth` helper. Runs at the edge before any page or API handler.

```ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function proxy(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Redirect logged-in users away from auth pages
    if (token && (pathname === "/login" || pathname === "/signup")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Return true to allow through, false to redirect to signIn page
      authorized({ token }) {
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  // Run on every route except Next.js internals, static assets, and auth API
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|api/register|login|signup).*)",
  ],
};
```

**How it works:** `withAuth` calls `authorized()` on every matched request. If the JWT token is absent or invalid, NextAuth redirects to `/login` automatically — the `proxy` function body never runs. The `matcher` excludes public routes so they are never gated.

---

## Server-Side Identity Enforcement

Middleware guarantees a session exists when a handler runs, but it does **not** guarantee a user is accessing their own data. Identity enforcement happens in every Server Component, Server Action, and Route Handler that touches the database.

### Reading the session — `getServerSession`

```ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// In a Server Component or Route Handler:
const session = await getServerSession(authOptions);
```

`getServerSession` reads the session from the request cookies. It must receive `authOptions` to decode the JWT correctly.

### Pattern — all protected server code

```ts
// Server Component
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id; // proxy guarantees session exists
  // pass userId into data-fetching functions
}

// Route Handler
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 }); // defense in depth
  const userId = session.user.id;
  // ...
}

// Server Action
"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function deleteExpense(expenseId: string) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");
  const userId = session.user.id;
  // ...
}
```

Never accept a `userId` as a parameter from the client. Always read it from `getServerSession`.

---

## Database-Level Access Control

Every Mongoose query that operates on user-owned data — Expense, Category, MonthlySummary — **must** include `userId` as a query condition. This is the final and most critical layer of the identity model. Even if middleware or a session check is ever bypassed by a bug, the `userId` filter in the query still prevents cross-user data access.

### Rules

| Operation | Required pattern |
|---|---|
| `find` / `findOne` | `{ userId }` in the query |
| `findByIdAndUpdate` | Use `findOneAndUpdate({ _id: id, userId })` instead |
| `findByIdAndDelete` | Use `findOneAndDelete({ _id: id, userId })` instead |
| `countDocuments` | `{ userId }` in the query |
| `aggregate` | `$match: { userId: new Types.ObjectId(userId) }` as the first stage |

### Correct patterns

```ts
// Fetch expenses — userId always comes from session, never from request
await Expense.find({ userId }).sort({ date: -1 });

// Update a specific expense — ownership verified in the query itself
await Expense.findOneAndUpdate(
  { _id: expenseId, userId },   // ← both conditions required
  { $set: updates },
  { new: true }
);

// Delete a specific expense — ownership verified in the query itself
await Expense.findOneAndDelete({ _id: expenseId, userId });

// Aggregate — userId cast to ObjectId in first $match stage
import { Types } from "mongoose";

await Expense.aggregate([
  { $match: { userId: new Types.ObjectId(userId) } },
  // ... further stages
]);
```

### Wrong patterns — never do these

```ts
// WRONG: looks up by ID alone — any authenticated user could delete any record
await Expense.findByIdAndDelete(expenseId);

// WRONG: trusting userId from request body
const { userId } = await req.json();
await Expense.find({ userId });

// WRONG: fetch-then-check in JS — chatty and race-condition prone
const expense = await Expense.findById(expenseId);
if (expense.userId.toString() !== userId) throw new Error("Forbidden");
await expense.deleteOne();
```

---

## Registration — `POST /api/register`

Registration is a custom Route Handler, not a NextAuth flow. It:
1. Validates the request body (name, email, password — minimum 8 characters)
2. Checks for duplicate email
3. Hashes the password with `bcrypt.hash(password, 12)`
4. Creates the User document
5. Returns `201` — **no session is created here**

After registration the client calls `signIn("credentials", { email, password })` to start the session.

```ts
// app/api/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import User from "@/lib/models/User";

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json();

  if (!name || !email || !password || password.length < 8) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await dbConnect();

  const existing = await User.findOne({ email });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({ name, email, passwordHash });

  return NextResponse.json({ message: "Account created" }, { status: 201 });
}
```

---

## Login Page — `app/login/page.tsx`

The login page is a Client Component. On form submit it calls `signIn` from `next-auth/react`:

```ts
import { signIn } from "next-auth/react";

const result = await signIn("credentials", {
  email,
  password,
  redirect: false, // handle redirect manually to show inline errors
});

if (result?.error) {
  setError("Invalid email or password.");
} else {
  router.push(callbackUrl ?? "/dashboard");
}
```

- `redirect: false` prevents a full-page redirect on error so inline error state can be set
- The `callbackUrl` query param (set by middleware on redirect to `/login`) is used for post-login navigation
- The form uses HeroUI components per `docs/ui.md`

---

## Sign Out

```ts
// Client Component (e.g., navbar dropdown)
import { signOut } from "next-auth/react";

await signOut({ callbackUrl: "/login" });
```

---

## Security Properties

| Property | Mechanism |
|---|---|
| Session cookie is `httpOnly` | NextAuth default — JavaScript cannot read it |
| Session cookie is `Secure` | NextAuth sets this in production automatically |
| Session cookie is `SameSite=lax` | NextAuth default — blocks cross-site request forgery |
| CSRF protection on mutations | NextAuth v4 generates and validates a CSRF token for `signIn`/`signOut` |
| Password hashing | `bcryptjs` with cost factor 12 |
| Timing-safe password comparison | `bcrypt.compare` is inherently timing-safe |
| No `userId` from client | Always derived from `getServerSession(authOptions)` |
| Cross-user data blocked at DB | `userId` filter on every query, not a post-fetch ownership check |
| Public routes never gated | `matcher` in proxy excludes `/login`, `/signup`, `/api/auth/*`, `/api/register` |
| Logged-in users redirected from auth pages | Handled in `proxy` function body |

---

## Environment Variables

```env
# .env.local
NEXTAUTH_SECRET=<random 32+ byte string — generate with: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000   # set to production URL in prod
MONGODB_URI=<connection string>
```

`NEXTAUTH_SECRET` is required. NextAuth will throw on startup if it is absent.

---

## Checklist for Every Feature That Touches User Data

1. Call `getServerSession(authOptions)` at the top of the handler/action
2. Return `401` / throw if session is null (defense in depth)
3. Extract `session.user.id` — this is the `userId` for all queries
4. Add `{ userId }` to every Mongoose query condition
5. Use `findOneAndUpdate({ _id, userId })` / `findOneAndDelete({ _id, userId })` for mutations
6. Never accept a `userId` from the request body or URL params
