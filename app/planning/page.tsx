import { SidebarProvider } from "@/components/ui/sidebar";
import { PlanningView } from "@/components/views/planning-view";

export default function PlanningPage() {
  return (
    <SidebarProvider>
      <PlanningView />
    </SidebarProvider>
  );
}
