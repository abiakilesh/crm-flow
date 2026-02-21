import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ProjectFilter } from "@/components/shared/ProjectFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";

const statusColors: Record<string, string> = {
  Paid: "bg-green-100 text-green-800 border-green-300",
  Processing: "bg-yellow-100 text-yellow-800 border-yellow-300",
  "On Practically": "bg-blue-100 text-blue-800 border-blue-300",
};

export default function Finance() {
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  const [projectFilter, setProjectFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ company_name: "", total_amount: "", share_amount: "", paid_status: "Processing" });

  const { data: records, isLoading } = useQuery({
    queryKey: ["finance", projectFilter],
    queryFn: async () => {
      let q = supabase.from("finance").select("*, projects(name)").order("date", { ascending: false });
      if (projectFilter !== "all") q = q.eq("project_id", projectFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const addRecord = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("finance").insert({
        company_name: form.company_name,
        total_amount: parseFloat(form.total_amount) || 0,
        share_amount: parseFloat(form.share_amount) || 0,
        paid_status: form.paid_status,
        created_by: user?.id,
        project_id: projectFilter !== "all" ? projectFilter : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance"] });
      setDialogOpen(false);
      setForm({ company_name: "", total_amount: "", share_amount: "", paid_status: "Processing" });
      toast.success("Record added!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateRecord = useMutation({
    mutationFn: async () => {
      if (!editId) return;
      const { error } = await supabase.from("finance").update({
        company_name: form.company_name,
        total_amount: parseFloat(form.total_amount) || 0,
        share_amount: parseFloat(form.share_amount) || 0,
        paid_status: form.paid_status,
      }).eq("id", editId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance"] });
      setEditDialogOpen(false);
      setEditId(null);
      setForm({ company_name: "", total_amount: "", share_amount: "", paid_status: "Processing" });
      toast.success("Record updated!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("finance").update({ paid_status: status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance"] });
      toast.success("Status updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteRecord = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("finance").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance"] });
      toast.success("Record deleted");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openEdit = (rec: any) => {
    setEditId(rec.id);
    setForm({
      company_name: rec.company_name,
      total_amount: String(rec.total_amount),
      share_amount: String(rec.share_amount),
      paid_status: rec.paid_status,
    });
    setEditDialogOpen(true);
  };

  const statuses = ["Paid", "Processing", "On Practically"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-foreground">Finance Dashboard</h2>
        <div className="flex items-center gap-2">
          <ProjectFilter value={projectFilter} onChange={setProjectFilter} />
          {role === "admin" && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Add Record</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Finance Record</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Company Name" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
                  <Input placeholder="Total Amount" type="number" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} />
                  <Input placeholder="Share Amount" type="number" value={form.share_amount} onChange={(e) => setForm({ ...form, share_amount: e.target.value })} />
                  <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.paid_status} onChange={(e) => setForm({ ...form, paid_status: e.target.value })}>
                    {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <Button className="w-full" onClick={() => addRecord.mutate()} disabled={addRecord.isPending}>Add</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Finance Record</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Company Name" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
            <Input placeholder="Total Amount" type="number" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} />
            <Input placeholder="Share Amount" type="number" value={form.share_amount} onChange={(e) => setForm({ ...form, share_amount: e.target.value })} />
            <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.paid_status} onChange={(e) => setForm({ ...form, paid_status: e.target.value })}>
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <Button className="w-full" onClick={() => updateRecord.mutate()} disabled={updateRecord.isPending}>
              {updateRecord.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>S.No</TableHead>
              <TableHead>Company Name</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Share Amount</TableHead>
              <TableHead>Paid Status</TableHead>
              <TableHead>Project</TableHead>
              {role === "admin" && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : (records || []).length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No records</TableCell></TableRow>
            ) : (
              (records || []).map((rec, i) => (
                <TableRow key={rec.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-medium">{rec.company_name}</TableCell>
                  <TableCell>{rec.date}</TableCell>
                  <TableCell>₹{Number(rec.total_amount).toLocaleString()}</TableCell>
                  <TableCell>₹{Number(rec.share_amount).toLocaleString()}</TableCell>
                  <TableCell>
                    {role === "admin" ? (
                      <div className="flex gap-1">
                        {statuses.map((s) => (
                          <Button key={s} size="sm" variant="outline" className={`text-xs ${rec.paid_status === s ? statusColors[s] : ""}`}
                            onClick={() => updateStatus.mutate({ id: rec.id, status: s })}>
                            {s}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs border ${statusColors[rec.paid_status] || ""}`}>{rec.paid_status}</span>
                    )}
                  </TableCell>
                  <TableCell>{(rec as any).projects?.name || "—"}</TableCell>
                  {role === "admin" && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(rec)}>
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteRecord.mutate(rec.id)}>
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
