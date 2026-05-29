'use client'

import { useTransition } from 'react'
import { Modal, Button, Toast } from '@heroui/react'
import { deleteCategory } from '@/app/actions/categories'
import type { useOverlayState } from '@heroui/react'

type OverlayState = ReturnType<typeof useOverlayState>

interface Props {
  categoryId: string
  categoryName: string
  state: OverlayState
}

export function DeleteCategoryModal({ categoryId, categoryName, state }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCategory(categoryId)
      if (result.success) {
        Toast.toast.success('Category deleted')
        state.close()
      } else {
        Toast.toast.danger(result.error)
      }
    })
  }

  return (
    <Modal.Root state={state}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Delete Category?</Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>
            <Modal.Body>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{categoryName}</span> will be
                permanently deleted. Expenses assigned to this category will not be deleted but will
                show an unknown category. This action cannot be undone.
              </p>
            </Modal.Body>
            <Modal.Footer className="flex justify-end gap-2">
              <Button variant="outline" onPress={state.close} isDisabled={isPending}>
                Cancel
              </Button>
              <Button variant="danger" onPress={handleDelete} isDisabled={isPending}>
                {isPending ? 'Deleting…' : 'Delete'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  )
}
