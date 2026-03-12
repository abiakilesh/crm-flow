import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ProjectFilter } from "@/components/shared/ProjectFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trash2, Plus, Download } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";

export default function AdFundPayment() {
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  const [projectFilter, setProjectFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ paid_date: "", paid_amount: "" });
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: payments, isLoading } = useQuery({
    queryKey: ["ad_fund_payments", projectFilter],
    queryFn: async () => {
      let q = supabase
        .from("ad_fund_payments" as any)
        .select("*, projects(name)")
        .order("paid_date", { ascending: false });
      if (projectFilter !== "all") q = q.eq("project_id", projectFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const addPayment = useMutation({
    mutationFn: async () => {
      const insert: any = {
        paid_date: form.paid_date,
        paid_amount: parseFloat(form.paid_amount),
        created_by: user?.id,
      };
      if (projectFilter !== "all") insert.project_id = projectFilter;
      const { error } = await supabase.from("ad_fund_payments" as any).insert(insert);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad_fund_payments"] });
      toast.success("Payment added");
      setForm({ paid_date: "", paid_amount: "" });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deletePayment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ad_fund_payments" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad_fund_payments"] });
      toast.success("Payment deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles-map"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name");
      return data || [];
    },
  });

  const getCreatorName = (userId: string | null) => {
    if (!userId) return "—";
    const p = profiles?.find((pr) => pr.user_id === userId);
    return p?.full_name || "—";
  };

  // Filter by date range
  const filtered = (payments || []).filter((p) => {
    if (dateFrom && p.paid_date < dateFrom) return false;
    if (dateTo && p.paid_date > dateTo) return false;
    return true;
  });

  const totalAmount = filtered.reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);

  const exportToExcel = () => {
    if (!filtered.length) {
      toast.error("No data to export");
      return;
    }
    const rows = filtered.map((p, i) => ({
      "SNo": i + 1,
      "Paid Date": format(new Date(p.paid_date), "dd-MM-yyyy"),
      "Paid Amount": Number(p.paid_amount).toFixed(2),
      "Created At": format(new Date(p.created_at), "dd-MM-yyyy"),
      "Created By": getCreatorName(p.created_by),
    }));
    rows.push({ "SNo": "" as any, "Paid Date": "Total", "Paid Amount": totalAmount.toFixed(2), "Created At": "", "Created By": "" });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ad Fund Payments");
    XLSX.writeFile(wb, `ad_fund_payments_${dateFrom || "all"}_${dateTo || "all"}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-foreground">Ad Fund Payments</h2>
        <div className="flex items-center gap-2">
          <ProjectFilter value={projectFilter} onChange={setProjectFilter} />
          <Button variant="outline" onClick={exportToExcel}>
            <Download className="mr-2 h-4 w-4" /> Export Excel
          </Button>
          {role === "admin" && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Add Payment</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Payment</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    addPayment.mutate();
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Paid Date *</label>
                    <Input
                      type="date"
                      value={form.paid_date}
                      onChange={(e) => setForm({ ...form, paid_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Paid Amount *</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="₹ 0.00"
                      value={form.paid_amount}
                      onChange={(e) => setForm({ ...form, paid_amount: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={addPayment.isPending}>
                    {addPayment.isPending ? "Submitting..." : "Submit"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Date range filter */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">From:</label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-auto" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">To:</label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-auto" />
        </div>
        {(dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); }}>
            Clear
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">SNo</TableHead>
                <TableHead>Paid Date</TableHead>
                <TableHead>Paid Amount</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Created By</TableHead>
                {role === "admin" && <TableHead className="w-20">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No payments found</TableCell>
                </TableRow>
              ) : (
                filtered.map((p, i) => (
                  <TableRow key={p.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{format(new Date(p.paid_date), "dd-MM-yyyy")}</TableCell>
                    <TableCell>₹ {Number(p.paid_amount).toFixed(2)}</TableCell>
                    <TableCell>{format(new Date(p.created_at), "dd-MM-yyyy")}</TableCell>
                    <TableCell>{getCreatorName(p.created_by)}</TableCell>
                    {role === "admin" && (
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => deletePayment.mutate(p.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
              {filtered.length > 0 && (
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={2}>Total</TableCell>
                  <TableCell>₹ {totalAmount.toFixed(2)}</TableCell>
                  <TableCell colSpan={role === "admin" ? 3 : 2} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
