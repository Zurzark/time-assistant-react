import { MainNav } from "@/components/main-nav"
import { TodayDashboard } from "@/components/today-dashboard"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNav currentPath="/" />
      <main className="flex-1 bg-gray-50 dark:bg-gray-900">
        <TodayDashboard />
      </main>
    </div>
  )
}
