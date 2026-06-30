import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trash2, UserPlus } from "lucide-react";

export default function Settings() {
  const { role } = useAuth();
  const queryClient = useQueryClient();

  const [managerDialog, setManagerDialog] = useState(false);
  const [salesDialog, setSalesDialog] = useState(false);
  const [managerForm, setManagerForm] = useState({ email: "", password: "", full_name: "", phone: "" });
  const [salesForm, setSalesForm] = useState({ email: "", password: "", full_name: "", phone: "", manager_id: "" });

  const { data: users } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      const roleMap = new Map((rolesRes.data || []).map((r: any) => [r.user_id, r.role]));
      return (profilesRes.data || []).map((p: any) => ({ ...p, role: roleMap.get(p.user_id) || null }));
    },
  });

  const managers = (users || []).filter((u: any) => u.role === "manager");
  const salesPeople = (users || []).filter((u: any) => u.role === "sales");
  const managerById = new Map(managers.map((m: any) => [m.user_id, m.full_name || m.email]));

  const validatePassword = (pw: string) => {
    if (pw.length < 8) throw new Error("Password must be at least 8 characters");
    if (!/[A-Z]/.test(pw) || !/[a-z]/.test(pw) || !/[0-9]/.test(pw))
      throw new Error("Password must contain uppercase, lowercase, and a number");
  };

  const createUser = useMutation({
    mutationFn: async (payload: { role: "manager" | "sales"; form: any }) => {
      validatePassword(payload.form.password);
      const res = await supabase.functions.invoke("manage-users", {
        body: {
          action: "create",
          email: payload.form.email,
          password: payload.form.password,
          full_name: payload.form.full_name,
          phone: payload.form.phone,
          role: payload.role,
          manager_id: payload.role === "sales" ? payload.form.manager_id || undefined : undefined,
        },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      if (vars.role === "manager") {
        setManagerDialog(false);
        setManagerForm({ email: "", password: "", full_name: "", phone: "" });
      } else {
        setSalesDialog(false);
        setSalesForm({ email: "", password: "", full_name: "", phone: "", manager_id: "" });
      }
      toast.success(`${vars.role} created!`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const assignManager = useMutation({
    mutationFn: async (p: { user_id: string; manager_id: string }) => {
      const res = await supabase.functions.invoke("manage-users", {
        body: { action: "assign_manager", user_id: p.user_id, manager_id: p.manager_id || null },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      toast.success("Manager assigned");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (p: { user_id: string; is_active: boolean }) => {
      const res = await supabase.functions.invoke("manage-users", {
        body: { action: "toggle_active", user_id: p.user_id, is_active: p.is_active },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      toast.success("Status updated");
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
      <Tabs defaultValue="managers">
        <TabsList>
          <TabsTrigger value="managers">Managers</TabsTrigger>
          <TabsTrigger value="sales">Sales Executives</TabsTrigger>
        </TabsList>

        <TabsContent value="managers" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Managers ({managers.length}/5)</h3>
            <Dialog open={managerDialog} onOpenChange={setManagerDialog}>
              <DialogTrigger asChild><Button disabled={managers.length >= 5}><UserPlus className="mr-2 h-4 w-4" /> Create Manager</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Manager</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Full Name" value={managerForm.full_name} onChange={(e) => setManagerForm({ ...managerForm, full_name: e.target.value })} />
                  <Input type="email" placeholder="Email" value={managerForm.email} onChange={(e) => setManagerForm({ ...managerForm, email: e.target.value })} />
                  <Input placeholder="Phone" value={managerForm.phone} onChange={(e) => setManagerForm({ ...managerForm, phone: e.target.value })} />
                  <Input type="password" placeholder="Password (8+, mixed case + number)" value={managerForm.password} onChange={(e) => setManagerForm({ ...managerForm, password: e.target.value })} />
                  <Button className="w-full" onClick={() => createUser.mutate({ role: "manager", form: managerForm })} disabled={createUser.isPending}>
                    {createUser.isPending ? "Creating..." : "Create Manager"}
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
                  <TableHead>Team Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {managers.map((m: any) => {
                  const teamSize = salesPeople.filter((s: any) => s.manager_id === m.user_id).length;
                  return (
                    <TableRow key={m.user_id}>
                      <TableCell className="font-medium">{m.full_name || "—"}</TableCell>
                      <TableCell>{m.email}</TableCell>
                      <TableCell>{m.phone || "—"}</TableCell>
                      <TableCell>{teamSize}/5</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch checked={m.is_active !== false} onCheckedChange={(v) => toggleActive.mutate({ user_id: m.user_id, is_active: v })} />
                          <Badge variant={m.is_active !== false ? "default" : "secondary"}>{m.is_active !== false ? "Active" : "Disabled"}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteUser.mutate(m.user_id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Sales Executives ({salesPeople.length})</h3>
            <Dialog open={salesDialog} onOpenChange={setSalesDialog}>
              <DialogTrigger asChild><Button><UserPlus className="mr-2 h-4 w-4" /> Create Sales</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Sales Executive</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Full Name" value={salesForm.full_name} onChange={(e) => setSalesForm({ ...salesForm, full_name: e.target.value })} />
                  <Input type="email" placeholder="Email" value={salesForm.email} onChange={(e) => setSalesForm({ ...salesForm, email: e.target.value })} />
                  <Input placeholder="Phone" value={salesForm.phone} onChange={(e) => setSalesForm({ ...salesForm, phone: e.target.value })} />
                  <Input type="password" placeholder="Password (8+, mixed case + number)" value={salesForm.password} onChange={(e) => setSalesForm({ ...salesForm, password: e.target.value })} />
                  <Select value={salesForm.manager_id} onValueChange={(val) => setSalesForm({ ...salesForm, manager_id: val })}>
                    <SelectTrigger><SelectValue placeholder="Assign to Manager (optional)" /></SelectTrigger>
                    <SelectContent>
                      {managers.map((m: any) => (
                        <SelectItem key={m.user_id} value={m.user_id}>{m.full_name || m.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button className="w-full" onClick={() => createUser.mutate({ role: "sales", form: salesForm })} disabled={createUser.isPending}>
                    {createUser.isPending ? "Creating..." : "Create Sales"}
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
                  <TableHead>Assigned Manager</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesPeople.map((u: any) => (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.phone || "—"}</TableCell>
                    <TableCell>
                      <Select value={u.manager_id || ""} onValueChange={(val) => assignManager.mutate({ user_id: u.user_id, manager_id: val })}>
                        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                        <SelectContent>
                          {managers.map((m: any) => (
                            <SelectItem key={m.user_id} value={m.user_id}>{m.full_name || m.email}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={u.is_active !== false} onCheckedChange={(v) => toggleActive.mutate({ user_id: u.user_id, is_active: v })} />
                        <Badge variant={u.is_active !== false ? "default" : "secondary"}>{u.is_active !== false ? "Active" : "Disabled"}</Badge>
                      </div>
                    </TableCell>
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
