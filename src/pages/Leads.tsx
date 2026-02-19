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
import { Plus, Trash2, Search } from "lucide-react";

export default function Leads() {
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  const [projectFilter, setProjectFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ customer_name: "", place: "", mobile: "", review: "" });

  const { data: leads, isLoading } = useQuery({
    queryKey: ["leads", projectFilter],
    queryFn: async () => {
      let q = supabase.from("leads").select("*, projects(name), lead_by_profile:profiles!leads_lead_by_fkey(full_name)").order("created_at", { ascending: false });
      if (projectFilter !== "all") q = q.eq("project_id", projectFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
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
              {role === "admin" && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No leads found</TableCell></TableRow>
            ) : (
              filtered.map((lead, i) => (
                <TableRow key={lead.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-mono text-xs">{lead.lead_id}</TableCell>
                  <TableCell className="font-medium">{lead.customer_name}</TableCell>
                  <TableCell>{lead.place}</TableCell>
                  <TableCell>{lead.mobile}</TableCell>
                  <TableCell>{lead.review}</TableCell>
                  <TableCell>{(lead as any).lead_by_profile?.full_name || "—"}</TableCell>
                  <TableCell>{(lead as any).projects?.name || "—"}</TableCell>
                  {role === "admin" && (
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteLead.mutate(lead.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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
