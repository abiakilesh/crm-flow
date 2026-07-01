import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FileBarChart } from "lucide-react";

const today = () => new Date().toISOString().slice(0, 10);

export default function EmployeeSales() {
  const { data, isLoading } = useQuery({
    queryKey: ["employee-sales"],
    queryFn: async () => {
      const [profiles, roles, leads, calls, visits, sessions] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("leads").select("id, assigned_to, status"),
        supabase.from("call_logs").select("id, caller_id, duration_minutes, call_date, status, follow_up_at"),
        supabase.from("site_visits").select("id, sales_id, visit_date"),
        supabase.from("user_sessions").select("user_id, login_at, logout_at").order("login_at", { ascending: false }),
      ]);
      const roleMap = new Map((roles.data || []).map((r: any) => [r.user_id, r.role]));
      const sales = (profiles.data || []).filter((p: any) => roleMap.get(p.user_id) === "sales");
      const managerName = new Map((profiles.data || []).filter((p: any) => roleMap.get(p.user_id) === "manager").map((m: any) => [m.user_id, m.full_name || m.email]));
      const t = today();
      const latestSession = new Map<string, any>();
      (sessions.data || []).forEach((s: any) => {
        if (!latestSession.has(s.user_id)) latestSession.set(s.user_id, s);
      });
      return sales.map((s: any) => {
        const myLeads = (leads.data || []).filter((l: any) => l.assigned_to === s.user_id);
        const myCalls = (calls.data || []).filter((c: any) => c.caller_id === s.user_id);
        const myCallsToday = myCalls.filter((c: any) => c.call_date === t);
        const myVisitsToday = (visits.data || []).filter((v: any) => v.sales_id === s.user_id && v.visit_date === t);
        const converted = myLeads.filter((l: any) => l.status === "Closed").length;
        const total = Math.max(myLeads.length, 1);
        const sess = latestSession.get(s.user_id);
        const login = sess?.login_at ? new Date(sess.login_at) : null;
        const logout = sess?.logout_at ? new Date(sess.logout_at) : null;
        const workingMs = login ? ((logout || new Date()).getTime() - login.getTime()) : 0;
        return {
          ...s,
          manager_name: s.manager_id ? managerName.get(s.manager_id) || "—" : "—",
          login_time: login ? login.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—",
          logout_time: logout ? logout.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : (login && !logout ? "Online" : "—"),
          working_hours: login ? `${(workingMs / 3600000).toFixed(1)}h` : "—",
          today_calls: myCallsToday.length,
          today_talktime: myCallsToday.reduce((s: number, c: any) => s + (c.duration_minutes || 0), 0),
          today_followups: myCalls.filter((c: any) => c.follow_up_at?.slice(0, 10) === t).length,
          today_visits: myVisitsToday.length,
          converted,
          pending: myLeads.filter((l: any) => l.status !== "Closed").length,
          performance: Math.round((converted / total) * 100),
          online: !!(login && !logout),
        };
      });
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight">Sales Executives</h2>
        <p className="text-muted-foreground text-sm mt-1">All sales executives across teams</p>
      </div>
      <div className="rounded-lg border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Login</TableHead>
              <TableHead>Logout</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Calls</TableHead>
              <TableHead>Talk Time</TableHead>
              <TableHead>Follow-ups</TableHead>
              <TableHead>Site Visits</TableHead>
              <TableHead>Converted</TableHead>
              <TableHead>Pending</TableHead>
              <TableHead>Perf%</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={15} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : (data || []).length === 0 ? (
              <TableRow><TableCell colSpan={15} className="text-center py-8 text-muted-foreground">No sales executives yet</TableCell></TableRow>
            ) : (data || []).map((s: any) => (
              <TableRow key={s.user_id}>
                <TableCell className="font-mono text-[10px]">{s.user_id.slice(0, 6)}</TableCell>
                <TableCell className="font-medium">{s.full_name || "—"}</TableCell>
                <TableCell>{s.manager_name}</TableCell>
                <TableCell>{s.login_time}</TableCell>
                <TableCell>{s.logout_time}</TableCell>
                <TableCell>{s.working_hours}</TableCell>
                <TableCell>{s.today_calls}</TableCell>
                <TableCell>{s.today_talktime}m</TableCell>
                <TableCell>{s.today_followups}</TableCell>
                <TableCell>{s.today_visits}</TableCell>
                <TableCell>{s.converted}</TableCell>
                <TableCell>{s.pending}</TableCell>
                <TableCell>{s.performance}%</TableCell>
                <TableCell>
                  <Badge variant={s.online ? "default" : "secondary"}>{s.online ? "Online" : "Offline"}</Badge>
                </TableCell>
                <TableCell>
                  <Link to={`/employee/sales/${s.user_id}`}>
                    <Button size="sm" variant="outline"><FileBarChart className="h-3.5 w-3.5 mr-1" />Report</Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}