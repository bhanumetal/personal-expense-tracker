'use client'

import { useTransition } from 'react'
import { Modal, Button, Toast } from '@heroui/react'
import { deleteExpense } from '@/app/actions/expenses'
import type { useOverlayState } from '@heroui/react'

type OverlayState = ReturnType<typeof useOverlayState>

interface Props {
  expenseId: string
  state: OverlayState
}

export function DeleteModal({ expenseId, state }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteExpense(expenseId)
      if (result.success) {
        Toast.toast.success('Expense deleted')
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
              <Modal.Heading>Delete Expense?</Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>
            <Modal.Body>
              <p className="text-sm text-muted-foreground">
                This expense will be permanently deleted. This action cannot be undone.
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
