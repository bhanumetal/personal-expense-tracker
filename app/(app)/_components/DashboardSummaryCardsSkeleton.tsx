import { Card, CardContent, Skeleton } from '@heroui/react'

export function DashboardSummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardContent className="flex flex-col gap-2 p-4">
            <Skeleton className="h-5 w-28 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
