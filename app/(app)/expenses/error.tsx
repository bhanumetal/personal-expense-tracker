'use client'

import { useEffect } from 'react'
import { Alert, Button } from '@heroui/react'

export default function ExpensesError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error('[ExpensesError]', error.digest)
  }, [error])

  return (
    <div className="flex flex-col gap-4 p-6">
      <Alert status="danger">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Something went wrong</Alert.Title>
          <Alert.Description>We couldn&apos;t load your expenses. Please try again.</Alert.Description>
        </Alert.Content>
      </Alert>
      <Button variant="outline" onPress={unstable_retry} className="self-start">
        Try again
      </Button>
    </div>
  )
}
