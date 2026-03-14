import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

import { toast } from "sonner";
import { Plus, Trash2, UserPlus } from "lucide-react";

export default function Settings() {
  const { role, session } = useAuth();
  const queryClient = useQueryClient();

  // Project management
  const [projectDialog, setProjectDialog] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");

  // User creation
  const [userDialog, setUserDialog] = useState(false);
  const [userForm, setUserForm] = useState({ email: "", password: "", full_name: "", phone: "", role: "client" as string, project_id: "" });

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
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*") as any,
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      const roleMap = new Map((rolesRes.data || []).map((r: any) => [r.user_id, r.role]));
      const projectMap = new Map((projects || []).map(p => [p.id, p.name]));
      return (profilesRes.data || []).map((p: any) => ({ ...p, role: roleMap.get(p.user_id) || null, project_name: p.project_id ? projectMap.get(p.project_id) : null }));
    },
    enabled: !!projects,
  });

  const createUser = useMutation({
    mutationFn: async () => {
      if (userForm.password.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }
      if (!/[A-Z]/.test(userForm.password) || !/[a-z]/.test(userForm.password) || !/[0-9]/.test(userForm.password)) {
        throw new Error("Password must contain uppercase, lowercase, and a number");
      }
      const res = await supabase.functions.invoke("manage-users", {
        body: {
          action: "create",
          email: userForm.email,
          password: userForm.password,
          full_name: userForm.full_name,
          phone: userForm.phone,
          role: userForm.role,
          project_id: userForm.role === "client" && userForm.project_id ? userForm.project_id : undefined,
        },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      setUserDialog(false);
      setUserForm({ email: "", password: "", full_name: "", phone: "", role: "client", project_id: "" });
      toast.success("User created!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const res = await supabase.functions.invoke("manage-users", {
        body: { action: "delete", user_id: userId },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      toast.success("User deleted");
    },
    onError: (err: any) => toast.error(err.message),
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
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Users</h3>
            <Dialog open={userDialog} onOpenChange={setUserDialog}>
              <DialogTrigger asChild><Button><UserPlus className="mr-2 h-4 w-4" /> Create User</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Full Name" value={userForm.full_name} onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })} />
                  <Input type="email" placeholder="Email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
                  <Input placeholder="Phone" value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} />
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Password (min 8 chars, mixed case + number)</label>
                    <Input type="password" placeholder="Enter password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} minLength={8} />
                  </div>
                  <Select value={userForm.role} onValueChange={(val) => setUserForm({ ...userForm, role: val })}>
                    <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                    </SelectContent>
                  </Select>
                  {userForm.role === "client" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Assign Project</label>
                      <Select value={userForm.project_id} onValueChange={(val) => setUserForm({ ...userForm, project_id: val })}>
                        <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                        <SelectContent>
                          {(projects || []).map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Button className="w-full" onClick={() => createUser.mutate()} disabled={createUser.isPending}>
                    {createUser.isPending ? "Creating..." : "Create User"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {(users || []).map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {u.role || "No role"}
                      </Badge>
                    </TableCell>
                    <TableCell>{u.project_name || "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteUser.mutate(u.user_id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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
