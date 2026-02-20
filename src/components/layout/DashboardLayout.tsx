import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Briefcase } from "lucide-react";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b px-4 bg-card shadow-sm">
            <SidebarTrigger />
            <div className="ml-4 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              <h1 className="text-sm font-semibold text-foreground tracking-tight">Job Consultancy CRM</h1>
            </div>
          </header>
          <div className="flex-1 p-6 overflow-auto bg-background">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
