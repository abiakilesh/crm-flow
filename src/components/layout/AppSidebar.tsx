import { LayoutDashboard, Users, TrendingUp, DollarSign, Phone, BarChart3, Settings, LogOut, Briefcase } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, roles: ["admin", "manager", "member"] as const },
  { title: "Leads", url: "/leads", icon: Users, roles: ["admin", "manager", "member"] as const },
  { title: "Sales", url: "/sales", icon: TrendingUp, roles: ["admin", "manager", "member"] as const },
  { title: "Finance", url: "/finance", icon: DollarSign, roles: ["admin", "manager", "member"] as const },
  { title: "Call Tracking", url: "/call-tracking", icon: Phone, roles: ["admin", "manager", "member"] as const },
  { title: "Analytics", url: "/analytics", icon: BarChart3, roles: ["admin", "manager", "member"] as const },
  { title: "Settings", url: "/settings", icon: Settings, roles: ["admin"] as const },
];

const roleBadgeColors: Record<string, string> = {
  admin: "bg-red-500/20 text-red-300 border-red-500/30",
  manager: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  member: "bg-green-500/20 text-green-300 border-green-500/30",
};

export function AppSidebar() {
  const { role, profile, signOut } = useAuth();

  const filteredItems = navItems.filter((item) => role && (item.roles as readonly string[]).includes(role));

  return (
    <Sidebar>
      <SidebarHeader className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Briefcase className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h2 className="text-base font-bold text-sidebar-foreground tracking-tight">Job CRM</h2>
          </div>
        </div>
        {profile && (
          <div className="mt-4 px-1">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{profile.full_name || profile.email}</p>
            <Badge variant="outline" className={`mt-1.5 text-[10px] uppercase tracking-wider font-semibold border ${roleBadgeColors[role || "member"]}`}>
              {role}
            </Badge>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 font-semibold px-3">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === "/dashboard"} className="hover:bg-sidebar-accent transition-colors rounded-lg" activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold">
                      <item.icon className="mr-3 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent" onClick={signOut}>
          <LogOut className="mr-3 h-4 w-4" /> Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
