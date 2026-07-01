import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ProjectFilter } from "@/components/shared/ProjectFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Plus, Upload } from "lucide-react";
import { toast } from "sonner";

export default function CallTracking() {
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  const [projectFilter, setProjectFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [playUrls, setPlayUrls] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    customer_name: "",
    phone_number: "",
    call_date: new Date().toISOString().slice(0, 10),
    call_time: new Date().toTimeString().slice(0, 5),
    duration_minutes: 0,
    status: "completed",
    feedback: "",
    notes: "",
  });
  const [recordingFile, setRecordingFile] = useState<File | null>(null);

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

  const filteredLogs = (logs || []).filter((l: any) => {
    const s = search.toLowerCase();
    if (s && !(`${l.customer_name || ""} ${l.phone_number || ""}`).toLowerCase().includes(s)) return false;
    if (dateFrom && l.call_date < dateFrom) return false;
    if (dateTo && l.call_date > dateTo) return false;
    return true;
  });

  const saveCall = async () => {
    if (!form.customer_name || !form.phone_number) {
      toast.error("Customer name and phone are required");
      return;
    }
    setSaving(true);
    try {
      let recording_url: string | null = null;
      if (recordingFile) {
        const path = `${user?.id}/${Date.now()}_${recordingFile.name}`;
        const { error: upErr } = await supabase.storage.from("call-recordings").upload(path, recordingFile);
        if (upErr) throw upErr;
        recording_url = path;
      }
      const { error } = await supabase.from("call_logs").insert({
        caller_id: user?.id,
        customer_name: form.customer_name,
        phone_number: form.phone_number,
        call_date: form.call_date,
        call_time: form.call_time,
        duration_minutes: Number(form.duration_minutes) || 0,
        status: form.status,
        feedback: form.feedback,
        notes: form.notes,
        recording_url,
      });
      if (error) throw error;
      toast.success("Call logged");
      setDialogOpen(false);
      setRecordingFile(null);
      setForm({ customer_name: "", phone_number: "", call_date: new Date().toISOString().slice(0, 10), call_time: new Date().toTimeString().slice(0, 5), duration_minutes: 0, status: "completed", feedback: "", notes: "" });
      queryClient.invalidateQueries({ queryKey: ["call_logs"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const playRecording = async (logId: string, path: string) => {
    if (playUrls[logId]) return;
    const { data, error } = await supabase.storage.from("call-recordings").createSignedUrl(path, 3600);
    if (error) { toast.error(error.message); return; }
    setPlayUrls((p) => ({ ...p, [logId]: data.signedUrl }));
  };

  const exportCSV = () => {
    if (!logs?.length) return;
    const headers = ["Date", "Time", "Duration (min)", "Customer", "Phone", "Status", "Feedback", "Notes"];
    const rows = logs.map((l) => [
      l.call_date, l.call_time, l.duration_minutes, l.customer_name || "", l.phone_number, l.status, l.feedback || "", (l.notes || "").replace(/,/g, ";"),
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
        <h2 className="text-2xl font-bold text-foreground">Call Log</h2>
        <div className="flex items-center gap-2">
          <Input placeholder="Search customer or phone" value={search} onChange={(e) => setSearch(e.target.value)} className="w-[220px]" />
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px]" />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px]" />
          <ProjectFilter value={projectFilter} onChange={setProjectFilter} />
          <Button variant="outline" onClick={exportCSV}><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
          {(role === "sales" || role === "manager" || role === "admin") && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Log Call</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Log Call</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Customer Name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
                  <Input placeholder="Phone Number" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input type="date" value={form.call_date} onChange={(e) => setForm({ ...form, call_date: e.target.value })} />
                    <Input type="time" value={form.call_time} onChange={(e) => setForm({ ...form, call_time: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input type="number" min={0} placeholder="Duration (min)" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="missed">Missed</SelectItem>
                        <SelectItem value="follow-up">Follow-up</SelectItem>
                        <SelectItem value="not-interested">Not Interested</SelectItem>
                        <SelectItem value="interested">Interested</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea placeholder="Feedback" value={form.feedback} onChange={(e) => setForm({ ...form, feedback: e.target.value })} />
                  <Textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={(e) => setRecordingFile(e.target.files?.[0] || null)} />
                  <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" /> {recordingFile ? recordingFile.name : "Attach Recording (optional)"}
                  </Button>
                  <Button className="w-full" onClick={saveCall} disabled={saving}>{saving ? "Saving..." : "Save Call"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>S.No</TableHead>
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
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filteredLogs.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No call logs</TableCell></TableRow>
            ) : (
              filteredLogs.map((log, i) => (
                <TableRow key={log.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{log.call_date}</TableCell>
                  <TableCell>{log.call_time}</TableCell>
                  <TableCell className="font-medium">{(log as any).customer_name || "—"}</TableCell>
                  <TableCell>{log.phone_number}</TableCell>
                  <TableCell>{log.duration_minutes} min</TableCell>
                  <TableCell>
                    <Badge variant={log.status === "completed" ? "default" : "destructive"}>{log.status}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{(log as any).feedback || "—"}</TableCell>
                  <TableCell>
                    {(log as any).recording_url ? (
                      playUrls[log.id] ? (
                        <audio controls src={playUrls[log.id]} className="h-8" />
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => playRecording(log.id, (log as any).recording_url)}>Play</Button>
                      )
                    ) : (
                      <span className="text-muted-foreground text-xs">None</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
