import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Plus } from "lucide-react";
import * as XLSX from "xlsx";

export default function LeadUploadHistory() {
  const { role, user } = useAuth();
  const qc = useQueryClient();
  const [dateFilter, setDateFilter] = useState("");
  const [managerFilter, setManagerFilter] = useState("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [preview, setPreview] = useState<{ customer_name: string; mobile: string; place: string }[]>([]);
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data } = useQuery({
    queryKey: ["upload-history"],
    queryFn: async () => {
      const [uploads, profiles, roles, leads] = await Promise.all([
        supabase.from("lead_uploads").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("user_id, full_name, email, manager_id"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("leads").select("id, upload_batch_id, assigned_to"),
      ]);
      const nameMap = new Map((profiles.data || []).map((p: any) => [p.user_id, p.full_name || p.email]));
      return (uploads.data || []).map((u: any) => {
        const batchLeads = (leads.data || []).filter((l: any) => l.upload_batch_id === u.id);
        const assigned = batchLeads.filter((l: any) => l.assigned_to);
        const bySales = new Map<string, number>();
        assigned.forEach((l: any) => bySales.set(l.assigned_to, (bySales.get(l.assigned_to) || 0) + 1));
        return {
          ...u,
          manager_name: nameMap.get(u.uploaded_by) || "—",
          assigned_count: assigned.length,
          remaining: (u.total_count || batchLeads.length) - assigned.length,
          assignments: Array.from(bySales.entries()).map(([sid, n]) => `${nameMap.get(sid) || "—"}: ${n}`).join(", "),
        };
      });
    },
  });

  const { data: managers } = useQuery({
    queryKey: ["managers-list"],
    queryFn: async () => {
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, email"),
        supabase.from("user_roles").select("user_id, role").eq("role", "manager"),
      ]);
      const ids = new Set((r.data || []).map((x: any) => x.user_id));
      return (p.data || []).filter((x: any) => ids.has(x.user_id));
    },
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]]);
      const parsed = rows.map((r: any) => ({
        customer_name: String(r["Name"] || r["Customer Name"] || r["name"] || "").trim(),
        mobile: String(r["Phone"] || r["Mobile"] || r["phone"] || "").trim(),
        place: String(r["Place"] || r["City"] || r["place"] || "").trim(),
      })).filter((x) => x.customer_name && x.mobile);
      setPreview(parsed);
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const upload = useMutation({
    mutationFn: async () => {
      if (preview.length === 0) throw new Error("No rows to upload");
      setBusy(true);
      const { data: existing } = await supabase.from("leads").select("mobile");
      const existingSet = new Set((existing || []).map((l: any) => (l.mobile || "").replace(/\D/g, "")));
      const seen = new Set<string>();
      const fresh = preview.filter((r) => {
        const n = r.mobile.replace(/\D/g, "");
        if (existingSet.has(n) || seen.has(n)) return false;
        seen.add(n); return true;
      });
      if (fresh.length === 0) throw new Error("All rows are duplicates");
      const { data: batch, error: bErr } = await supabase.from("lead_uploads").insert({
        uploaded_by: user!.id, source: source || null, total_count: fresh.length,
      }).select("id").single();
      if (bErr) throw bErr;
      const rows = fresh.map((r) => ({
        customer_name: r.customer_name.substring(0, 255),
        mobile: r.mobile.substring(0, 20),
        place: r.place.substring(0, 255),
        source: source || null,
        upload_batch_id: batch.id,
        lead_by: user!.id, created_by: user!.id,
      }));
      const { error } = await supabase.from("leads").insert(rows);
      if (error) throw error;
      return { count: fresh.length, skipped: preview.length - fresh.length };
    },
    onSuccess: (r) => {
      toast.success(`Uploaded ${r.count} leads (${r.skipped} duplicates skipped)`);
      setPreview([]); setSource(""); setUploadOpen(false);
      qc.invalidateQueries({ queryKey: ["upload-history"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e: any) => toast.error(e.message),
    onSettled: () => setBusy(false),
  });

  const filtered = (data || []).filter((u: any) => {
    if (dateFilter && !u.created_at?.startsWith(dateFilter)) return false;
    if (managerFilter !== "all" && u.uploaded_by !== managerFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-3xl font-extrabold">Lead Upload History</h2>
          <p className="text-muted-foreground text-sm mt-1">Track every batch upload and assignment</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-[160px]" />
          {role === "admin" && (
            <Select value={managerFilter} onValueChange={setManagerFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Manager" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Managers</SelectItem>
                {(managers || []).map((m: any) => (
                  <SelectItem key={m.user_id} value={m.user_id}>{m.full_name || m.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {(role === "manager" || role === "admin") && (
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Upload</Button></DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Upload Leads (Excel/CSV)</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">Columns: Name, Phone (required), Place (optional). Duplicates auto-skipped.</p>
                  <Input placeholder="Source (e.g. Facebook Ads, Referral)" value={source} onChange={(e) => setSource(e.target.value)} />
                  <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
                  <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />{preview.length ? `${preview.length} rows loaded` : "Choose File"}
                  </Button>
                  {preview.length > 0 && (
                    <Button className="w-full" disabled={busy} onClick={() => upload.mutate()}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />{busy ? "Uploading..." : `Upload ${preview.length} Leads`}
                    </Button>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Upload Date</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead>Remaining</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No uploads yet</TableCell></TableRow>
            ) : filtered.map((u: any) => (
              <TableRow key={u.id}>
                <TableCell>{u.created_at?.slice(0, 10)}</TableCell>
                <TableCell className="font-medium">{u.manager_name}</TableCell>
                <TableCell>{u.source || "—"}</TableCell>
                <TableCell>{u.total_count}</TableCell>
                <TableCell>{u.assigned_count}</TableCell>
                <TableCell>{u.remaining}</TableCell>
                <TableCell className="max-w-[280px] text-xs">{u.assignments || "—"}</TableCell>
                <TableCell>{u.remaining <= 0 ? "Fully Assigned" : "Pending"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}