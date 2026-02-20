import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ProjectFilter } from "@/components/shared/ProjectFilter";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";

export default function CallTracking() {
  const { role } = useAuth();
  const [projectFilter, setProjectFilter] = useState("all");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["call_logs", projectFilter],
    queryFn: async () => {
      let q = supabase.from("call_logs").select("*, projects(name)").order("call_date", { ascending: false });
      if (projectFilter !== "all") q = q.eq("project_id", projectFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const exportCSV = () => {
    if (!logs?.length) return;
    const headers = ["Date", "Time", "Duration (min)", "Phone", "Status", "Project", "Caller", "Notes"];
    const rows = logs.map((l) => [
      l.call_date, l.call_time, l.duration_minutes, l.phone_number, l.status,
      (l as any).projects?.name || "", "", l.notes,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "call_logs.csv";
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-foreground">Call Tracking</h2>
        <div className="flex items-center gap-2">
          <ProjectFilter value={projectFilter} onChange={setProjectFilter} />
          <Button variant="outline" onClick={exportCSV}><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>S.No</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Caller</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : (logs || []).length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No call logs</TableCell></TableRow>
            ) : (
              (logs || []).map((log, i) => (
                <TableRow key={log.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{log.call_date}</TableCell>
                  <TableCell>{log.call_time}</TableCell>
                  <TableCell>{log.duration_minutes} min</TableCell>
                  <TableCell>{log.phone_number}</TableCell>
                  <TableCell>
                    <Badge variant={log.status === "completed" ? "default" : "destructive"}>{log.status}</Badge>
                  </TableCell>
                  <TableCell>{(log as any).projects?.name || "—"}</TableCell>
                  <TableCell>—</TableCell>
                  <TableCell className="max-w-[200px] truncate">{log.notes}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
