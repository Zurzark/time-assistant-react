import { MainNav } from "@/components/main-nav"
import { CalendarView } from "@/components/calendar-view"

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
