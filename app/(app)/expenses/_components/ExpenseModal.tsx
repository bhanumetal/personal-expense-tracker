'use client'

import { useState, useTransition, useEffect } from 'react'
import {
  Modal,
  Button,
  TextField,
  Label,
  Input,
  FieldError,
  Select,
  ListBox,
  TextArea,
  Alert,
  Toast,
  Spinner,
  useOverlayState,
} from '@heroui/react'
import { createExpense, updateExpense } from '@/app/actions/expenses'
import type { SerializedExpense } from '@/lib/data/expenses'
import type { SerializedCategory } from '@/lib/data/categories'
import type { ActionResult } from '@/lib/types/action-result'
import type { ExpenseInput } from '@/lib/schemas/expense'

type OverlayState = ReturnType<typeof useOverlayState>

interface Props {
  categories: SerializedCategory[]
  expense?: SerializedExpense
  state: OverlayState
}

const emptyState: ActionResult<ExpenseInput> = { success: false, error: '' }

export function ExpenseModal({ categories, expense, state }: Props) {
  const isEdit = !!expense
  const [isPending, startTransition] = useTransition()
  const [formState, setFormState] = useState<ActionResult<ExpenseInput>>(emptyState)

  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [categoryId, setCategoryId] = useState<string>('')
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!state.isOpen) return
    setAmount(expense ? String(expense.amount) : '')
    setType(expense?.type ?? 'expense')
    setCategoryId(expense?.categoryId ?? '')
    setDate(expense?.date ?? '')
    setDescription(expense?.description ?? '')
    setNote(expense?.note ?? '')
    setFormState(emptyState)
  }, [state.isOpen, expense])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormState(emptyState)

    const input: ExpenseInput = {
      amount: Number(amount),
      type,
      categoryId,
      date,
      description: description || undefined,
      note: note || undefined,
    }

    startTransition(async () => {
      const result = isEdit
        ? await updateExpense(expense.id, input)
        : await createExpense(input)

      if (result.success) {
        Toast.toast.success(isEdit ? 'Expense updated' : 'Expense added')
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
                <Modal.Heading>{isEdit ? 'Edit Expense' : 'Add Expense'}</Modal.Heading>
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
                  isInvalid={!!fields?.amount}
                  value={amount}
                  onChange={setAmount}
                  fullWidth
                >
                  <Label>Amount</Label>
                  <Input placeholder="0.00" inputMode="decimal" />
                  {fields?.amount?.[0] && <FieldError>{fields.amount[0]}</FieldError>}
                </TextField>

                <Select.Root
                  selectedKey={categoryId || null}
                  onSelectionChange={(key) => setCategoryId(String(key ?? ''))}
                  isRequired
                  isInvalid={!!fields?.categoryId}
                  placeholder="Pick a category"
                >
                  <Label>Category</Label>
                  <Select.Trigger className="w-full">
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox.Root>
                      {categories.map((c) => (
                        <ListBox.Item key={c.id} id={c.id} textValue={c.name}>
                          {c.name}
                        </ListBox.Item>
                      ))}
                    </ListBox.Root>
                  </Select.Popover>
                  {fields?.categoryId?.[0] && <FieldError>{fields.categoryId[0]}</FieldError>}
                </Select.Root>

                <TextField
                  isRequired
                  isInvalid={!!fields?.date}
                  value={date}
                  onChange={setDate}
                  type="date"
                  fullWidth
                >
                  <Label>Date</Label>
                  <Input />
                  {fields?.date?.[0] && <FieldError>{fields.date[0]}</FieldError>}
                </TextField>

                <TextField
                  isInvalid={!!fields?.description}
                  value={description}
                  onChange={setDescription}
                  fullWidth
                >
                  <Label>Description</Label>
                  <Input placeholder="Optional" />
                  {fields?.description?.[0] && <FieldError>{fields.description[0]}</FieldError>}
                </TextField>

                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">Type</span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={type === 'expense' ? 'primary' : 'outline'}
                      onPress={() => setType('expense')}
                    >
                      Expense
                    </Button>
                    <Button
                      type="button"
                      variant={type === 'income' ? 'primary' : 'outline'}
                      onPress={() => setType('income')}
                    >
                      Income
                    </Button>
                  </div>
                </div>

                <TextField
                  isInvalid={!!fields?.note}
                  value={note}
                  onChange={setNote}
                  fullWidth
                >
                  <Label>Notes</Label>
                  <TextArea placeholder="Optional" rows={3} />
                  {fields?.note?.[0] && <FieldError>{fields.note[0]}</FieldError>}
                </TextField>
              </Modal.Body>

              <Modal.Footer className="flex justify-end gap-2">
                <Button variant="outline" onPress={state.close} isDisabled={isPending}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" isDisabled={isPending}>
                  {isPending && <Spinner size="sm" className="mr-1" />}
                  Save
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  )
}
