import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Phone, UserCheck, Briefcase, MapPin, Clock, FileUp, Circle, ListChecks } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

export default function Dashboard() {
  const { role, user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", role, user?.id],
    queryFn: async () => {
      const [leadsRes, callsRes, financeRes, profilesRes, rolesRes, visitsRes, uploadsRes, sessionsRes] = await Promise.all([
        supabase.from("leads").select("id, status, assigned_to, created_at"),
        supabase.from("call_logs").select("id, status, call_date, caller_id, duration_minutes, follow_up_at"),
        role === "admin" ? supabase.from("finance").select("total_amount, share_amount") : Promise.resolve({ data: [] as any[] }),
        supabase.from("profiles").select("user_id, full_name, manager_id"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("site_visits").select("id, sales_id, visit_date"),
        supabase.from("lead_uploads").select("id, uploaded_by, total_count, created_at"),
        supabase.from("user_sessions").select("user_id, login_at, logout_at").order("login_at", { ascending: false }),
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
      const visits = visitsRes.data || [];
      const uploads = uploadsRes.data || [];
      const sessions = sessionsRes.data || [];
      const today = new Date().toISOString().slice(0, 10);
      const latest = new Map<string, any>();
      sessions.forEach((s: any) => { if (!latest.has(s.user_id)) latest.set(s.user_id, s); });
      const online = salesTeam.filter((s: any) => { const x = latest.get(s.user_id); return x && !x.logout_at; }).length;

      // Calls last 7 days
      const t0 = new Date(); t0.setHours(0,0,0,0);
      const days: { day: string; calls: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(t0); d.setDate(t0.getDate() - i);
        const key = d.toISOString().slice(0,10);
        const label = d.toLocaleDateString(undefined, { weekday: "short" });
        days.push({ day: label, calls: calls.filter((c: any) => c.call_date === key).length });
      }

      const monthStart = new Date(); monthStart.setDate(1);
      const monthClosed = leads.filter((l: any) => l.status === "Closed" && new Date(l.created_at) >= monthStart).length;
      const monthLeads = Math.max(leads.filter((l: any) => new Date(l.created_at) >= monthStart).length, 1);

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
        todayCalls: calls.filter((c: any) => c.call_date === today).length,
        todayTalkTime: calls.filter((c: any) => c.call_date === today).reduce((s: number, c: any) => s + (c.duration_minutes || 0), 0),
        todayVisits: visits.filter((v: any) => v.visit_date === today).length,
        todayFollowups: calls.filter((c: any) => c.follow_up_at?.slice(0, 10) === today).length,
        todayUploads: uploads.filter((u: any) => u.created_at?.slice(0, 10) === today).reduce((s: number, u: any) => s + (u.total_count || 0), 0),
        todayAssigned: leads.filter((l: any) => l.assigned_to && l.created_at?.slice(0, 10) === today).length,
        todayConversions: leads.filter((l: any) => l.status === "Closed" && l.created_at?.slice(0, 10) === today).length,
        pending: leads.filter((l: any) => l.status !== "Closed").length,
        online, offline: salesTeam.length - online,
        monthlyRate: Math.round((monthClosed / monthLeads) * 100),
      };
    },
    enabled: !!role,
  });

  const adminCards = [
    { title: "Managers", value: stats?.managers ?? 0, icon: UserCheck, gradient: "from-amber-500/10 to-amber-600/5" },
    { title: "Sales Executives", value: stats?.sales ?? 0, icon: Briefcase, gradient: "from-emerald-500/10 to-emerald-600/5" },
    { title: "Total Leads", value: stats?.leads ?? 0, icon: Users, gradient: "from-blue-500/10 to-blue-600/5" },
    { title: "Today's Uploads", value: stats?.todayUploads ?? 0, icon: FileUp, gradient: "from-indigo-500/10 to-indigo-600/5" },
    { title: "Today's Assigned", value: stats?.todayAssigned ?? 0, icon: ListChecks, gradient: "from-cyan-500/10 to-cyan-600/5" },
    { title: "Today's Calls", value: stats?.todayCalls ?? 0, icon: Phone, gradient: "from-violet-500/10 to-violet-600/5" },
    { title: "Today's Talk Time", value: (stats?.todayTalkTime ?? 0) + "m", icon: Clock, gradient: "from-rose-500/10 to-rose-600/5" },
    { title: "Today's Follow-ups", value: stats?.todayFollowups ?? 0, icon: ListChecks, gradient: "from-orange-500/10 to-orange-600/5" },
    { title: "Today's Site Visits", value: stats?.todayVisits ?? 0, icon: MapPin, gradient: "from-teal-500/10 to-teal-600/5" },
    { title: "Today's Conversions", value: stats?.todayConversions ?? 0, icon: TrendingUp, gradient: "from-emerald-500/10 to-emerald-600/5" },
    { title: "Pending Leads", value: stats?.pending ?? 0, icon: Users, gradient: "from-yellow-500/10 to-yellow-600/5" },
    { title: "Online / Offline", value: `${stats?.online ?? 0} / ${stats?.offline ?? 0}`, icon: Circle, gradient: "from-lime-500/10 to-lime-600/5" },
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
