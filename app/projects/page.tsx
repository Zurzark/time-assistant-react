import { MainNav } from "@/components/main-nav"
import { ProjectsView } from "@/components/projects-view"

export default function ProjectsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNav currentPath="/projects" />
      <main className="flex-1 bg-gray-50 dark:bg-gray-900">
        <ProjectsView />
      </main>
    </div>
  )
}
