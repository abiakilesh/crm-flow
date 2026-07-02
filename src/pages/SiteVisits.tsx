import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Upload, Image as ImageIcon, Download, Search, Printer, FileSpreadsheet, Eye } from "lucide-react";
import * as XLSX from "xlsx";

const VISIT_STATUS = ["Scheduled", "Completed", "Cancelled", "Rescheduled", "No Show"] as const;

export default function SiteVisits() {
  const { role, user } = useAuth();
  const qc = useQueryClient();
  const isSales = role === "sales";
  const isAdmin = role === "admin";

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ url: string; path: string } | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    lead_id: "" as string,
    customer_name: "", phone_number: "", project_name: "",
    visit_date: new Date().toISOString().slice(0, 10),
    visit_time: new Date().toTimeString().slice(0, 5),
    status: "Scheduled", remarks: "", follow_up_date: "",
  });

  // Filters (admin/manager)
  const [search, setSearch] = useState("");
  const [fManager, setFManager] = useState("all");
  const [fSales, setFSales] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [fCustomer, setFCustomer] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: leads } = useQuery({
    queryKey: ["site-visits-leads", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("id, customer_name, mobile").eq("assigned_to", user!.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: isSales,
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
        manager_name: nameMap.get(managerFor.get(v.sales_id)) || nameMap.get(v.manager_id) || "—",
        manager_id_resolved: managerFor.get(v.sales_id) || v.manager_id,
      }));
    },
  });

  const managers = useMemo(() => {
    const map = new Map<string, string>();
    (data || []).forEach((v: any) => { if (v.manager_id_resolved) map.set(v.manager_id_resolved, v.manager_name); });
    return Array.from(map.entries());
  }, [data]);

  const salesList = useMemo(() => {
    const map = new Map<string, string>();
    (data || []).forEach((v: any) => { if (v.sales_id) map.set(v.sales_id, v.sales_name); });
    return Array.from(map.entries());
  }, [data]);

  const filtered = useMemo(() => {
    let rows = data || [];
    if (isSales) rows = rows.filter((v: any) => v.sales_id === user?.id);
    if (fManager !== "all") rows = rows.filter((v: any) => v.manager_id_resolved === fManager);
    if (fSales !== "all") rows = rows.filter((v: any) => v.sales_id === fSales);
    if (fStatus !== "all") rows = rows.filter((v: any) => (v.status || v.interest_level) === fStatus);
    if (fCustomer) rows = rows.filter((v: any) => v.customer_name?.toLowerCase().includes(fCustomer.toLowerCase()));
    if (dateFrom) rows = rows.filter((v: any) => v.visit_date >= dateFrom);
    if (dateTo) rows = rows.filter((v: any) => v.visit_date <= dateTo);
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter((v: any) => v.customer_name?.toLowerCase().includes(s) || v.phone_number?.toLowerCase().includes(s) || v.sales_name?.toLowerCase().includes(s));
    }
    return rows;
  }, [data, isSales, user, fManager, fSales, fStatus, fCustomer, dateFrom, dateTo, search]);

  const onSelectLead = (id: string) => {
    const l = (leads || []).find((x: any) => x.id === id);
    setForm((f) => ({ ...f, lead_id: id, customer_name: l?.customer_name || f.customer_name, phone_number: l?.mobile || f.phone_number }));
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
        lead_id: form.lead_id || null,
        customer_name: form.customer_name,
        phone_number: form.phone_number,
        project_name: form.project_name || null,
        visit_date: form.visit_date,
        visit_time: form.visit_time || null,
        status: form.status,
        interest_level: "Interested" as any,
        remarks: form.remarks || null,
        follow_up_date: form.follow_up_date || null,
        image_urls: uploaded,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Site visit saved");
      setOpen(false); setFiles([]);
      setForm({ lead_id: "", customer_name: "", phone_number: "", project_name: "", visit_date: new Date().toISOString().slice(0, 10), visit_time: new Date().toTimeString().slice(0, 5), status: "Scheduled", remarks: "", follow_up_date: "" });
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

  const exportExcel = () => {
    const rows = filtered.map((v: any, i: number) => ({
      "Site Visit ID": v.id.slice(0, 8),
      "Sales Executive": v.sales_name,
      "Manager": v.manager_name,
      "Customer": v.customer_name,
      "Mobile": v.phone_number,
      "Project/Site": v.project_name || "—",
      "Visit Date": v.visit_date,
      "Visit Time": v.visit_time || "—",
      "Status": v.status || v.interest_level,
      "Feedback": v.remarks || "—",
      "Next Follow-up": v.follow_up_date || "—",
      "Created": new Date(v.created_at).toLocaleString(),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Site Visits");
    XLSX.writeFile(wb, `site-visits-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3 print:hidden">
        <div>
          <h2 className="text-3xl font-extrabold">Site Visits</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {isSales ? "Log and track your site visits" : "Centralized reporting of all site visits"}
          </p>
        </div>
        <div className="flex gap-2">
          {!isSales && (
            <>
              <Button variant="outline" onClick={exportExcel}><FileSpreadsheet className="mr-2 h-4 w-4" />Export Excel</Button>
              <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print / PDF</Button>
            </>
          )}
          {isSales && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Site Visit</Button></DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Site Visit</DialogTitle>
                  <DialogDescription>Log a new site visit for a customer/lead.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <Select value={form.lead_id} onValueChange={onSelectLead}>
                    <SelectTrigger><SelectValue placeholder="Select Customer / Lead (optional)" /></SelectTrigger>
                    <SelectContent>
                      {(leads || []).map((l: any) => (
                        <SelectItem key={l.id} value={l.id}>{l.customer_name} — {l.mobile}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Customer Name *" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
                    <Input placeholder="Mobile Number *" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
                  </div>
                  <Input placeholder="Project / Site Name" value={form.project_name} onChange={(e) => setForm({ ...form, project_name: e.target.value })} />
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Visit Date *</label>
                      <Input type="date" value={form.visit_date} onChange={(e) => setForm({ ...form, visit_date: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Visit Time</label>
                      <Input type="time" value={form.visit_time} onChange={(e) => setForm({ ...form, visit_time: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Next Follow-up</label>
                      <Input type="date" value={form.follow_up_date} onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Visit Status</label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{VISIT_STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Textarea placeholder="Customer Feedback" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
                  <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files || []))} />
                  <Button variant="outline" type="button" className="w-full" onClick={() => fileRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />{files.length ? `${files.length} photo(s) selected` : "Upload Photos (optional)"}
                  </Button>
                  <Button className="w-full" disabled={busy} onClick={() => submit.mutate()}>{busy ? "Saving..." : "Save Site Visit"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {!isSales && (
        <Card className="print:hidden">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search customer, mobile, sales..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Input placeholder="Filter by customer name" value={fCustomer} onChange={(e) => setFCustomer(e.target.value)} />
              <Select value={fManager} onValueChange={setFManager}>
                <SelectTrigger><SelectValue placeholder="Manager" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Managers</SelectItem>
                  {managers.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={fSales} onValueChange={setFSales}>
                <SelectTrigger><SelectValue placeholder="Sales Executive" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sales</SelectItem>
                  {salesList.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={fStatus} onValueChange={setFStatus}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {VISIT_STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <div>
                <label className="text-xs text-muted-foreground">From</label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">To</label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <Button variant="ghost" onClick={() => { setSearch(""); setFManager("all"); setFSales("all"); setFStatus("all"); setFCustomer(""); setDateFrom(""); setDateTo(""); }}>Clear Filters</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card><CardContent className="p-0 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Sales Executive</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Project/Site</TableHead>
              <TableHead>Visit Date &amp; Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Feedback</TableHead>
              <TableHead>Next Follow-up</TableHead>
              <TableHead>Created</TableHead>
              {isAdmin && <TableHead className="print:hidden">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">No site visits found</TableCell></TableRow>
            ) : filtered.map((v: any) => (
              <TableRow key={v.id}>
                <TableCell className="font-mono text-xs">{v.id.slice(0, 8)}</TableCell>
                <TableCell className="font-medium">{v.sales_name}</TableCell>
                <TableCell>{v.manager_name}</TableCell>
                <TableCell>{v.customer_name}</TableCell>
                <TableCell>{v.phone_number}</TableCell>
                <TableCell>{v.project_name || "—"}</TableCell>
                <TableCell>{v.visit_date} {v.visit_time || ""}</TableCell>
                <TableCell><Badge variant="outline">{v.status || v.interest_level}</Badge></TableCell>
                <TableCell className="max-w-[220px] truncate">{v.remarks || "—"}</TableCell>
                <TableCell>{v.follow_up_date || "—"}</TableCell>
                <TableCell className="text-xs">{new Date(v.created_at).toLocaleDateString()}</TableCell>
                {isAdmin && (
                  <TableCell className="print:hidden">
                    <Button size="icon" variant="ghost" onClick={() => setDetail(v)}><Eye className="h-4 w-4" /></Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Site Visit Details</DialogTitle>
            <DialogDescription>Complete record of the site visit.</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-2 text-sm">
              {[
                ["ID", detail.id],
                ["Sales Executive", detail.sales_name],
                ["Manager", detail.manager_name],
                ["Customer", detail.customer_name],
                ["Mobile", detail.phone_number],
                ["Project/Site", detail.project_name || "—"],
                ["Visit Date", detail.visit_date],
                ["Visit Time", detail.visit_time || "—"],
                ["Status", detail.status || detail.interest_level],
                ["Feedback", detail.remarks || "—"],
                ["Next Follow-up", detail.follow_up_date || "—"],
                ["Created", new Date(detail.created_at).toLocaleString()],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between border-b py-1.5">
                  <span className="text-muted-foreground">{k}</span><span className="font-medium text-right">{v as any}</span>
                </div>
              ))}
              {(detail.image_urls || []).length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-2 mt-3">Photos</p>
                  <div className="flex gap-2 flex-wrap">
                    {(detail.image_urls || []).map((p: string, i: number) => (
                      <Button key={i} size="sm" variant="outline" onClick={() => openImage(p)}>
                        <ImageIcon className="h-3.5 w-3.5 mr-1" />Photo {i + 1}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Site Visit Photo</DialogTitle>
            <DialogDescription>View or download the uploaded photo.</DialogDescription>
          </DialogHeader>
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
