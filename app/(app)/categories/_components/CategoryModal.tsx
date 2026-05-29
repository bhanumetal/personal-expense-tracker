'use client'

import { useState, useTransition, useEffect } from 'react'
import {
  Modal,
  Button,
  TextField,
  Label,
  Input,
  FieldError,
  Alert,
  Spinner,
  useOverlayState,
} from '@heroui/react'
import { createCategory, updateCategory } from '@/app/actions/categories'
import type { SerializedCategory } from '@/lib/data/categories'
import type { ActionResult } from '@/lib/types/action-result'
import type { CategoryInput } from '@/lib/schemas/category'
import { Toast } from '@heroui/react'

type OverlayState = ReturnType<typeof useOverlayState>

interface Props {
  category?: SerializedCategory
  state: OverlayState
}

const emptyState: ActionResult<CategoryInput> = { success: false, error: '' }

export function CategoryModal({ category, state }: Props) {
  const isEdit = !!category
  const [isPending, startTransition] = useTransition()
  const [formState, setFormState] = useState<ActionResult<CategoryInput>>(emptyState)
  const [name, setName] = useState('')

  useEffect(() => {
    if (!state.isOpen) return
    setName(category?.name ?? '')
    setFormState(emptyState)
  }, [state.isOpen, category])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormState(emptyState)

    const input: CategoryInput = { name }

    startTransition(async () => {
      const result = isEdit
        ? await updateCategory(category.id, input)
        : await createCategory(input)

      if (result.success) {
        Toast.toast.success(isEdit ? 'Category updated' : 'Category created')
        state.close()
      } else {
        setFormState(result)
      }
    })
  }

  const fields = !formState.success ? formState.fields : undefined

  return (
    <Modal.Root state={state}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <form onSubmit={handleSubmit}>
              <Modal.Header>
                <Modal.Heading>{isEdit ? 'Edit Category' : 'New Category'}</Modal.Heading>
                <Modal.CloseTrigger />
              </Modal.Header>

              <Modal.Body className="flex flex-col gap-4">
                {!formState.success && formState.error && (
                  <Alert status="danger">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>{formState.error}</Alert.Title>
                    </Alert.Content>
                  </Alert>
                )}

                <TextField
                  isRequired
                  isInvalid={!!fields?.name}
                  value={name}
                  onChange={setName}
                  fullWidth
                  autoFocus
                >
                  <Label>Name</Label>
                  <Input placeholder="e.g. Food & Dining" />
                  {fields?.name?.[0] && <FieldError>{fields.name[0]}</FieldError>}
                </TextField>
              </Modal.Body>

              <Modal.Footer className="flex justify-end gap-2">
                <Button variant="outline" onPress={state.close} isDisabled={isPending}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" isDisabled={isPending}>
                  {isPending && <Spinner size="sm" className="mr-1" />}
                  {isEdit ? 'Save' : 'Create'}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  )
}
