import { MainNav } from "@/components/main-nav"
import { PomodoroView } from "@/components/pomodoro-view"

export default function PomodoroPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNav currentPath="/pomodoro" />
      <main className="flex-1 bg-gray-50 dark:bg-gray-900">
        <PomodoroView />
      </main>
    </div>
  )
}
