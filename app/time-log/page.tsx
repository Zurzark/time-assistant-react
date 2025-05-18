import { MainNav } from "@/components/layout/main-nav"
import { TimeLogView } from "@/components/views/time-log-view"

export default function TimeLogPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNav currentPath="/time-log" />
      <main className="flex-1 bg-gray-50 dark:bg-gray-900">
        <TimeLogView />
      </main>
    </div>
  )
}
