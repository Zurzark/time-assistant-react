import { MainNav } from "@/components/main-nav"
import { AnalyticsView } from "@/components/analytics-view"

export default function AnalyticsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNav currentPath="/analytics" />
      <main className="flex-1 bg-gray-50 dark:bg-gray-900">
        <AnalyticsView />
      </main>
    </div>
  )
}
