'use client'

import { useState, useMemo } from 'react'
import {
  Button,
  Chip,
  Dropdown,
  Label,
  ListBox,
  Pagination,
  Select,
  Table,
  Tooltip,
  useOverlayState,
} from '@heroui/react'
import type { SerializedExpense } from '@/lib/data/expenses'
import type { SerializedCategory } from '@/lib/data/categories'
import { ExpenseModal } from './ExpenseModal'
import { DeleteModal } from './DeleteModal'

interface Props {
  expenses: SerializedExpense[]
  categories: SerializedCategory[]
}

const PAGE_SIZE = 10

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatAmount(amount: number) {
  const [intPart, decPart] = amount.toFixed(2).split('.')
  const lastThree = intPart.slice(-3)
  const rest = intPart.slice(0, -3)
  const formatted = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree : lastThree
  return `₹ ${formatted}.${decPart}`
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const day = String(d.getUTCDate()).padStart(2, '0')
  const month = MONTHS[d.getUTCMonth()]
  const year = d.getUTCFullYear()
  return `${day} ${month} ${year}`
}

export function ExpensesClient({ expenses, categories }: Props) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [editingExpense, setEditingExpense] = useState<SerializedExpense | undefined>(undefined)
  const [deletingId, setDeletingId] = useState('')

  const expenseModalState = useOverlayState()
  const deleteModalState = useOverlayState()

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return expenses.filter((e) => {
      const matchesSearch =
        !q ||
        e.description.toLowerCase().includes(q) ||
        (categoryMap.get(e.categoryId) ?? '').toLowerCase().includes(q)
      const matchesCategory = categoryFilter === 'all' || e.categoryId === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [expenses, search, categoryFilter, categoryMap])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function openAdd() {
    setEditingExpense(undefined)
    expenseModalState.open()
  }

  function openEdit(expense: SerializedExpense) {
    setEditingExpense(expense)
    expenseModalState.open()
  }

  function openDelete(id: string) {
    setDeletingId(id)
    deleteModalState.open()
  }

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative flex items-center">
          <svg
            className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search expenses…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 pr-8 py-1.5 text-sm border border-input rounded-md w-64 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
          />
          {search && (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="absolute right-2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <Select.Root
          selectedKey={categoryFilter}
          onSelectionChange={(key) => {
            setCategoryFilter(String(key ?? 'all'))
            setPage(1)
          }}
          placeholder="Category"
        >
          <Label className="sr-only">Filter by category</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox.Root>
              <ListBox.Item id="all" textValue="All categories">All categories</ListBox.Item>
              {categories.map((c) => (
                <ListBox.Item key={c.id} id={c.id} textValue={c.name}>
                  {c.name}
                </ListBox.Item>
              ))}
            </ListBox.Root>
          </Select.Popover>
        </Select.Root>

        <Button
          variant="primary"
          className="ml-auto"
          onPress={openAdd}
        >
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Expense
        </Button>
      </div>

      {/* Table */}
      <Table>
        <Table.Content aria-label="Expenses" selectionMode="none">
          <Table.Header>
            <Table.Column isRowHeader>Date</Table.Column>
            <Table.Column>Description</Table.Column>
            <Table.Column>Category</Table.Column>
            <Table.Column>Type</Table.Column>
            <Table.Column>Amount</Table.Column>
            <Table.Column> </Table.Column>
          </Table.Header>
          <Table.Body
            renderEmptyState={() => (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No expenses found. Add your first expense to get started.
              </div>
            )}
          >
            {paginated.map((expense) => (
              <Table.Row key={expense.id}>
                <Table.Cell>{formatDate(expense.date)}</Table.Cell>
                <Table.Cell>
                  {expense.description.length > 40 ? (
                    <Tooltip>
                      <Tooltip.Trigger>
                        <span>{expense.description.slice(0, 40)}…</span>
                      </Tooltip.Trigger>
                      <Tooltip.Content>{expense.description}</Tooltip.Content>
                    </Tooltip>
                  ) : (
                    <span>{expense.description || <span className="text-muted-foreground">—</span>}</span>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <Chip variant="soft" size="sm">
                    {categoryMap.get(expense.categoryId) ?? 'Unknown'}
                  </Chip>
                </Table.Cell>
                <Table.Cell>
                  <Chip
                    variant="soft"
                    size="sm"
                    className={expense.type === 'income' ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'}
                  >
                    {expense.type === 'income' ? 'Income' : 'Expense'}
                  </Chip>
                </Table.Cell>
                <Table.Cell>
                  <span className={`font-medium ${expense.type === 'income' ? 'text-green-600' : ''}`}>
                    {formatAmount(expense.amount)}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <Dropdown.Root>
                    <Dropdown.Trigger
                      aria-label="Expense actions"
                      className="inline-flex items-center justify-center rounded-md w-8 h-8 bg-transparent hover:bg-muted focus-visible:outline-none transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path d="M10 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
                      </svg>
                    </Dropdown.Trigger>
                    <Dropdown.Popover>
                      <Dropdown.Menu aria-label="Expense actions">
                        <Dropdown.Item onPress={() => openEdit(expense)}>
                          Edit
                        </Dropdown.Item>
                        <Dropdown.Item variant="danger" onPress={() => openDelete(expense.id)}>
                          Delete
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown.Popover>
                  </Dropdown.Root>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table>

      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination>
            <Pagination.Content>
              <Pagination.Item>
                <Pagination.Previous onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  <Pagination.PreviousIcon />
                </Pagination.Previous>
              </Pagination.Item>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Pagination.Item key={p}>
                  <Pagination.Link isActive={p === page} onClick={() => setPage(p)}>
                    {p}
                  </Pagination.Link>
                </Pagination.Item>
              ))}
              <Pagination.Item>
                <Pagination.Next onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  <Pagination.NextIcon />
                </Pagination.Next>
              </Pagination.Item>
            </Pagination.Content>
          </Pagination>
        </div>
      )}

      <ExpenseModal
        categories={categories}
        expense={editingExpense}
        state={expenseModalState}
      />

      <DeleteModal
        expenseId={deletingId}
        state={deleteModalState}
      />
    </div>
  )
}
