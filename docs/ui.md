# UI Design Specification — Personal Expense Tracker

## Overview

The UI is built **exclusively with [HeroUI](https://heroui.com) components**. No custom CSS classes, no inline styles, no Tailwind utilities beyond what HeroUI exposes through its `className` prop for layout (`flex`, `gap-*`, `p-*`, `w-full`, etc.). No custom-built UI primitives.

The design follows a **light/dark adaptive theme** using HeroUI's built-in theming, scales across mobile → tablet → desktop without breakpoint hacks, and meets WCAG 2.1 AA contrast and focus requirements via HeroUI's built-in accessibility.

---

## Design Tokens

| Token | Value |
|---|---|
| Primary color | `primary` (HeroUI default violet) |
| Success color | `success` (used for income / positive delta) |
| Danger color | `danger` (used for overspend / delete) |
| Warning color | `warning` (used for approaching budget limit) |
| Font scale | HeroUI default (Inter via `@heroui/react`) |
| Border radius | `rounded-xl` (via HeroUI `radius="lg"`) |
| Shadow | HeroUI card shadow tokens |

---

## Application Shell

### Root Layout — `HeroUIProvider` + `Navbar`

The root layout wraps the entire app in `<HeroUIProvider>` for theme and routing context.

**Components used:**
- `Navbar` (`isBordered`, `isBlurred`) — sticky top bar
- `NavbarBrand` — app name "Spendly" with a wallet icon (SVG inline, no custom component)
- `NavbarContent` (justify `"center"`) — desktop nav links as `NavbarItem` + `Link`
- `NavbarContent` (justify `"end"`) — avatar + theme toggle
- `NavbarMenuToggle` — hamburger visible only on mobile
- `NavbarMenu` — slide-down drawer on mobile containing the same nav links as `NavbarMenuItem`
- `Avatar` (size `"sm"`, `isBordered`, `color="primary"`) — shows user initials; clicking opens a `Dropdown`
- `Dropdown` → `DropdownTrigger` → `DropdownMenu` with items: Profile, Settings, Sign Out
- `Switch` (with sun/moon icons as `startContent`/`endContent`) — light/dark toggle, wired to `useTheme()`
- `Divider` — separates nav sections in the mobile drawer

**Responsive behavior:**
- Desktop (≥ md): full `NavbarContent` center links visible, `NavbarMenuToggle` hidden
- Mobile (< md): center links hidden, `NavbarMenuToggle` shown, links live in `NavbarMenu`

---

## Pages

### 1. Authentication — `/login` and `/signup`

**Layout:** Centered single-column card, vertically centered in the viewport.

**Components:**
- `Card` (`shadow="lg"`, `radius="lg"`, max-width 420px via `className="max-w-sm w-full"`)
  - `CardHeader` — `Image` (small logo), heading via `p` with HeroUI typography scale
  - `CardBody` — form fields
  - `CardFooter` — CTA and secondary link

**Login form fields:**
- `Input` (`type="email"`, `label="Email"`, `labelPlacement="outside"`, `isRequired`, `startContent` = envelope icon, `variant="bordered"`)
- `Input` (`type="password"`, `label="Password"`, `labelPlacement="outside"`, `isRequired`, `endContent` = show/hide toggle `Button` with eye icon, `variant="bordered"`)
- `Checkbox` (`size="sm"`) — "Remember me"
- `Button` (`color="primary"`, `fullWidth`, `type="submit"`, shows `Spinner` inside when loading) — "Sign In"
- `Link` (`size="sm"`) — "Forgot password?"
- `Divider` with "or" text centered
- OAuth placeholder: `Button` (`variant="bordered"`, `fullWidth`, `startContent` = Google icon SVG) — "Continue with Google"

**Signup form adds:**
- `Input` (`label="Full Name"`, `labelPlacement="outside"`, `variant="bordered"`)
- `Input` (`label="Confirm Password"`, `type="password"`, `isInvalid` + `errorMessage` wired to validation state)

**Validation feedback:** HeroUI's native `isInvalid` + `errorMessage` props on each `Input` — no custom error components.

**Accessibility:**
- All inputs have explicit `label` props (not placeholder-only)
- `Button` submit uses `type="submit"` inside a `<form>`
- Focus ring provided by HeroUI's default focus styles
- Error messages announced via `aria-describedby` (handled by HeroUI internally)

---

### 2. Dashboard — `/dashboard`

The main landing page after login. Shows an at-a-glance financial summary.

#### 2a. Summary Cards (top row)

Four `Card` components in a responsive grid (`grid grid-cols-2 md:grid-cols-4 gap-4`):

| Card | Metric | Color accent |
|---|---|---|
| Total This Month | `₹ X,XXX` | `primary` |
| Expenses Count | `XX transactions` | default |
| Largest Category | Category name + amount | `warning` |
| vs Last Month | `+X%` / `-X%` delta | `success` or `danger` |

Each card:
- `Card` (`shadow="sm"`, `radius="lg"`, `isPressable` on the category card to navigate)
- `CardBody` — `Chip` for the label, large numeric text, optional trend arrow icon

#### 2b. Monthly Spending Chart

- `Card` (`shadow="sm"`) containing a chart area
- Chart title in `CardHeader`
- `Tabs` (size `"sm"`, `color="primary"`, `variant="underlined"`) — "6 Months" | "This Year" tabs control displayed data range
- Chart rendered via a HeroUI-compatible charting library (e.g., Recharts) inside `CardBody`; the chart container itself uses no custom CSS — only HeroUI spacing classes
- `Skeleton` shown while data loads (`isLoaded` prop toggles)

#### 2c. Spending by Category (donut / progress breakdown)

- `Card` (`shadow="sm"`) with `CardHeader` title and `CardBody`
- Each category row: `Progress` (`color` mapped to category, `label` = category name, `value` = % of total, `showValueLabel`)
- Categories listed in descending spend order
- `Chip` (`size="sm"`, `variant="flat"`) showing the INR amount beside each bar

#### 2d. Recent Expenses (mini list)

- `Card` (`shadow="sm"`) with `CardHeader` showing title + `Button` (`size="sm"`, `variant="light"`, `color="primary"`) "View All" linking to `/expenses`
- `Listbox` or a bare `Table` (5 rows, no pagination) — see Expenses page for full Table spec
- Each row: category chip, description, date, amount
- `Divider` between rows when using `Listbox`

---

### 3. Expenses — `/expenses`

Full expense management page.

#### 3a. Toolbar

Horizontal `flex` row:
- `Input` (`placeholder="Search expenses…"`, `startContent` = search icon, `isClearable`, `variant="bordered"`, `className="max-w-xs"`) — live filter
- `Select` (`label="Category"`, `variant="bordered"`, `className="max-w-40"`, `size="sm"`) populated with `SelectItem` per category + "All" option
- `DateRangePicker` (`label="Date range"`, `variant="bordered"`, `size="sm"`, `className="max-w-xs"`) — wraps two dates
- `Button` (`color="primary"`, `startContent` = plus icon) — "Add Expense" opens the Add/Edit modal

On mobile, the filter controls collapse behind a `Button` (`variant="bordered"`, `startContent` = filter icon) "Filters" that opens a `Modal` containing the same controls stacked vertically.

#### 3b. Expenses Table

- `Table` (`aria-label="Expenses"`, `selectionMode="multiple"`, `sortDescriptor` wired to state, `onSortChange` handler)
  - `TableHeader`:
    - `TableColumn` key `"date"` allowsSorting — "Date"
    - `TableColumn` key `"description"` — "Description"
    - `TableColumn` key `"category"` — "Category"
    - `TableColumn` key `"amount"` allowsSorting — "Amount"
    - `TableColumn` key `"actions"` — "" (actions column)
  - `TableBody` (`loadingContent={<Spinner />}`, `emptyContent="No expenses found"`):
    - `TableRow` per expense:
      - Date cell: formatted string
      - Description cell: truncated with `Tooltip` showing full text on hover
      - Category cell: `Chip` (`variant="flat"`, `size="sm"`, color mapped per category)
      - Amount cell: `₹ X,XXX.XX` right-aligned, bold if above average
      - Actions cell: `Dropdown` → `DropdownTrigger` (vertical dots `Button` `variant="light"` `isIconOnly`) → `DropdownMenu` with "Edit" and "Delete" `DropdownItem` (delete uses `color="danger"`)
- `Pagination` (`total`, `page`, `onChange`, `color="primary"`, `showControls`) — below the table
- Bulk action bar (appears when rows selected via `selectedKeys`): `Button` (`color="danger"`, `variant="flat"`) "Delete Selected"

#### 3c. Add / Edit Expense — Modal

- `Modal` (`size="md"`, `backdrop="blur"`, `isDismissable`, `isKeyboardDismissable`)
  - `ModalContent`:
    - `ModalHeader` — "Add Expense" or "Edit Expense"
    - `ModalBody`:
      - `Input` (`label="Amount"`, `labelPlacement="outside"`, `type="number"`, `startContent` = "₹" text, `isRequired`, `variant="bordered"`)
      - `Select` (`label="Category"`, `labelPlacement="outside"`, `isRequired`, `variant="bordered"`, `placeholder="Pick a category"`) with `SelectItem` per user category
      - `DateInput` (`label="Date"`, `labelPlacement="outside"`, `isRequired`, `variant="bordered"`)
      - `Input` (`label="Description"`, `labelPlacement="outside"`, `variant="bordered"`)
      - `Textarea` (`label="Notes"`, `labelPlacement="outside"`, `variant="bordered"`, `maxRows={3}`)
    - `ModalFooter`:
      - `Button` (`variant="light"`, `onPress={onClose}`) — "Cancel"
      - `Button` (`color="primary"`, `type="submit"`, `isLoading` wired to submit state) — "Save"

---

### 4. Categories — `/categories`

#### 4a. Category List

- `Card` (`shadow="sm"`) containing the list
- `CardHeader`: title + `Button` (`color="primary"`, `size="sm"`, `startContent` = plus icon) "New Category"
- `CardBody`:
  - `Table` (`aria-label="Categories"`, no selection):
    - Columns: Name, Type (Default / Custom), Actions
    - Name cell: `Chip` (`variant="flat"`, `color` unique per category)
    - Type cell: `Chip` (`size="sm"`, `variant="flat"`, `color="success"` for default, `color="default"` for custom)
    - Actions: `Button` (`isIconOnly`, `variant="light"`, `size="sm"`) edit pencil, `Button` (`isIconOnly`, `variant="light"`, `color="danger"`, `size="sm"`) trash icon — delete disabled with `Tooltip` "Cannot delete default category" for `isDefault` rows

#### 4b. Add / Edit Category — Modal

- `Modal` (`size="sm"`, `backdrop="blur"`)
  - `ModalContent`:
    - `ModalHeader` — "New Category" or "Edit Category"
    - `ModalBody`:
      - `Input` (`label="Category Name"`, `labelPlacement="outside"`, `isRequired`, `variant="bordered"`)
    - `ModalFooter`: Cancel + Save `Button`

---

### 5. Reports — `/reports`

Monthly summary analytics view.

#### 5a. Month Selector

- `Select` (`label="Month"`, `variant="bordered"`, `size="sm"`, `className="max-w-40"`) and `Select` (`label="Year"`, `variant="bordered"`, `size="sm"`) side by side

#### 5b. Summary Header Cards

Same grid pattern as Dashboard summary cards but filtered to the selected month:
- Total Spent
- Number of Transactions
- Highest Single Expense
- Most Spent Category

#### 5c. Category Breakdown Table

- `Table` (`aria-label="Category breakdown"`, striped via `isStriped`):
  - Columns: Category, Transactions, Total Spent, % of Total
  - Amount column right-aligned
  - `TableBody` `emptyContent` — "No data for this period"
- Below table: `Divider` + grand total row as a styled `CardBody` row (not a custom component — just a `Card` with `CardBody`)

#### 5d. Monthly Trend

- `Card` with line chart (Recharts inside `CardBody`), same `Tabs` pattern as Dashboard for range selection
- `Skeleton` guards the chart area while fetching

---

## Global Patterns

### Loading States

All async data is guarded with `Skeleton` wrappers:
- Card-level: `Skeleton` with matching height and `radius="lg"`
- Table rows: `Skeleton` in each `TableCell` while loading
- Button actions: `isLoading` prop on `Button` (shows built-in spinner, disables click)

### Empty States

- Table `emptyContent` prop — single descriptive string + a `Button` CTA where applicable
- Dashboard with no expenses: `Card` with centered `Image` (illustration) and `Button` "Add your first expense"

### Error States

- Toast / snackbar feedback: HeroUI's `addToast` (from `useHeroUIToast` or equivalent) — `color="danger"` for errors, `color="success"` for confirmations
- Field validation: `isInvalid` + `errorMessage` on `Input`, `Select`, `DateInput`

### Confirmation Dialogs

Destructive actions (delete expense, delete category) use:
- `Modal` (`size="sm"`, `backdrop="opaque"`)
  - `ModalHeader` — "Delete Expense?"
  - `ModalBody` — one-sentence confirmation text
  - `ModalFooter` — `Button` (`variant="light"`) "Cancel" + `Button` (`color="danger"`, `isLoading`) "Delete"

### Responsive Behavior

| Pattern | Mobile | Desktop |
|---|---|---|
| Navbar links | `NavbarMenu` drawer | `NavbarContent` inline |
| Summary cards | 2-col grid | 4-col grid |
| Expense filters | Behind "Filters" modal | Inline toolbar |
| Modals | Full-screen (`size="full"`) | Centered (`size="md"`) |
| Tables | Horizontal scroll via `Table` `overflow-x-auto` wrapper | Full width |

All breakpoint switching uses `className` with Tailwind responsive prefixes (e.g., `className="grid-cols-2 md:grid-cols-4"`) — these are layout utilities, not style overrides, and are the only non-HeroUI classes used.

### Accessibility Checklist (satisfied by HeroUI defaults)

- All interactive elements reachable by keyboard (tab order, arrow keys in menus/selects)
- Focus rings visible on all focusable elements
- `aria-label` on icon-only `Button` components (passed as the `aria-label` prop)
- `aria-label` on `Table` and `Modal` components
- Color is never the sole differentiator — icons or text always accompany color-coded `Chip` / `Progress` elements
- `Tooltip` content is accessible to screen readers via `aria-describedby`
- `Modal` traps focus and returns focus to trigger on close
- Form errors announced live via HeroUI's internal `aria-describedby` linkage

---

## Component → HeroUI Package Reference

| Component | Import |
|---|---|
| `Navbar`, `NavbarBrand`, `NavbarContent`, `NavbarItem`, `NavbarMenu`, `NavbarMenuToggle`, `NavbarMenuItem` | `@heroui/navbar` |
| `Card`, `CardHeader`, `CardBody`, `CardFooter` | `@heroui/card` |
| `Button` | `@heroui/button` |
| `Input`, `Textarea` | `@heroui/input` |
| `Select`, `SelectItem` | `@heroui/select` |
| `DateInput`, `DateRangePicker` | `@heroui/date-picker` |
| `Modal`, `ModalContent`, `ModalHeader`, `ModalBody`, `ModalFooter` | `@heroui/modal` |
| `Table`, `TableHeader`, `TableColumn`, `TableBody`, `TableRow`, `TableCell` | `@heroui/table` |
| `Chip` | `@heroui/chip` |
| `Avatar` | `@heroui/avatar` |
| `Dropdown`, `DropdownTrigger`, `DropdownMenu`, `DropdownItem` | `@heroui/dropdown` |
| `Pagination` | `@heroui/pagination` |
| `Progress` | `@heroui/progress` |
| `Skeleton` | `@heroui/skeleton` |
| `Spinner` | `@heroui/spinner` |
| `Switch` | `@heroui/switch` |
| `Tabs`, `Tab` | `@heroui/tabs` |
| `Tooltip` | `@heroui/tooltip` |
| `Divider` | `@heroui/divider` |
| `Link` | `@heroui/link` |
| `Checkbox` | `@heroui/checkbox` |
| `Listbox`, `ListboxItem` | `@heroui/listbox` |
| `Image` | `@heroui/image` |
