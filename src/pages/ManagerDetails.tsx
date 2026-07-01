import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const today = () => new Date().toISOString().slice(0, 10);

export default function ManagerDetails() {
  const { id } = useParams();
  const { data } = useQuery({
    queryKey: ["manager-details", id],
    enabled: !!id,
    queryFn: async () => {
      const [profile, team, uploads, leads, calls, visits] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", id!).single(),
        supabase.from("profiles").select("*").eq("manager_id", id!),
        supabase.from("lead_uploads").select("*").eq("uploaded_by", id!),
        supabase.from("leads").select("*"),
        supabase.from("call_logs").select("*"),
        supabase.from("site_visits").select("*"),
      ]);
      const teamIds = (team.data || []).map((p: any) => p.user_id);
      const t = today();
      const totalUploads = (uploads.data || []).reduce((s: number, u: any) => s + (u.total_count || 0), 0);
      const todayUploads = (uploads.data || []).filter((u: any) => u.created_at?.slice(0, 10) === t).reduce((s: number, u: any) => s + (u.total_count || 0), 0);
      const teamLeads = (leads.data || []).filter((l: any) => teamIds.includes(l.assigned_to));
      return {
        profile: profile.data,
        team: (team.data || []).map((p: any) => {
          const myLeads = (leads.data || []).filter((l: any) => l.assigned_to === p.user_id);
          const myCalls = (calls.data || []).filter((c: any) => c.caller_id === p.user_id && c.call_date === t);
          return {
            ...p,
            assigned_leads: myLeads.length,
            today_calls: myCalls.length,
            talk_time: myCalls.reduce((s: number, c: any) => s + (c.duration_minutes || 0), 0),
            visits: (visits.data || []).filter((v: any) => v.sales_id === p.user_id).length,
            followups: (calls.data || []).filter((c: any) => c.caller_id === p.user_id && c.follow_up_at).length,
            conversions: myLeads.filter((l: any) => l.status === "Closed").length,
            pending: myLeads.filter((l: any) => l.status !== "Closed").length,
          };
        }),
        summary: {
          total_uploads: totalUploads,
          today_uploads: todayUploads,
          assigned_leads: teamLeads.filter((l: any) => l.assigned_to).length,
          pending_leads: teamLeads.filter((l: any) => l.status !== "Closed").length,
          converted_leads: teamLeads.filter((l: any) => l.status === "Closed").length,
        },
      };
    },
  });

  const p = data?.profile;
  const s = data?.summary;

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-extrabold">Manager Details</h2>

      <Card>
        <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <div><div className="text-xs text-muted-foreground">Name</div><div className="font-medium">{p?.full_name || "—"}</div></div>
          <div><div className="text-xs text-muted-foreground">Email</div><div className="font-medium">{p?.email}</div></div>
          <div><div className="text-xs text-muted-foreground">Mobile</div><div className="font-medium">{p?.phone || "—"}</div></div>
          <div><div className="text-xs text-muted-foreground">Joining Date</div><div className="font-medium">{p?.created_at?.slice(0, 10)}</div></div>
          <div><div className="text-xs text-muted-foreground">Status</div><div className="font-medium">{p?.is_active !== false ? "Active" : "Disabled"}</div></div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-5">
        {[
          { l: "Total Uploads", v: s?.total_uploads ?? 0 },
          { l: "Today Uploads", v: s?.today_uploads ?? 0 },
          { l: "Assigned Leads", v: s?.assigned_leads ?? 0 },
          { l: "Pending Leads", v: s?.pending_leads ?? 0 },
          { l: "Converted", v: s?.converted_leads ?? 0 },
        ].map((c) => (
          <Card key={c.l}><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{c.l}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{c.v}</p></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Sales Team</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Today Calls</TableHead>
                <TableHead>Talk Time</TableHead>
                <TableHead>Visits</TableHead>
                <TableHead>Follow-ups</TableHead>
                <TableHead>Conversions</TableHead>
                <TableHead>Pending</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.team || []).map((t: any) => (
                <TableRow key={t.user_id}>
                  <TableCell className="font-medium">{t.full_name || t.email}</TableCell>
                  <TableCell>{t.assigned_leads}</TableCell>
                  <TableCell>{t.today_calls}</TableCell>
                  <TableCell>{t.talk_time}m</TableCell>
                  <TableCell>{t.visits}</TableCell>
                  <TableCell>{t.followups}</TableCell>
                  <TableCell>{t.conversions}</TableCell>
                  <TableCell>{t.pending}</TableCell>
                </TableRow>
              ))}
              {(data?.team || []).length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No sales executives assigned yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}