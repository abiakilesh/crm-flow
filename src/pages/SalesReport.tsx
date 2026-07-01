import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const today = () => new Date().toISOString().slice(0, 10);

export default function SalesReport() {
  const { id } = useParams();
  const { data } = useQuery({
    queryKey: ["sales-report", id],
    enabled: !!id,
    queryFn: async () => {
      const [profile, leads, calls, visits] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", id!).single(),
        supabase.from("leads").select("*").eq("assigned_to", id!),
        supabase.from("call_logs").select("*").eq("caller_id", id!).order("call_date", { ascending: false }),
        supabase.from("site_visits").select("*").eq("sales_id", id!),
      ]);
      const t = today();
      const callsToday = (calls.data || []).filter((c: any) => c.call_date === t);
      const connected = callsToday.filter((c: any) => c.status === "completed");
      const missed = callsToday.filter((c: any) => c.status === "missed");
      return {
        profile: profile.data,
        calls: calls.data || [],
        stats: {
          totalCalls: callsToday.length,
          connected: connected.length,
          missed: missed.length,
          talkTime: callsToday.reduce((s: number, c: any) => s + (c.duration_minutes || 0), 0),
          avgDuration: connected.length ? Math.round(connected.reduce((s: number, c: any) => s + (c.duration_minutes || 0), 0) / connected.length) : 0,
          followups: (calls.data || []).filter((c: any) => c.follow_up_at?.slice(0, 10) === t).length,
          meetings: (visits.data || []).filter((v: any) => v.visit_date === t).length,
          siteVisits: (visits.data || []).filter((v: any) => v.visit_date === t).length,
          conversions: (leads.data || []).filter((l: any) => l.status === "Closed").length,
          pending: (leads.data || []).filter((l: any) => l.status !== "Closed").length,
        },
      };
    },
  });

  const playRecording = async (path: string) => {
    const { data, error } = await supabase.storage.from("call-recordings").createSignedUrl(path, 3600);
    if (error) { toast.error(error.message); return; }
    window.open(data.signedUrl, "_blank");
  };

  const s = data?.stats;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold">{data?.profile?.full_name || "Sales Executive"} — Report</h2>
        <p className="text-sm text-muted-foreground mt-1">Today's performance snapshot</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {[
          { l: "Total Calls", v: s?.totalCalls ?? 0 },
          { l: "Connected", v: s?.connected ?? 0 },
          { l: "Missed", v: s?.missed ?? 0 },
          { l: "Talk Time", v: (s?.talkTime ?? 0) + "m" },
          { l: "Avg Duration", v: (s?.avgDuration ?? 0) + "m" },
          { l: "Follow-ups", v: s?.followups ?? 0 },
          { l: "Meetings", v: s?.meetings ?? 0 },
          { l: "Site Visits", v: s?.siteVisits ?? 0 },
          { l: "Conversions", v: s?.conversions ?? 0 },
          { l: "Pending Leads", v: s?.pending ?? 0 },
        ].map((c) => (
          <Card key={c.l}><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">{c.l}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{c.v}</p></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Call History</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Feedback</TableHead>
                <TableHead>Recording</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.calls || []).map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>{c.call_date}</TableCell>
                  <TableCell>{c.call_time}</TableCell>
                  <TableCell>{c.customer_name || "—"}</TableCell>
                  <TableCell>{c.phone_number}</TableCell>
                  <TableCell>{c.duration_minutes}m</TableCell>
                  <TableCell>{c.status}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{c.feedback || "—"}</TableCell>
                  <TableCell>
                    {c.recording_url ? (
                      <Button size="sm" variant="outline" onClick={() => playRecording(c.recording_url)}>Play/Download</Button>
                    ) : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {(data?.calls || []).length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No calls yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}