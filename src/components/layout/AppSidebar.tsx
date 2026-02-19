import { LayoutDashboard, Users, TrendingUp, DollarSign, Phone, BarChart3, Settings, LogOut } from "lucide-react";
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

export function AppSidebar() {
  const { role, profile, signOut } = useAuth();

  const filteredItems = navItems.filter((item) => role && (item.roles as readonly string[]).includes(role));

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <h2 className="text-lg font-bold text-sidebar-foreground">Job CRM</h2>
        {profile && (
          <div className="mt-2">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{profile.full_name || profile.email}</p>
            <Badge variant="secondary" className="mt-1 text-xs capitalize">{role}</Badge>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === "/dashboard"} className="hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
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
        <Button variant="ghost" className="w-full justify-start text-sidebar-foreground" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" /> Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
