'use client'

import { Button, Alert } from '@heroui/react'

export default function CategoriesError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-4">
      <Alert status="danger">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Something went wrong</Alert.Title>
          <Alert.Description>
            {error.message ?? 'Unable to load categories. Please try again.'}
          </Alert.Description>
        </Alert.Content>
      </Alert>
      <Button variant="outline" onPress={reset} className="self-start">
        Try again
      </Button>
    </div>
  )
}
