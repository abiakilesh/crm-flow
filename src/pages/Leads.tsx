import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ProjectFilter } from "@/components/shared/ProjectFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Search, Pencil, Upload, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

export default function Leads() {
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  const [projectFilter, setProjectFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ customer_name: "", place: "", mobile: "", review: "" });
  const [uploading, setUploading] = useState(false);
  const [previewData, setPreviewData] = useState<{ customer_name: string; mobile: string; place: string; duplicate: boolean }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: leads, isLoading } = useQuery({
    queryKey: ["leads", projectFilter],
    queryFn: async () => {
      let q = supabase.from("leads").select("*, projects(name)").order("created_at", { ascending: false });
      if (projectFilter !== "all") q = q.eq("project_id", projectFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const { data: salesUsers } = useQuery({
    queryKey: ["sales-users"],
    enabled: role === "admin",
    queryFn: async () => {
      const [profiles, roles] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, email"),
        supabase.from("user_roles").select("user_id, role").eq("role", "sales"),
      ]);
      const salesIds = new Set((roles.data || []).map((r: any) => r.user_id));
      return (profiles.data || []).filter((p: any) => salesIds.has(p.user_id));
    },
  });

  const assignLead = useMutation({
    mutationFn: async (p: { lead_id: string; assigned_to: string }) => {
      const { error } = await supabase.from("leads").update({ assigned_to: p.assigned_to || null }).eq("id", p.lead_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead assigned");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addLead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("leads").insert({
        customer_name: form.customer_name,
        place: form.place,
        mobile: form.mobile,
        review: form.review,
        lead_by: user?.id,
        created_by: user?.id,
        project_id: projectFilter !== "all" ? projectFilter : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setDialogOpen(false);
      setForm({ customer_name: "", place: "", mobile: "", review: "" });
      toast.success("Lead added!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateLead = useMutation({
    mutationFn: async () => {
      if (!editId) return;
      const { error } = await supabase.from("leads").update({
        customer_name: form.customer_name,
        place: form.place,
        mobile: form.mobile,
        review: form.review,
      }).eq("id", editId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setEditDialogOpen(false);
      setEditId(null);
      setForm({ customer_name: "", place: "", mobile: "", review: "" });
      toast.success("Lead updated!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead deleted");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openEdit = (lead: any) => {
    setEditId(lead.id);
    setForm({ customer_name: lead.customer_name, place: lead.place || "", mobile: lead.mobile || "", review: lead.review || "" });
    setEditDialogOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(sheet);

        const parsed = jsonData.map((row: any) => ({
          customer_name: String(row["Name"] || row["name"] || row["Customer Name"] || row["customer_name"] || "").trim(),
          mobile: String(row["Phone"] || row["phone"] || row["Mobile"] || row["mobile"] || row["Phone Number"] || "").trim(),
          place: String(row["Place"] || row["place"] || row["City"] || row["city"] || "").trim(),
        })).filter((r) => r.customer_name && r.mobile);

        if (parsed.length === 0) {
          toast.error("No valid rows. Required columns: Name, Phone");
          return;
        }

        // Duplicate phone detection against existing leads + within file
        const existing = new Set((leads || []).map((l: any) => (l.mobile || "").replace(/\D/g, "")));
        const seen = new Set<string>();
        const withDup = parsed.map((r) => {
          const norm = r.mobile.replace(/\D/g, "");
          const dup = existing.has(norm) || seen.has(norm);
          seen.add(norm);
          return { ...r, duplicate: dup };
        });
        setPreviewData(withDup);
      } catch {
        toast.error("Failed to parse Excel file");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const importLeads = async () => {
    const toInsert = previewData.filter((r) => !r.duplicate);
    if (toInsert.length === 0) {
      toast.error("No new leads to import (all duplicates)");
      return;
    }
    setUploading(true);
    try {
      const rows = toInsert.map((r) => ({
        customer_name: r.customer_name.substring(0, 255),
        mobile: r.mobile.substring(0, 20),
        place: r.place.substring(0, 255),
        lead_by: user?.id,
        created_by: user?.id,
        project_id: projectFilter !== "all" ? projectFilter : null,
      }));
      const { error } = await supabase.from("leads").insert(rows);
      if (error) throw error;
      const skipped = previewData.length - toInsert.length;
      toast.success(`Imported ${rows.length} leads${skipped ? `, skipped ${skipped} duplicates` : ""}`);
      setPreviewData([]);
      setImportDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const filtered = (leads || []).filter(
    (l) => !search || l.customer_name?.toLowerCase().includes(search.toLowerCase()) || l.lead_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-foreground">Leads Dashboard</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-8 w-[200px]" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <ProjectFilter value={projectFilter} onChange={setProjectFilter} />

          {role === "admin" && (
          <Dialog open={importDialogOpen} onOpenChange={(open) => { setImportDialogOpen(open); if (!open) setPreviewData([]); }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Import Excel/CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Import Leads (Excel/CSV)</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Columns: <strong>Name</strong>, <strong>Phone</strong> (required), <strong>Place</strong> (optional). Duplicate phone numbers are auto-skipped.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" /> Choose File
                </Button>

                {previewData.length > 0 && (
                  <>
                    <div className="rounded border max-h-64 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>S.No</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Place</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData.slice(0, 30).map((r, i) => (
                            <TableRow key={i} className={r.duplicate ? "opacity-50" : ""}>
                              <TableCell>{i + 1}</TableCell>
                              <TableCell>{r.customer_name}</TableCell>
                              <TableCell>{r.mobile}</TableCell>
                              <TableCell>{r.place}</TableCell>
                              <TableCell className={r.duplicate ? "text-destructive text-xs" : "text-emerald-600 text-xs"}>
                                {r.duplicate ? "Duplicate" : "New"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="text-xs text-muted-foreground text-center">
                      {previewData.length} rows • {previewData.filter(r => !r.duplicate).length} new • {previewData.filter(r => r.duplicate).length} duplicates
                    </div>
                    <Button className="w-full" onClick={importLeads} disabled={uploading}>
                      {uploading ? "Importing..." : `Import ${previewData.filter(r => !r.duplicate).length} New Leads`}
                    </Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
          )}

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Lead</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Lead</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Customer Name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
                <Input placeholder="Place" value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} />
                <Input placeholder="Mobile Number" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
                <Input placeholder="Review" value={form.review} onChange={(e) => setForm({ ...form, review: e.target.value })} />
                <Button className="w-full" onClick={() => addLead.mutate()} disabled={addLead.isPending}>
                  {addLead.isPending ? "Adding..." : "Add Lead"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Lead</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Customer Name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
            <Input placeholder="Place" value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} />
            <Input placeholder="Mobile Number" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            <Input placeholder="Review" value={form.review} onChange={(e) => setForm({ ...form, review: e.target.value })} />
            <Button className="w-full" onClick={() => updateLead.mutate()} disabled={updateLead.isPending}>
              {updateLead.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>S.No</TableHead>
              <TableHead>Lead ID</TableHead>
              <TableHead>Customer Name</TableHead>
              <TableHead>Place</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Review</TableHead>
              <TableHead>Lead By</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Assigned To</TableHead>
              {role === "admin" && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No leads found</TableCell></TableRow>
            ) : (
              filtered.map((lead, i) => (
                <TableRow key={lead.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-mono text-xs">{lead.lead_id}</TableCell>
                  <TableCell className="font-medium">{lead.customer_name}</TableCell>
                  <TableCell>{lead.place}</TableCell>
                  <TableCell>{lead.mobile}</TableCell>
                  <TableCell>{lead.review}</TableCell>
                  <TableCell>—</TableCell>
                  <TableCell>{(lead as any).projects?.name || "—"}</TableCell>
                  <TableCell>
                    {role === "admin" ? (
                      <Select value={lead.assigned_to || ""} onValueChange={(val) => assignLead.mutate({ lead_id: lead.id, assigned_to: val })}>
                        <SelectTrigger className="w-[170px] h-8"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                        <SelectContent>
                          {(salesUsers || []).map((s: any) => (
                            <SelectItem key={s.user_id} value={s.user_id}>{s.full_name || s.email}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      (salesUsers || []).find((s: any) => s.user_id === lead.assigned_to)?.full_name || (lead.assigned_to ? "Assigned" : "—")
                    )}
                  </TableCell>
                  {role === "admin" && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(lead)}>
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteLead.mutate(lead.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}