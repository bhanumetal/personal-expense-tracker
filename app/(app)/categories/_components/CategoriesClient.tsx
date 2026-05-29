'use client'

import { useState } from 'react'
import { Button, Chip, Dropdown, useOverlayState } from '@heroui/react'
import type { SerializedCategory } from '@/lib/data/categories'
import { CategoryModal } from './CategoryModal'
import { DeleteCategoryModal } from './DeleteCategoryModal'

interface Props {
  categories: SerializedCategory[]
}

export function CategoriesClient({ categories }: Props) {
  const [editingCategory, setEditingCategory] = useState<SerializedCategory | undefined>(undefined)
  const [deletingCategory, setDeletingCategory] = useState<SerializedCategory | undefined>(
    undefined,
  )

  const categoryModalState = useOverlayState()
  const deleteModalState = useOverlayState()

  function openAdd() {
    setEditingCategory(undefined)
    categoryModalState.open()
  }

  function openEdit(category: SerializedCategory) {
    setEditingCategory(category)
    categoryModalState.open()
  }

  function openDelete(category: SerializedCategory) {
    setDeletingCategory(category)
    deleteModalState.open()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button variant="primary" onPress={openAdd}>
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Category
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center border border-dashed rounded-xl">
          <TagIcon />
          <p className="text-sm font-medium">No categories yet</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            Create your first category to organise your expenses.
          </p>
          <Button variant="primary" size="sm" onPress={openAdd}>
            New Category
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col divide-y rounded-xl border overflow-hidden">
          {categories.map((category) => (
            <li
              key={category.id}
              className="flex items-center justify-between px-4 py-3 bg-background hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{category.name}</span>
                {category.isDefault && (
                  <Chip variant="soft" size="sm">
                    Default
                  </Chip>
                )}
              </div>

              <Dropdown.Root>
                <Dropdown.Trigger
                  aria-label={`Actions for ${category.name}`}
                  className="inline-flex items-center justify-center rounded-md w-8 h-8 bg-transparent hover:bg-muted focus-visible:outline-none transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path d="M10 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
                  </svg>
                </Dropdown.Trigger>
                <Dropdown.Popover>
                  <Dropdown.Menu aria-label={`Actions for ${category.name}`}>
                    <Dropdown.Item onPress={() => openEdit(category)}>Edit</Dropdown.Item>
                    <Dropdown.Item variant="danger" onPress={() => openDelete(category)}>
                      Delete
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown.Root>
            </li>
          ))}
        </ul>
      )}

      <CategoryModal category={editingCategory} state={categoryModalState} />

      <DeleteCategoryModal
        categoryId={deletingCategory?.id ?? ''}
        categoryName={deletingCategory?.name ?? ''}
        state={deleteModalState}
      />
    </div>
  )
}

function TagIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-muted-foreground"
      aria-hidden="true"
    >
      <path d="M12 2H2v10l9.29 9.29a1 1 0 0 0 1.42 0l7.58-7.58a1 1 0 0 0 0-1.42L12 2Z" />
      <path d="M7 7h.01" />
    </svg>
  )
}
