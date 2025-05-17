import { MainNav } from "@/components/main-nav"
import { InboxView } from "@/components/inbox-view"

export default function InboxPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNav currentPath="/inbox" />
      <main className="flex-1 bg-gray-50 dark:bg-gray-900">
        <InboxView />
      </main>
    </div>
  )
}
