import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, MapPin, Upload, Image as ImageIcon, Download } from "lucide-react";

const INTEREST = ["Very Interested", "Interested", "Need Follow-up", "Not Interested"] as const;

export default function SiteVisits() {
  const { role, user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ url: string; path: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [form, setForm] = useState({
    customer_name: "", phone_number: "", project_name: "", property_name: "", location: "",
    visit_date: new Date().toISOString().slice(0, 10),
    visit_time: new Date().toTimeString().slice(0, 5),
    interest_level: "Interested", remarks: "",
  });

  const { data } = useQuery({
    queryKey: ["site-visits"],
    queryFn: async () => {
      const [visits, profiles, roles] = await Promise.all([
        supabase.from("site_visits").select("*").order("visit_date", { ascending: false }),
        supabase.from("profiles").select("user_id, full_name, email, manager_id"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const nameMap = new Map((profiles.data || []).map((p: any) => [p.user_id, p.full_name || p.email]));
      const managerFor = new Map((profiles.data || []).map((p: any) => [p.user_id, p.manager_id]));
      return (visits.data || []).map((v: any) => ({
        ...v,
        sales_name: nameMap.get(v.sales_id) || "—",
        manager_name: nameMap.get(managerFor.get(v.sales_id)) || "—",
      }));
    },
  });

  const captureGps = () => {
    if (!navigator.geolocation) return toast.error("GPS not available");
    navigator.geolocation.getCurrentPosition(
      (p) => { setGps({ lat: p.coords.latitude, lng: p.coords.longitude }); toast.success("GPS captured"); },
      () => toast.error("Failed to get GPS")
    );
  };

  const submit = useMutation({
    mutationFn: async () => {
      if (!form.customer_name || !form.phone_number || !form.visit_date) throw new Error("Fill required fields");
      setBusy(true);
      const uploaded: string[] = [];
      for (const f of files) {
        const path = `${user!.id}/${Date.now()}_${f.name}`;
        const { error } = await supabase.storage.from("site-visit-images").upload(path, f);
        if (error) throw error;
        uploaded.push(path);
      }
      const { data: prof } = await supabase.from("profiles").select("manager_id").eq("user_id", user!.id).single();
      const { error } = await supabase.from("site_visits").insert({
        sales_id: user!.id,
        manager_id: prof?.manager_id || null,
        customer_name: form.customer_name,
        phone_number: form.phone_number,
        project_name: form.project_name || null,
        property_name: form.property_name || null,
        location: form.location || null,
        visit_date: form.visit_date,
        visit_time: form.visit_time || null,
        interest_level: form.interest_level as any,
        remarks: form.remarks || null,
        image_urls: uploaded,
        gps_lat: gps?.lat ?? null,
        gps_lng: gps?.lng ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Site visit saved");
      setOpen(false); setFiles([]); setGps(null);
      setForm({ customer_name: "", phone_number: "", project_name: "", property_name: "", location: "", visit_date: new Date().toISOString().slice(0, 10), visit_time: new Date().toTimeString().slice(0, 5), interest_level: "Interested", remarks: "" });
      qc.invalidateQueries({ queryKey: ["site-visits"] });
    },
    onError: (e: any) => toast.error(e.message),
    onSettled: () => setBusy(false),
  });

  const openImage = async (path: string) => {
    const { data, error } = await supabase.storage.from("site-visit-images").createSignedUrl(path, 3600);
    if (error) return toast.error(error.message);
    setPreview({ url: data.signedUrl, path });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-3xl font-extrabold">Site Visits</h2>
          <p className="text-muted-foreground text-sm mt-1">{role === "sales" ? "Log and track your site visits" : "All site visits across the team"}</p>
        </div>
        {(role === "sales" || role === "admin") && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Site Visit</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create Site Visit</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Customer Name *" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
                  <Input placeholder="Phone Number *" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
                  <Input placeholder="Project Name" value={form.project_name} onChange={(e) => setForm({ ...form, project_name: e.target.value })} />
                  <Input placeholder="Property Name" value={form.property_name} onChange={(e) => setForm({ ...form, property_name: e.target.value })} />
                </div>
                <Input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <Input type="date" value={form.visit_date} onChange={(e) => setForm({ ...form, visit_date: e.target.value })} />
                  <Input type="time" value={form.visit_time} onChange={(e) => setForm({ ...form, visit_time: e.target.value })} />
                </div>
                <Select value={form.interest_level} onValueChange={(v) => setForm({ ...form, interest_level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{INTEREST.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                </Select>
                <Textarea placeholder="Remarks" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files || []))} />
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" type="button" onClick={() => fileRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />{files.length ? `${files.length} image(s)` : "Attach Images"}
                  </Button>
                  <Button variant="outline" type="button" onClick={captureGps}>
                    <MapPin className="mr-2 h-4 w-4" />{gps ? `GPS: ${gps.lat.toFixed(3)}, ${gps.lng.toFixed(3)}` : "Capture GPS"}
                  </Button>
                </div>
                <Button className="w-full" disabled={busy} onClick={() => submit.mutate()}>{busy ? "Saving..." : "Submit Site Visit"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card><CardContent className="p-0 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Sales Exec</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Interest</TableHead>
              <TableHead>Images</TableHead>
              <TableHead>Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data || []).length === 0 ? (
              <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">No site visits yet</TableCell></TableRow>
            ) : (data || []).map((v: any) => (
              <TableRow key={v.id}>
                <TableCell>{v.visit_date}</TableCell>
                <TableCell className="font-medium">{v.sales_name}</TableCell>
                <TableCell>{v.manager_name}</TableCell>
                <TableCell>{v.customer_name}</TableCell>
                <TableCell>{v.phone_number}</TableCell>
                <TableCell>{v.project_name || "—"}</TableCell>
                <TableCell>{v.property_name || "—"}</TableCell>
                <TableCell>{v.location || "—"}</TableCell>
                <TableCell><Badge variant="outline">{v.interest_level}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {(v.image_urls || []).slice(0, 3).map((p: string, i: number) => (
                      <Button key={i} size="icon" variant="ghost" className="h-7 w-7" onClick={() => openImage(p)}>
                        <ImageIcon className="h-3.5 w-3.5" />
                      </Button>
                    ))}
                    {(v.image_urls || []).length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">{v.remarks || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Site Visit Image</DialogTitle></DialogHeader>
          {preview && (
            <div className="space-y-2">
              <img src={preview.url} alt="visit" className="w-full rounded-lg" />
              <a href={preview.url} download target="_blank" rel="noreferrer">
                <Button variant="outline" className="w-full"><Download className="mr-2 h-4 w-4" />Download</Button>
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}