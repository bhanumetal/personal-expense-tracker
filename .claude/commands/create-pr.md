# /create-pr — Generate a Pull Request for merging a feature branch into main

## Usage
```
/create-pr <feature-branch-name> "<short summary>"
```

**Example:**
```
/create-pr feature/expense-crud "Add secure expense CRUD feature"
```

---

## Instructions

You are a senior engineer preparing a professional GitHub pull request. Follow every step below in order. Do NOT skip steps or merge them.

### Step 1 — Parse inputs

The user has provided: `$ARGUMENTS`

Extract:
- **FEATURE_BRANCH** — the first argument (e.g. `feature/expense-crud`)
- **SUMMARY** — the second argument (the quoted description)

If either is missing, stop and ask the user to re-run with both arguments.

---

### Step 2 — Analyze the branch and diff

Run the following shell commands and study their output carefully before writing anything:

```bash
git status
git log main..HEAD --oneline
git diff main...HEAD --stat
git diff main...HEAD
```

From this output, determine:
- What files were added, modified, or deleted
- What features or fixes were actually implemented
- Any notable architectural decisions visible in the diff
- Whether there are any obvious issues (e.g. debug code, TODOs, commented-out blocks, large unintended changes)

---

### Step 3 — Propose the PR title and description

Write a **draft** PR title and description using the template below. Do NOT create any files yet.

Present the draft to the user clearly with this heading:

```
## Draft Pull Request — Awaiting Your Approval
```

**PR title format:**
```
[Type] Short imperative sentence (50 chars max)
```
Type must be one of: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`

**PR description template to fill in:**

```markdown
## Summary
<!-- 2–4 bullet points describing WHAT was built and WHY -->

## Changes
<!-- Grouped by concern. For each file or group of files, one line describing the change -->

## How to Test
<!-- Step-by-step instructions a reviewer can follow to verify the feature works -->

## Screenshots
<!-- If UI changes are present, note: "Screenshots should be added before merging." -->

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
```

After presenting the draft, ask the user:

> **Does this look correct? Type `yes` to generate the PR file, or give feedback to revise.**

**Wait for an explicit reply before proceeding.**

---

### Step 4 — Incorporate feedback (if any)

If the user requests changes, revise the draft and re-present it. Repeat until the user approves.

---

### Step 5 — Generate the PR file (only after approval)

Once the user explicitly approves (replies `yes` or equivalent confirmation), create the file:

**File path:**
```
.github/pull_requests/<FEATURE_BRANCH_SLUG>-pr.md
```

Where `FEATURE_BRANCH_SLUG` is the feature branch name with `/` replaced by `-`.

Example: `feature/expense-crud` → `.github/pull_requests/feature-expense-crud-pr.md`

The file must contain:
1. A YAML front-matter block:
```yaml
---
branch: <FEATURE_BRANCH>
target: main
date: <today's date in YYYY-MM-DD>
author: <git config user.name>
---
```
2. The full approved PR description (title + body).

After writing the file, print:
```
PR file created: .github/pull_requests/<filename>

To open this PR on GitHub, run:
  gh pr create --title "<title>" --body-file .github/pull_requests/<filename> --base main --head <FEATURE_BRANCH>
```

---

## Quality rules

- PR title must be imperative mood, no period at the end, under 50 characters.
- Summary bullets must say WHAT was built and WHY — not HOW.
- Changes section must be grouped by feature area, not a raw file list.
- "How to Test" must be actionable steps, not vague ("click around and verify").
- Do not invent changes that are not in the diff.
- Do not omit significant changes that ARE in the diff.
- Flag any concerns (TODOs, debug artifacts, large unreviewed changes) as a note to the user before finalizing.
