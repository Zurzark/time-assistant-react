import { MainNav } from "@/components/layout/main-nav"
import { WeeklyReviewView } from "@/components/views/weekly-review-view"

export default function WeeklyReviewPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNav currentPath="/weekly-review" />
      <main className="flex-1 bg-gray-50 dark:bg-gray-900">
        <WeeklyReviewView />
      </main>
    </div>
  )
}
