import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Eye } from "lucide-react";

const today = () => new Date().toISOString().slice(0, 10);

export default function EmployeeManagers() {
  const { data, isLoading } = useQuery({
    queryKey: ["employee-managers"],
    queryFn: async () => {
      const [profiles, roles, leads, calls, uploads, visits] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("leads").select("id, assigned_to, created_by, upload_batch_id, status, created_at"),
        supabase.from("call_logs").select("id, caller_id, duration_minutes, call_date, status, follow_up_at"),
        supabase.from("lead_uploads").select("id, uploaded_by, total_count, created_at"),
        supabase.from("site_visits").select("id, sales_id, visit_date"),
      ]);
      const roleMap = new Map((roles.data || []).map((r: any) => [r.user_id, r.role]));
      const managers = (profiles.data || []).filter((p: any) => roleMap.get(p.user_id) === "manager");
      const salesByManager = new Map<string, string[]>();
      (profiles.data || []).forEach((p: any) => {
        if (roleMap.get(p.user_id) === "sales" && p.manager_id) {
          const arr = salesByManager.get(p.manager_id) || [];
          arr.push(p.user_id); salesByManager.set(p.manager_id, arr);
        }
      });
      const t = today();
      return managers.map((m: any) => {
        const team = salesByManager.get(m.user_id) || [];
        const teamPlus = [m.user_id, ...team];
        const mUploads = (uploads.data || []).filter((u: any) => u.uploaded_by === m.user_id);
        const mLeadsAll = (leads.data || []).filter((l: any) => team.includes(l.assigned_to) || l.created_by === m.user_id);
        const mCallsToday = (calls.data || []).filter((c: any) => teamPlus.includes(c.caller_id) && c.call_date === t);
        return {
          ...m,
          team_size: team.length,
          total_uploads: mUploads.reduce((s: number, u: any) => s + (u.total_count || 0), 0),
          today_uploads: mUploads.filter((u: any) => u.created_at?.slice(0, 10) === t).reduce((s: number, u: any) => s + (u.total_count || 0), 0),
          assigned_leads: mLeadsAll.filter((l: any) => l.assigned_to).length,
          today_calls: mCallsToday.length,
          today_talktime: mCallsToday.reduce((s: number, c: any) => s + (c.duration_minutes || 0), 0),
          today_followups: (calls.data || []).filter((c: any) => teamPlus.includes(c.caller_id) && c.follow_up_at?.slice(0, 10) === t).length,
          today_visits: (visits.data || []).filter((v: any) => team.includes(v.sales_id) && v.visit_date === t).length,
          conversions: mLeadsAll.filter((l: any) => l.status === "Closed").length,
        };
      });
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight">Managers</h2>
        <p className="text-muted-foreground text-sm mt-1">All managers and their teams</p>
      </div>
      <div className="rounded-lg border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Manager</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Total Uploads</TableHead>
              <TableHead>Today Uploads</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead>Today Calls</TableHead>
              <TableHead>Talk Time</TableHead>
              <TableHead>Follow-ups</TableHead>
              <TableHead>Site Visits</TableHead>
              <TableHead>Conversions</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={14} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : (data || []).length === 0 ? (
              <TableRow><TableCell colSpan={14} className="text-center py-8 text-muted-foreground">No managers yet</TableCell></TableRow>
            ) : (data || []).map((m: any) => (
              <TableRow key={m.user_id}>
                <TableCell className="font-medium">{m.full_name || "—"}</TableCell>
                <TableCell className="text-xs">{m.email}</TableCell>
                <TableCell>{m.phone || "—"}</TableCell>
                <TableCell>{m.team_size}/5</TableCell>
                <TableCell>{m.total_uploads}</TableCell>
                <TableCell>{m.today_uploads}</TableCell>
                <TableCell>{m.assigned_leads}</TableCell>
                <TableCell>{m.today_calls}</TableCell>
                <TableCell>{m.today_talktime}m</TableCell>
                <TableCell>{m.today_followups}</TableCell>
                <TableCell>{m.today_visits}</TableCell>
                <TableCell>{m.conversions}</TableCell>
                <TableCell>
                  <Badge variant={m.is_active !== false ? "default" : "secondary"}>{m.is_active !== false ? "Active" : "Disabled"}</Badge>
                </TableCell>
                <TableCell>
                  <Link to={`/employee/managers/${m.user_id}`}>
                    <Button size="sm" variant="outline"><Eye className="h-3.5 w-3.5 mr-1" />View</Button>
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