# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

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
