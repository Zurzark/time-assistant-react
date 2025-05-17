import { MainNav } from "@/components/main-nav"
import { SettingsView } from "@/components/settings-view"

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNav currentPath="/settings" />
      <main className="flex-1 bg-gray-50 dark:bg-gray-900">
        <SettingsView />
      </main>
    </div>
  )
}
