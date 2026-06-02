# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Critical: AI Workflow — Plan First, Code Second

Before writing any code, follow the workflow defined in `docs/ai-workflow.md` exactly:

1. **Produce a written plan** — summary, docs review, files to change, architecture decisions, data flow, ordered implementation steps, and out-of-scope items
2. **Wait for explicit user approval** — do not begin implementation on an ambiguous or absent reply
3. **Implement strictly as approved** — stop and re-propose if any mid-task discovery requires a deviation

This applies to every task that touches more than one file or involves any new route, component, server action, API handler, or database query. See `docs/ai-workflow.md` for the full rules and the plan template.

## Critical: Read `/docs` Before Implementing Any Feature

Before writing or modifying any code, read every file in the `/docs` directory that is relevant to the feature being implemented. These documents define the authoritative design, UI, and architectural decisions for this project. Code must conform to what is specified there — do not deviate, invent alternatives, or skip this step.

Current docs:
- `docs/ai-workflow.md` — AI development workflow; governs how all tasks are planned and executed
- `docs/ui.md` — UI design spec; all UI code must use only the HeroUI components and patterns described here
- `docs/auth.md` — Authentication spec; all auth, session, and data-access code must follow this exactly
- `docs/routing.md` — Routing conventions; all routes, layouts, and middleware must follow this exactly
- `docs/errors-and-validation.md` — Error handling and Zod validation patterns; all forms, actions, and handlers must follow this
- `docs/security.md` — Security rules; environment variables, secrets, and data exposure constraints
- `docs/best-practices.md` — React and Next.js performance best practices from Vercel Engineering
- `docs/data-mutations.md` — Data mutation patterns; all writes must use Server Actions with typed Zod-validated inputs, no FormData, no client-side fetch mutations
- `docs/data-fetching.md` — Data fetching patterns; all reads must happen in Server Components using lib/data/ functions, no client-side fetching, no GET Route Handlers for UI data
- `docs/charts.md` — Chart and visualization patterns; all charts must use react-chartjs-2 with the patterns defined here (responsive containers, HeroUI theme tokens, Server/Client split)

## Critical: Read Bundled Docs Before Writing Next.js Code

This project uses **Next.js 16.2.6** — a version with breaking changes from prior releases. Before writing or modifying any Next.js code, read the relevant guide in `node_modules/next/dist/docs/`. Do not rely on training data for APIs, file conventions, or routing behavior.

Key doc locations:
- App Router getting started: `node_modules/next/dist/docs/01-app/01-getting-started/`
- Guides (data fetching, auth, forms, etc.): `node_modules/next/dist/docs/01-app/02-guides/`
- API reference: `node_modules/next/dist/docs/01-app/03-api-reference/`

## Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build
npm run start    # Serve production build
npm run lint     # Run ESLint (flat config via eslint.config.mjs)
```

There is no test runner configured yet.

## Architecture

This is an App Router project (the `app/` directory, not `pages/`). All routing, layouts, and data fetching follow App Router conventions.

- `app/layout.tsx` — root layout; sets up Geist fonts via `next/font/google` and applies global CSS
- `app/page.tsx` — home route (`/`)
- `app/globals.css` — global styles; Tailwind v4 is configured via `postcss.config.mjs` using `@tailwindcss/postcss` (not the old `tailwind.config.js` approach)

**Path alias:** `@/*` maps to the project root (e.g., `@/app/...`, `@/components/...`).

**Styling:** Tailwind CSS v4 — configuration is in `postcss.config.mjs`, not a `tailwind.config.js` file. The v4 API differs from v3.

**TypeScript:** Strict mode enabled. The `next` TypeScript plugin is active via `tsconfig.json` plugins.

**ESLint:** Flat config (`eslint.config.mjs`) using `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`. ESLint 9+.
