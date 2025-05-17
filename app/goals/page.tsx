import { MainNav } from "@/components/main-nav"
import { GoalsView } from "@/components/goals-view"

export default function GoalsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNav currentPath="/goals" />
      <main className="flex-1 bg-gray-50 dark:bg-gray-900">
        <GoalsView />
      </main>
    </div>
  )
}
