import { MainNav } from "@/components/main-nav"
import { TasksView } from "@/components/tasks-view"

export default function TasksPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNav currentPath="/tasks" />
      <main className="flex-1 bg-gray-50 dark:bg-gray-900">
        <TasksView />
      </main>
    </div>
  )
}
