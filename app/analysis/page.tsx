import { SidebarProvider } from "@/components/ui/sidebar";
import { AnalysisView } from "@/components/views/analysis-view"

export default function AnalysisPage() {
  return <SidebarProvider><AnalysisView />
    </SidebarProvider>
}
