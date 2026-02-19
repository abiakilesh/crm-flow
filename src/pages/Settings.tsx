import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export default function Settings() {
  const { role } = useAuth();
  const queryClient = useQueryClient();

  // Project management
  const [projectDialog, setProjectDialog] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");

  const { data: projects } = useQuery({
    queryKey: ["projects-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const addProject = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("projects").insert({ name: projectName, description: projectDesc });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setProjectDialog(false);
      setProjectName("");
      setProjectDesc("");
      toast.success("Project created!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project deleted");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Users
  const { data: users } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*, user_roles(role)");
      if (error) throw error;
      return data;
    },
  });

  if (role !== "admin") return <div className="text-muted-foreground">Access denied</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Settings</h2>
      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Manage Projects</h3>
            <Dialog open={projectDialog} onOpenChange={setProjectDialog}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> New Project</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Project</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Project Name" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
                  <Input placeholder="Description" value={projectDesc} onChange={(e) => setProjectDesc(e.target.value)} />
                  <Button className="w-full" onClick={() => addProject.mutate()} disabled={addProject.isPending}>Create</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(projects || []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.description}</TableCell>
                    <TableCell><Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteProject.mutate(p.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <h3 className="text-lg font-semibold">Users</h3>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(users || []).map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {(u as any).user_roles?.[0]?.role || "No role"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
