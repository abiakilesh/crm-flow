import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ProjectFilter } from "@/components/shared/ProjectFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Download, Trash2, Eye, Upload, Pencil, ChevronLeft, ChevronRight, Search } from "lucide-react";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const PAGE_SIZE = 10;

const emptyForm = {
  client_name: "", campaign_name: "", conversion: "", month: "", report_date: "",
  result: "", reach: "", impression: "", cost_per_result: "", total_amount: "",
  client_logo_url: "",
};

export default function MetaLead() {
  const { role, user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [projectFilter, setProjectFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ ...emptyForm });
  const [editUploading, setEditUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const uploadLogo = async (file: File, setTarget: (url: string) => void, setLoading: (v: boolean) => void) => {
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
    setLoading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("client-logos").upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("client-logos").getPublicUrl(fileName);
      setTarget(publicUrl);
      toast.success("Logo uploaded");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  // Auto-filter by client's assigned project
  const { profile } = useAuth();
  const effectiveProjectFilter = role === "client" && profile?.project_id ? profile.project_id : projectFilter;

  const { data: records, isLoading } = useQuery({
    queryKey: ["meta_leads", effectiveProjectFilter],
    queryFn: async () => {
      let q = supabase
        .from("meta_leads" as any)
        .select("*, projects(name)")
        .order("created_at", { ascending: false });
      if (effectiveProjectFilter !== "all") q = q.eq("project_id", effectiveProjectFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const addRecord = useMutation({
    mutationFn: async () => {
      const insert: any = {
        client_name: form.client_name, campaign_name: form.campaign_name,
        conversion: form.conversion, month: form.month, report_date: form.report_date,
        result: parseInt(form.result) || 0, reach: parseInt(form.reach) || 0,
        impression: parseInt(form.impression) || 0,
        cost_per_result: parseFloat(form.cost_per_result) || 0,
        total_amount: parseFloat(form.total_amount) || 0,
        client_logo_url: form.client_logo_url, created_by: user?.id,
      };
      if (projectFilter !== "all") insert.project_id = projectFilter;
      const { error } = await supabase.from("meta_leads" as any).insert(insert);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meta_leads"] });
      toast.success("Meta lead added");
      setForm({ ...emptyForm });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateRecord = useMutation({
    mutationFn: async () => {
      if (!editId) return;
      const { error } = await supabase.from("meta_leads" as any).update({
        client_name: editForm.client_name, campaign_name: editForm.campaign_name,
        conversion: editForm.conversion, month: editForm.month, report_date: editForm.report_date,
        result: parseInt(editForm.result) || 0, reach: parseInt(editForm.reach) || 0,
        impression: parseInt(editForm.impression) || 0,
        cost_per_result: parseFloat(editForm.cost_per_result) || 0,
        total_amount: parseFloat(editForm.total_amount) || 0,
        client_logo_url: editForm.client_logo_url,
      }).eq("id", editId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meta_leads"] });
      toast.success("Record updated");
      setEditOpen(false);
      setEditId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteRecord = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meta_leads" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meta_leads"] });
      toast.success("Record deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (r: any) => {
    setEditId(r.id);
    setEditForm({
      client_name: r.client_name || "", campaign_name: r.campaign_name || "",
      conversion: r.conversion || "", month: r.month || "", report_date: r.report_date || "",
      result: String(r.result || 0), reach: String(r.reach || 0),
      impression: String(r.impression || 0), cost_per_result: String(r.cost_per_result || 0),
      total_amount: String(r.total_amount || 0), client_logo_url: r.client_logo_url || "",
    });
    setEditOpen(true);
  };

  const downloadReport = (record: any) => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext("2d")!;

    const drawReport = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 800, 600);
      ctx.fillStyle = "#6b2121";
      ctx.fillRect(0, 0, 800, 50);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px Arial";
      ctx.fillText("ADS REPORT", 320, 33);
      ctx.fillStyle = "#0081fb";
      ctx.font = "bold 28px Arial";
      ctx.fillText("∞ Meta", 30, 90);
      ctx.fillStyle = "#333333";
      ctx.font = "14px Arial";
      ctx.fillText(`MONTH: ${record.month}`, 30, 130);
      ctx.fillText(`DATE: ${record.report_date}`, 250, 130);
      ctx.fillStyle = "#6b2121";
      ctx.font = "bold 16px Arial";
      ctx.fillText("CLIENT NAME", 30, 165);
      ctx.fillStyle = "#000000";
      ctx.font = "bold 22px Arial";
      ctx.fillText(record.client_name.toUpperCase(), 30, 195);

      const tableY = 220;
      ctx.fillStyle = "#6b2121";
      ctx.fillRect(30, tableY, 350, 30);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px Arial";
      ctx.fillText("CAMPAIGN NAME", 45, tableY + 20);
      ctx.fillText("CONVERSION", 230, tableY + 20);
      ctx.fillStyle = "#d4a0a0";
      ctx.fillRect(30, tableY + 30, 350, 28);
      ctx.fillStyle = "#333333";
      ctx.font = "13px Arial";
      ctx.fillText(record.campaign_name, 45, tableY + 50);
      ctx.fillText(record.conversion, 230, tableY + 50);
      ctx.fillStyle = "#6b2121";
      ctx.fillRect(30, tableY + 75, 350, 28);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px Arial";
      ctx.fillText("RESULT", 160, tableY + 94);
      ctx.fillStyle = "#333333";
      ctx.fillRect(30, tableY + 103, 350, 35);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px Arial";
      ctx.fillText(String(record.result), 180, tableY + 130);

      const metricsY = tableY + 155;
      ctx.fillStyle = "#555";
      ctx.font = "bold 12px Arial";
      ctx.fillText("REACH", 80, metricsY);
      ctx.fillText("IMPRESSION", 230, metricsY);
      ctx.fillStyle = "#6b2121";
      ctx.fillRect(30, metricsY + 8, 160, 35);
      ctx.fillRect(210, metricsY + 8, 170, 35);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px Arial";
      ctx.fillText(String(record.reach), 80, metricsY + 32);
      ctx.fillText(String(record.impression), 260, metricsY + 32);

      const cx = 600, cy = 300, r = 120;
      const total = record.reach + record.impression + record.result;
      const slices = [
        { val: record.reach, color: "#8b0000", label: "REACH" },
        { val: record.impression, color: "#cd5c5c", label: "IMPRESSION" },
        { val: record.result, color: "#e8a0a0", label: "RESULT" },
      ];
      let startAngle = -Math.PI / 2;
      slices.forEach((s) => {
        const angle = (s.val / (total || 1)) * 2 * Math.PI;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, startAngle, startAngle + angle);
        ctx.fillStyle = s.color;
        ctx.fill();
        startAngle += angle;
      });
      slices.forEach((s, i) => {
        const ly = 440 + i * 22;
        ctx.fillStyle = s.color;
        ctx.fillRect(520, ly, 14, 14);
        ctx.fillStyle = "#333";
        ctx.font = "12px Arial";
        ctx.fillText(s.label, 540, ly + 12);
      });

      // Never show cost/total in downloaded report
      triggerDownload();
    };

    const triggerDownload = () => {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `meta_report_${record.client_name}_${record.report_date}.png`;
        a.click();
        URL.revokeObjectURL(url);
      });
    };

    if (record.client_logo_url) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        drawReport();
        const logoSize = 50;
        ctx.drawImage(img, 740 - logoSize, 60, logoSize, logoSize);
        triggerDownload();
      };
      img.onerror = () => drawReport();
      img.src = record.client_logo_url;
    } else {
      drawReport();
    }
  };

  const allRecords = (records || []).filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return r.client_name?.toLowerCase().includes(s) || r.campaign_name?.toLowerCase().includes(s);
  });
  const totalPages = Math.max(1, Math.ceil(allRecords.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = allRecords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const renderFormFields = (f: typeof emptyForm, setF: (v: typeof emptyForm) => void, logoInputRef: React.RefObject<HTMLInputElement>, isUploading: boolean, onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void) => (
    <>
      <div className="space-y-1">
        <label className="text-sm font-medium">Client Logo</label>
        <div className="flex items-center gap-2">
          <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={onUpload} />
          <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={isUploading}>
            <Upload className="mr-2 h-4 w-4" />{isUploading ? "Uploading..." : "Upload Logo"}
          </Button>
          {f.client_logo_url && <img src={f.client_logo_url} alt="Logo" className="h-8 w-8 object-contain rounded border" />}
        </div>
        <Input placeholder="Or paste URL..." value={f.client_logo_url} onChange={(e) => setF({ ...f, client_logo_url: e.target.value })} className="mt-1" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Month *</label>
          <Select value={f.month} onValueChange={(v) => setF({ ...f, month: v })}>
            <SelectTrigger><SelectValue placeholder="Select month" /></SelectTrigger>
            <SelectContent>{MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Date *</label>
          <Input value={f.report_date} onChange={(e) => setF({ ...f, report_date: e.target.value })} placeholder="e.g. 6" required />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Client Name *</label>
        <Input value={f.client_name} onChange={(e) => setF({ ...f, client_name: e.target.value })} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Campaign Name *</label>
          <Input value={f.campaign_name} onChange={(e) => setF({ ...f, campaign_name: e.target.value })} required />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Conversion *</label>
          <Input value={f.conversion} onChange={(e) => setF({ ...f, conversion: e.target.value })} required />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1"><label className="text-sm font-medium">Result</label><Input type="number" value={f.result} onChange={(e) => setF({ ...f, result: e.target.value })} /></div>
        <div className="space-y-1"><label className="text-sm font-medium">Reach</label><Input type="number" value={f.reach} onChange={(e) => setF({ ...f, reach: e.target.value })} /></div>
        <div className="space-y-1"><label className="text-sm font-medium">Impression</label><Input type="number" value={f.impression} onChange={(e) => setF({ ...f, impression: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><label className="text-sm font-medium">Cost Per Result</label><Input type="number" step="0.01" value={f.cost_per_result} onChange={(e) => setF({ ...f, cost_per_result: e.target.value })} /></div>
        <div className="space-y-1"><label className="text-sm font-medium">Total Amount</label><Input type="number" step="0.01" value={f.total_amount} onChange={(e) => setF({ ...f, total_amount: e.target.value })} /></div>
      </div>
    </>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-foreground">Meta Lead</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search client or campaign..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 w-[220px]"
            />
          </div>
          {role === "admin" && <ProjectFilter value={projectFilter} onChange={setProjectFilter} />}
          {role === "admin" && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Add Meta Lead</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Add Meta Lead Report</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); addRecord.mutate(); }} className="space-y-3">
                  {renderFormFields(form, setForm, fileInputRef, uploading, (e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadLogo(file, (url) => setForm({ ...form, client_logo_url: url }), setUploading);
                  })}
                  <Button type="submit" className="w-full" disabled={addRecord.isPending}>
                    {addRecord.isPending ? "Saving..." : "Submit"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* View Report Dialog */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Ads Report</DialogTitle></DialogHeader>
          {viewItem && (
            <div className="space-y-3">
              <div className="bg-[hsl(var(--primary)/0.1)] rounded-lg p-4 space-y-2">
                {viewItem.client_logo_url && <img src={viewItem.client_logo_url} alt="Client Logo" className="h-12 w-auto object-contain" />}
                <p className="text-sm"><span className="font-semibold">Month:</span> {viewItem.month} &nbsp; <span className="font-semibold">Date:</span> {viewItem.report_date}</p>
                <p className="text-lg font-bold">{viewItem.client_name}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><span className="font-semibold">Campaign:</span> {viewItem.campaign_name}</p>
                  <p><span className="font-semibold">Conversion:</span> {viewItem.conversion}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mt-2">
                  <div className="bg-background rounded p-2"><p className="text-xs text-muted-foreground">Result</p><p className="text-xl font-bold">{viewItem.result}</p></div>
                  <div className="bg-background rounded p-2"><p className="text-xs text-muted-foreground">Reach</p><p className="text-xl font-bold">{viewItem.reach}</p></div>
                  <div className="bg-background rounded p-2"><p className="text-xs text-muted-foreground">Impression</p><p className="text-xl font-bold">{viewItem.impression}</p></div>
                </div>
                {role === "admin" && (
                  <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t border-border mt-2">
                    <p><span className="font-semibold">Cost/Result:</span> ₹ {Number(viewItem.cost_per_result).toFixed(2)}</p>
                    <p><span className="font-semibold">Total:</span> ₹ {Number(viewItem.total_amount).toFixed(2)}</p>
                  </div>
                )}
              </div>
              <Button className="w-full" onClick={() => downloadReport(viewItem)}>
                <Download className="mr-2 h-4 w-4" /> Download Report
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Meta Lead</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); updateRecord.mutate(); }} className="space-y-3">
            {renderFormFields(editForm, setEditForm, editFileInputRef, editUploading, (e) => {
              const file = e.target.files?.[0];
              if (file) uploadLogo(file, (url) => setEditForm({ ...editForm, client_logo_url: url }), setEditUploading);
            })}
            <Button type="submit" className="w-full" disabled={updateRecord.isPending}>
              {updateRecord.isPending ? "Updating..." : "Update"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">SNo</TableHead>
                <TableHead>Logo</TableHead>
                <TableHead>Client Name</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Reach</TableHead>
                <TableHead>Impression</TableHead>
                {role === "admin" && <TableHead>Cost/Result</TableHead>}
                {role === "admin" && <TableHead>Total</TableHead>}
                <TableHead className="w-36">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={role === "admin" ? 11 : 9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : paginated.length === 0 ? (
                <TableRow><TableCell colSpan={role === "admin" ? 11 : 9} className="text-center py-8 text-muted-foreground">No records</TableCell></TableRow>
              ) : (
                paginated.map((r, i) => (
                  <TableRow key={r.id}>
                    <TableCell>{(currentPage - 1) * PAGE_SIZE + i + 1}</TableCell>
                    <TableCell>
                      {r.client_logo_url ? <img src={r.client_logo_url} alt="" className="h-8 w-8 object-contain rounded" /> : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell className="font-medium">{r.client_name}</TableCell>
                    <TableCell>{r.campaign_name}</TableCell>
                    <TableCell>{r.month} {r.report_date}</TableCell>
                    <TableCell>{r.result}</TableCell>
                    <TableCell>{r.reach}</TableCell>
                    <TableCell>{r.impression}</TableCell>
                    {role === "admin" && <TableCell>₹ {Number(r.cost_per_result).toFixed(2)}</TableCell>}
                    {role === "admin" && <TableCell>₹ {Number(r.total_amount).toFixed(2)}</TableCell>}
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="outline" size="icon" onClick={() => setViewItem(r)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon" onClick={() => downloadReport(r)}><Download className="h-4 w-4" /></Button>
                        {role === "admin" && (
                          <>
                            <Button variant="outline" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="destructive" size="icon" onClick={() => deleteRecord.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, allRecords.length)} of {allRecords.length}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button key={p} variant={p === currentPage ? "default" : "outline"} size="sm" onClick={() => setPage(p)} className="w-8">{p}</Button>
            ))}
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
