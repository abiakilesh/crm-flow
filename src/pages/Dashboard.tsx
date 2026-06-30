import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Phone, DollarSign, UserCheck, Briefcase } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

export default function Dashboard() {
  const { role, user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", role, user?.id],
    queryFn: async () => {
      const [leadsRes, callsRes, financeRes, profilesRes, rolesRes] = await Promise.all([
        supabase.from("leads").select("id, status, assigned_to, created_at"),
        supabase.from("call_logs").select("id, status, call_date, caller_id"),
        role === "admin" ? supabase.from("finance").select("total_amount, share_amount") : Promise.resolve({ data: [] as any[] }),
        supabase.from("profiles").select("user_id, full_name, manager_id"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const leads = leadsRes.data || [];
      const calls = callsRes.data || [];
      const finance = financeRes.data || [];
      const roleMap = new Map((rolesRes.data || []).map((r: any) => [r.user_id, r.role]));
      const profiles = profilesRes.data || [];
      const totalAmount = finance.reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);
      const shareAmount = finance.reduce((s: number, r: any) => s + Number(r.share_amount || 0), 0);
      const managers = profiles.filter((p: any) => roleMap.get(p.user_id) === "manager");
      const salesTeam = profiles.filter((p: any) => roleMap.get(p.user_id) === "sales");

      // Calls last 7 days
      const today = new Date(); today.setHours(0,0,0,0);
      const days: { day: string; calls: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today); d.setDate(today.getDate() - i);
        const key = d.toISOString().slice(0,10);
        const label = d.toLocaleDateString(undefined, { weekday: "short" });
        days.push({ day: label, calls: calls.filter((c: any) => c.call_date === key).length });
      }

      return {
        leads: leads.length,
        calls: calls.length,
        totalAmount,
        profit: totalAmount - shareAmount,
        managers: managers.length,
        sales: salesTeam.length,
        newLeads: leads.filter((l: any) => l.status === "New").length,
        closedLeads: leads.filter((l: any) => l.status === "Closed").length,
        completedCalls: calls.filter((c: any) => c.status === "completed").length,
        myAssignedLeads: leads.filter((l: any) => l.assigned_to === user?.id).length,
        myCalls: calls.filter((c: any) => c.caller_id === user?.id).length,
        callsByDay: days,
      };
    },
    enabled: !!role,
  });

  const adminCards = [
    { title: "Managers", value: stats?.managers ?? 0, icon: UserCheck, gradient: "from-amber-500/10 to-amber-600/5" },
    { title: "Sales Executives", value: stats?.sales ?? 0, icon: Briefcase, gradient: "from-emerald-500/10 to-emerald-600/5" },
    { title: "Total Leads", value: stats?.leads ?? 0, icon: Users, gradient: "from-blue-500/10 to-blue-600/5" },
    { title: "Total Calls", value: stats?.calls ?? 0, icon: Phone, gradient: "from-violet-500/10 to-violet-600/5" },
  ];
  const managerCards = [
    { title: "Team Size", value: stats?.sales ?? 0, icon: Briefcase, gradient: "from-emerald-500/10 to-emerald-600/5" },
    { title: "Total Leads", value: stats?.leads ?? 0, icon: Users, gradient: "from-blue-500/10 to-blue-600/5" },
    { title: "Total Calls", value: stats?.calls ?? 0, icon: Phone, gradient: "from-amber-500/10 to-amber-600/5" },
    { title: "Closed Leads", value: stats?.closedLeads ?? 0, icon: TrendingUp, gradient: "from-violet-500/10 to-violet-600/5" },
  ];
  const salesCards = [
    { title: "My Assigned Leads", value: stats?.myAssignedLeads ?? 0, icon: Users, gradient: "from-blue-500/10 to-blue-600/5" },
    { title: "My Calls", value: stats?.myCalls ?? 0, icon: Phone, gradient: "from-amber-500/10 to-amber-600/5" },
    { title: "Completed Calls", value: stats?.completedCalls ?? 0, icon: TrendingUp, gradient: "from-emerald-500/10 to-emerald-600/5" },
    { title: "Closed Leads", value: stats?.closedLeads ?? 0, icon: UserCheck, gradient: "from-violet-500/10 to-violet-600/5" },
  ];
  const cards = role === "admin" ? adminCards : role === "manager" ? managerCards : salesCards;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-foreground capitalize">{role} Dashboard</h2>
        <p className="text-muted-foreground mt-1">Overview of your CRM metrics</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} className={`bg-gradient-to-br ${card.gradient} border-0 shadow-sm hover:shadow-md transition-shadow`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <div className="w-9 h-9 rounded-lg bg-background/80 flex items-center justify-center">
                <card.icon className="h-4 w-4 text-foreground/70" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-extrabold tracking-tight">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Calls — Last 7 Days</CardTitle></CardHeader>
        <CardContent className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats?.callsByDay || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="calls" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {role === "admin" && stats && (
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-0 shadow-sm max-w-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              Profit <span className="text-[10px] uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">Admin</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-extrabold tracking-tight text-emerald-600">₹{stats.profit.toLocaleString()}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
