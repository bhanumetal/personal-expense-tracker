# AI-Assisted Development Workflow

## Rule Zero

**No code is written until the user explicitly approves a plan.**

Every non-trivial task follows a two-phase process: Plan → Approve → Implement. Skipping or collapsing these phases is not allowed, regardless of how straightforward the task appears.

---

## Phase 1 — Plan

When given a feature request, bug, or any task that involves writing or modifying code, the AI must first produce a written plan in the following format. No code — not even a snippet — appears in this phase.

### Required Plan Structure

#### 1. Summary
One or two sentences stating what is being built and why.

#### 2. Docs Review
List every file in `/docs` that is relevant to the task and call out the specific rules or decisions from each that will govern the implementation.

Example:
- `docs/ui.md` — using `Modal` + `Input` + `Button` from HeroUI for the expense form; no custom CSS
- `docs/auth.md` — session read via `getServerSession(authOptions)`; `userId` injected into every DB query

#### 3. Files to Create or Modify
An explicit list of every file that will be created, edited, or deleted. For each file, one sentence on what changes.

Example:
```
CREATE  app/expenses/page.tsx          — server component; fetches and renders expense list
CREATE  app/expenses/actions.ts        — server actions: createExpense, updateExpense, deleteExpense
MODIFY  app/api/auth/[...nextauth]/route.ts  — no change needed, listed for completeness
```

#### 4. Architecture Decisions
Any decisions that affect structure, data flow, or patterns. Explain the choice and the alternative that was ruled out.

Example:
- Using a Server Action for form submission instead of a Route Handler — keeps the form and its mutation co-located, avoids an extra fetch round-trip.
- Category list fetched in the Server Component and passed as props to the modal — avoids a client-side fetch on modal open.

#### 5. Data Flow
Describe how data moves through the feature: user interaction → client → server → database → response. Call out where identity is enforced.

#### 6. Implementation Steps
An ordered list of discrete steps. Each step is one logical unit of work (one file, one function, one migration). Steps should be granular enough that the user can stop after any one of them and have a working state.

Example:
```
1. Add `createExpense` server action in app/expenses/actions.ts
2. Build the ExpenseForm client component using HeroUI Modal + Input
3. Build the expenses page server component — fetch + render
4. Wire the form submission to the server action
5. Add optimistic UI update on the client after successful submission
```

#### 7. Out of Scope
Explicitly list anything that will not be done in this task. This prevents scope creep and sets expectations.

---

## Phase 2 — Approval

After presenting the plan the AI stops and waits.

The AI does not:
- Write any code
- Propose "quick" alternatives
- Begin "just the easy parts"
- Ask leading questions that nudge toward implementation

The user must respond with one of:
- **Explicit approval** — "looks good", "approved", "go ahead", "yes", or equivalent
- **Revision request** — feedback on any part of the plan; the AI revises and re-presents, then waits again
- **Rejection** — the AI discards the plan and asks for clarification on what to do instead

A non-response, a question, or an ambiguous reply is treated as **not approved**. The AI asks for clarification.

---

## Phase 3 — Implement

Once the plan is explicitly approved the AI implements it exactly as described — step by step, in the order listed.

### Rules during implementation

- **Follow the approved plan.** If a discovery mid-implementation would require deviating from the plan (e.g., a file has an unexpected structure, a dependency is missing), stop, explain the blocker, and get approval for the change before continuing.
- **Follow all `/docs` specs.** `docs/ui.md`, `docs/auth.md`, and any other docs files govern every implementation decision. If a conflict arises between the plan and a doc, the doc wins — flag the conflict and resolve it with the user before writing code.
- **One step at a time.** Complete and verify each implementation step before moving to the next.
- **No unplanned additions.** Do not add error handling, abstractions, comments, helper utilities, or refactors that were not in the approved plan.
- **Report completion.** After all steps are done, state which files were created or modified. Do not add a narrative summary of what the code does.

---

## What Counts as a Non-Trivial Task

The Plan → Approve → Implement workflow is required for:

- Any new page, route, or layout
- Any new server action or API route handler
- Any change to the authentication or session flow
- Any new database query or schema change
- Any new component that handles user data
- Any change that touches more than one file

The workflow may be skipped only for:
- Fixing a clear, isolated typo or syntax error
- Renaming a single variable or import
- Updating a string literal (e.g., page title, label text)

When in doubt, run the workflow.

---

## Handling Ambiguous Requests

If a request is unclear, missing context, or could be interpreted in multiple ways, the AI asks a single focused clarifying question before producing a plan. It does not guess or produce a plan for the most likely interpretation without checking.

---

## Plan Template (copy-paste)

```
## Plan: [Feature Name]

### Summary
[1–2 sentences]

### Docs Review
- `docs/ui.md` — [relevant rules]
- `docs/auth.md` — [relevant rules]

### Files to Create or Modify
CREATE  [path] — [what changes]
MODIFY  [path] — [what changes]
DELETE  [path] — [why]

### Architecture Decisions
- [Decision]: [chosen approach] over [alternative] because [reason]

### Data Flow
[Step-by-step description from user action to DB and back]

### Implementation Steps
1. [Step]
2. [Step]
...

### Out of Scope
- [Item]
```
