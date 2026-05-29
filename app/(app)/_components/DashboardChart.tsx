import { Card, CardContent, CardHeader, Tabs, TabList, Tab } from '@heroui/react'
import { getMonthlyTrend } from '@/lib/data/summary'
import { DashboardChartClient } from './DashboardChartClient'

export async function DashboardChart() {
  const trend = await getMonthlyTrend(6)

  return (
    <Card className="w-full">
      <CardHeader className="flex items-center justify-between p-4 pb-0">
        <p className="text-base font-semibold">Monthly Spending</p>
        <Tabs aria-label="Chart range">
          <TabList>
            <Tab id="6m">6 Months</Tab>
            <Tab id="year">This Year</Tab>
          </TabList>
        </Tabs>
      </CardHeader>
      <CardContent className="p-4">
        <DashboardChartClient data={trend} />
      </CardContent>
    </Card>
  )
}
