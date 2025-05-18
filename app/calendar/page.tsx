import { MainNav } from "@/components/layout/main-nav"
import { CalendarView } from "@/components/views/calendar-view"

export default function CalendarPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNav currentPath="/calendar" />
      <main className="flex-1 bg-gray-50 dark:bg-gray-900">
        <CalendarView />
      </main>
    </div>
  )
}
