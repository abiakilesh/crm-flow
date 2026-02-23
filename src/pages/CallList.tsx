import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ProjectFilter } from "@/components/shared/ProjectFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Search, Trash2, Phone } from "lucide-react";

export default function CallList() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [projectFilter, setProjectFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: callList, isLoading } = useQuery({
    queryKey: ["call_lists", projectFilter],
    queryFn: async () => {
      let q = supabase.from("call_lists").select("*, projects(name)").order("serial_no", { ascending: true });
      if (projectFilter !== "all") q = q.eq("project_id", projectFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("call_lists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_lists"] });
      toast.success("Contact deleted");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = (callList || []).filter(
    (c) =>
      !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone_number?.includes(search)
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-foreground">Call List</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search name or phone..." className="pl-8 w-[220px]" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <ProjectFilter value={projectFilter} onChange={setProjectFilter} />
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>S.No</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone Number</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Call</TableHead>
              {role === "admin" && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No contacts found. Upload a call list from the Leads page.</TableCell></TableRow>
            ) : (
              filtered.map((contact, i) => (
                <TableRow key={contact.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-medium">{contact.name}</TableCell>
                  <TableCell>{contact.phone_number}</TableCell>
                  <TableCell>{(contact as any).projects?.name || "—"}</TableCell>
                  <TableCell>
                    <a href={`tel:${contact.phone_number}`}>
                      <Button variant="outline" size="icon" className="h-8 w-8">
                        <Phone className="h-4 w-4 text-primary" />
                      </Button>
                    </a>
                  </TableCell>
                  {role === "admin" && (
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteContact.mutate(contact.id)}>
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
