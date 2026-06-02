---
branch: feature/dashboard
target: main
date: 2026-06-02
author: bhanumetal
---

# feat: Add dashboard with charts and KPI summary cards

## Summary
- Replaces the placeholder dashboard page with a fully data-driven layout showing spending KPIs, trends, and a category breakdown
- Adds a monthly bar chart and category doughnut chart using react-chartjs-2, both theme-aware via HeroUI CSS variables
- Introduces MongoDB aggregation queries for dashboard metrics (current/last month totals, category breakdown, 6-month trend)
- Adds a light/dark mode toggle to the navbar

## Changes

**Dashboard UI**
- `app/(app)/page.tsx` — rebuilt from a single `<h1>` into a full Suspense-wrapped dashboard layout with skeleton fallbacks
- `app/(app)/_components/DashboardSummaryCards.tsx` — 4 KPI cards: total this month, expense count, largest category, vs-last-month % delta
- `app/(app)/_components/DashboardSummaryCardsSkeleton.tsx` — HeroUI Skeleton loading state for the summary row
- `app/(app)/_components/DashboardRecentExpenses.tsx` — last 5 expenses with category chip and "View All" link

**Charts (Server/Client split)**
- `app/(app)/_components/DashboardChart.tsx` — Server Component wrapper; fetches 6-month trend and renders Card shell
- `app/(app)/_components/DashboardChartClient.tsx` — Client Component; renders responsive Bar chart with HeroUI theme tokens
- `app/(app)/_components/DashboardCategoryBreakdown.tsx` — Server Component; fetches category breakdown for current month
- `app/(app)/_components/CategoryPieClient.tsx` — Client Component; renders Doughnut chart with inline legend list
- `lib/chart-registry.ts` — centralized Chart.js element/scale registration, imported by all chart Client Components

**Data layer**
- `lib/data/summary.ts` — `getDashboardSummary()` and `getMonthlyTrend()` using React `cache()` and MongoDB aggregation pipelines
- `lib/data/expenses.ts` — added `getRecentExpenses(limit)` for the recent expenses panel

**Navbar**
- `app/(app)/_components/AppNavbar.tsx` — light/dark mode toggle switch using HeroUI `SwitchRoot` + `useTheme`

**Docs & config**
- `docs/charts.md` — new chart patterns doc covering registration, responsive containers, theme tokens, and Server/Client split
- `CLAUDE.md` — updated to reference `docs/charts.md`
- `package.json` / `package-lock.json` — added `chart.js ^4.5.1` and `react-chartjs-2 ^5.3.1`

## How to Test
1. Run `npm run dev` and sign in with a user that has expenses recorded
2. Navigate to `/` (Dashboard) — confirm 4 KPI cards render with correct totals
3. Confirm the monthly bar chart shows the last 6 months of spending
4. Confirm the category doughnut shows current-month breakdown with legend
5. Confirm the recent expenses panel shows the 5 most recent entries with categories
6. Toggle the dark/light mode switch in the navbar — verify charts and cards adapt colors
7. Navigate away and back — confirm Suspense skeletons appear briefly on a cold render
8. Sign in with a new user (no expenses) — confirm all panels show empty-state messages

## Screenshots
Screenshots should be added before merging.

## Checklist
- [ ] Code follows project conventions (see CLAUDE.md)
- [ ] No debug logs, console.log, or commented-out code left in
- [ ] Server Actions use Zod-validated inputs (per docs/data-mutations.md)
- [ ] Data fetching happens in Server Components (per docs/data-fetching.md)
- [ ] No secrets or environment variables hard-coded
- [ ] Lint passes (`npm run lint`)
- [ ] Build passes (`npm run build`)

## Related Issues
<!-- Link any GitHub issues this PR closes, e.g. Closes #12 -->
