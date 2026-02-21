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
import { Plus, Phone, Upload, Search, Pencil, Trash2 } from "lucide-react";

export default function Sales() {
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  const [projectFilter, setProjectFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [callLogOpen, setCallLogOpen] = useState(false);
  const [callLogForm, setCallLogForm] = useState({ duration_minutes: "", status: "completed", phone_number: "", notes: "" });
  const [form, setForm] = useState({ customer_name: "", follow_up_1: "", follow_up_2: "" });

  const { data: sales, isLoading } = useQuery({
    queryKey: ["sales", projectFilter],
    queryFn: async () => {
      let q = supabase.from("sales").select("*, projects(name), leads(lead_id, mobile)").order("created_at", { ascending: false });
      if (projectFilter !== "all") q = q.eq("project_id", projectFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const { data: callLists } = useQuery({
    queryKey: ["call_lists", projectFilter],
    queryFn: async () => {
      let q = supabase.from("call_lists").select("*").order("serial_no");
      if (projectFilter !== "all") q = q.eq("project_id", projectFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const addSale = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("sales").insert({
        customer_name: form.customer_name,
        follow_up_1: form.follow_up_1,
        follow_up_2: form.follow_up_2,
        created_by: user?.id,
        project_id: projectFilter !== "all" ? projectFilter : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      setDialogOpen(false);
      setForm({ customer_name: "", follow_up_1: "", follow_up_2: "" });
      toast.success("Sale added!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateSale = useMutation({
    mutationFn: async () => {
      if (!editId) return;
      const { error } = await supabase.from("sales").update({
        customer_name: form.customer_name,
        follow_up_1: form.follow_up_1,
        follow_up_2: form.follow_up_2,
      }).eq("id", editId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      setEditDialogOpen(false);
      setEditId(null);
      setForm({ customer_name: "", follow_up_1: "", follow_up_2: "" });
      toast.success("Sale updated!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteSale = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sales").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Sale deleted");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addCallLog = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("call_logs").insert({
        caller_id: user?.id,
        duration_minutes: parseInt(callLogForm.duration_minutes) || 0,
        status: callLogForm.status as "completed" | "dropped",
        phone_number: callLogForm.phone_number,
        notes: callLogForm.notes,
        project_id: projectFilter !== "all" ? projectFilter : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_logs"] });
      setCallLogOpen(false);
      setCallLogForm({ duration_minutes: "", status: "completed", phone_number: "", notes: "" });
      toast.success("Call logged!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openEdit = (sale: any) => {
    setEditId(sale.id);
    setForm({ customer_name: sale.customer_name, follow_up_1: sale.follow_up_1 || "", follow_up_2: sale.follow_up_2 || "" });
    setEditDialogOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split("\n").filter(Boolean);
    const rows = lines.slice(1).map((line) => {
      const cols = line.split(",").map((c) => c.trim());
      return {
        serial_no: parseInt(cols[0]) || 0,
        name: cols[1] || "",
        phone_number: cols[2] || "",
        uploaded_by: user?.id,
        project_id: projectFilter !== "all" ? projectFilter : null,
      };
    }).filter((r) => r.name && r.phone_number);

    if (rows.length === 0) { toast.error("No valid rows found"); return; }
    const { error } = await supabase.from("call_lists").insert(rows);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["call_lists"] });
    toast.success(`${rows.length} contacts uploaded!`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-foreground">Sales Dashboard</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-8 w-[200px]" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <ProjectFilter value={projectFilter} onChange={setProjectFilter} />
          <label className="cursor-pointer">
            <Button variant="outline" asChild><span><Upload className="mr-2 h-4 w-4" /> Add Call List</span></Button>
            <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
          </label>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Add Sale</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Sale</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Customer Name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
                <Input placeholder="Follow Up 1" value={form.follow_up_1} onChange={(e) => setForm({ ...form, follow_up_1: e.target.value })} />
                <Input placeholder="Follow Up 2" value={form.follow_up_2} onChange={(e) => setForm({ ...form, follow_up_2: e.target.value })} />
                <Button className="w-full" onClick={() => addSale.mutate()} disabled={addSale.isPending}>Add</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Sale</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Customer Name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
            <Input placeholder="Follow Up 1" value={form.follow_up_1} onChange={(e) => setForm({ ...form, follow_up_1: e.target.value })} />
            <Input placeholder="Follow Up 2" value={form.follow_up_2} onChange={(e) => setForm({ ...form, follow_up_2: e.target.value })} />
            <Button className="w-full" onClick={() => updateSale.mutate()} disabled={updateSale.isPending}>
              {updateSale.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sales Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>S.No</TableHead>
              <TableHead>Lead ID</TableHead>
              <TableHead>Customer Name</TableHead>
              <TableHead>Follow Up 1</TableHead>
              <TableHead>Follow Up 2</TableHead>
              <TableHead>Call</TableHead>
              <TableHead>Project</TableHead>
              {role === "admin" && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : (sales || []).length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No sales records</TableCell></TableRow>
            ) : (
              (sales || []).map((sale, i) => (
                <TableRow key={sale.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-mono text-xs">{(sale as any).leads?.lead_id || "—"}</TableCell>
                  <TableCell className="font-medium">{sale.customer_name}</TableCell>
                  <TableCell>{sale.follow_up_1}</TableCell>
                  <TableCell>{sale.follow_up_2}</TableCell>
                  <TableCell>
                    {(sale as any).leads?.mobile ? (
                      <a href={`tel:${(sale as any).leads.mobile}`} onClick={() => {
                        setCallLogForm({ ...callLogForm, phone_number: (sale as any).leads.mobile });
                        setCallLogOpen(true);
                      }}>
                        <Button variant="outline" size="sm"><Phone className="mr-1 h-3 w-3" /> Call</Button>
                      </a>
                    ) : "—"}
                  </TableCell>
                  <TableCell>{(sale as any).projects?.name || "—"}</TableCell>
                  {role === "admin" && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(sale)}>
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteSale.mutate(sale.id)}>
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

      {/* Call Lists */}
      {(callLists || []).length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">Uploaded Call Lists</h3>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>S.No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {callLists!.map((cl) => (
                  <TableRow key={cl.id}>
                    <TableCell>{cl.serial_no}</TableCell>
                    <TableCell>{cl.name}</TableCell>
                    <TableCell>
                      <a href={`tel:${cl.phone_number}`} className="text-primary hover:underline">{cl.phone_number}</a>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => {
                        setCallLogForm({ ...callLogForm, phone_number: cl.phone_number });
                        setCallLogOpen(true);
                      }}>
                        <Phone className="mr-1 h-3 w-3" /> Log Call
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Call Log Dialog */}
      <Dialog open={callLogOpen} onOpenChange={setCallLogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Call</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Phone Number" value={callLogForm.phone_number} onChange={(e) => setCallLogForm({ ...callLogForm, phone_number: e.target.value })} />
            <Input placeholder="Duration (minutes)" type="number" value={callLogForm.duration_minutes} onChange={(e) => setCallLogForm({ ...callLogForm, duration_minutes: e.target.value })} />
            <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={callLogForm.status} onChange={(e) => setCallLogForm({ ...callLogForm, status: e.target.value })}>
              <option value="completed">Completed</option>
              <option value="dropped">Dropped</option>
            </select>
            <Input placeholder="Notes" value={callLogForm.notes} onChange={(e) => setCallLogForm({ ...callLogForm, notes: e.target.value })} />
            <Button className="w-full" onClick={() => addCallLog.mutate()} disabled={addCallLog.isPending}>Log Call</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
