import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, LineChart, Line } from "recharts";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";

const RANGES = { today: 0, last7: 6, last15: 14, last30: 29 };

export default function Reports() {
  const [range, setRange] = useState<"today" | "last7" | "last15" | "last30" | "custom">("last7");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { fromDate, toDate } = useMemo(() => {
    if (range === "custom") return { fromDate: from, toDate: to };
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const back = new Date(t); back.setDate(t.getDate() - RANGES[range]);
    return { fromDate: back.toISOString().slice(0, 10), toDate: t.toISOString().slice(0, 10) };
  }, [range, from, to]);

  const { data } = useQuery({
    queryKey: ["reports", fromDate, toDate],
    enabled: !!fromDate && !!toDate,
    queryFn: async () => {
      const [calls, visits, leads] = await Promise.all([
        supabase.from("call_logs").select("*").gte("call_date", fromDate).lte("call_date", toDate),
        supabase.from("site_visits").select("*").gte("visit_date", fromDate).lte("visit_date", toDate),
        supabase.from("leads").select("*").gte("created_at", fromDate).lte("created_at", toDate + "T23:59:59"),
      ]);
      const daysMap = new Map<string, { day: string; calls: number; visits: number; converted: number }>();
      for (let d = new Date(fromDate); d <= new Date(toDate); d.setDate(d.getDate() + 1)) {
        const k = d.toISOString().slice(0, 10);
        daysMap.set(k, { day: k.slice(5), calls: 0, visits: 0, converted: 0 });
      }
      (calls.data || []).forEach((c: any) => { const r = daysMap.get(c.call_date); if (r) r.calls++; });
      (visits.data || []).forEach((v: any) => { const r = daysMap.get(v.visit_date); if (r) r.visits++; });
      (leads.data || []).filter((l: any) => l.status === "Closed").forEach((l: any) => {
        const k = l.created_at?.slice(0, 10); const r = daysMap.get(k); if (r) r.converted++;
      });
      const totalCalls = (calls.data || []).length;
      const converted = (leads.data || []).filter((l: any) => l.status === "Closed").length;
      const total = Math.max((leads.data || []).length, 1);
      return {
        totalCalls,
        talkTime: (calls.data || []).reduce((s: number, c: any) => s + (c.duration_minutes || 0), 0),
        followups: (calls.data || []).filter((c: any) => c.follow_up_at).length,
        visits: (visits.data || []).length,
        meetings: (visits.data || []).length,
        converted,
        performance: Math.round((converted / total) * 100),
        chart: Array.from(daysMap.values()),
        rawCalls: calls.data || [],
        rawVisits: visits.data || [],
      };
    },
  });

  const exportExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.rawCalls), "Calls");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.rawVisits), "Site Visits");
    XLSX.writeFile(wb, `report_${fromDate}_${toDate}.xlsx`);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-3xl font-extrabold">Reports</h2>
        <p className="text-muted-foreground text-sm mt-1">Performance analytics with export</p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <Select value={range} onValueChange={(v: any) => setRange(v)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="last7">Last 7 Days</SelectItem>
            <SelectItem value="last15">Last 15 Days</SelectItem>
            <SelectItem value="last30">Last 30 Days</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>
        {range === "custom" && (
          <>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[160px]" />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[160px]" />
          </>
        )}
        <Button variant="outline" onClick={exportExcel}><Download className="mr-2 h-4 w-4" />Export Excel</Button>
        <Button variant="outline" onClick={() => window.print()}><Download className="mr-2 h-4 w-4" />Print/PDF</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        {[
          { l: "Total Calls", v: data?.totalCalls ?? 0 },
          { l: "Total Talk Time", v: (data?.talkTime ?? 0) + "m" },
          { l: "Follow-ups", v: data?.followups ?? 0 },
          { l: "Site Visits", v: data?.visits ?? 0 },
          { l: "Meetings", v: data?.meetings ?? 0 },
          { l: "Converted Leads", v: data?.converted ?? 0 },
          { l: "Performance %", v: (data?.performance ?? 0) + "%" },
        ].map((c) => (
          <Card key={c.l}><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">{c.l}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{c.v}</p></CardContent></Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Daily Calls</CardTitle></CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer><BarChart data={data?.chart || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" fontSize={11} /><YAxis fontSize={11} allowDecimals={false} />
              <Tooltip /><Bar dataKey="calls" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart></ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Site Visits & Conversions</CardTitle></CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer><LineChart data={data?.chart || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" fontSize={11} /><YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="visits" stroke="hsl(var(--primary))" />
              <Line type="monotone" dataKey="converted" stroke="#10b981" />
            </LineChart></ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}