import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(210, 80%, 55%)", "hsl(150, 60%, 45%)", "hsl(35, 90%, 55%)", "hsl(280, 60%, 55%)", "hsl(0, 70%, 55%)"];

export default function Analytics() {
  const { role } = useAuth();

  const { data } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const [callsRes, financeRes, projectsRes] = await Promise.all([
        supabase.from("call_logs").select("*, projects(name)"),
        supabase.from("finance").select("total_amount, share_amount"),
        supabase.from("projects").select("id, name").eq("status", "active"),
      ]);
      const calls = callsRes.data || [];
      const finance = financeRes.data || [];
      const projects = projectsRes.data || [];

      const today = new Date().toISOString().split("T")[0];
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
      const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

      const projectCalls = projects.map((p) => ({
        name: p.name,
        calls: calls.filter((c) => c.project_id === p.id).length,
      }));

      return {
        overallCalls: calls.length,
        dropCalls: calls.filter((c) => c.status === "dropped").length,
        todayCalls: calls.filter((c) => c.call_date === today).length,
        weeklyCalls: calls.filter((c) => c.call_date >= weekAgo).length,
        monthlyCalls: calls.filter((c) => c.call_date >= monthAgo).length,
        totalAmount: finance.reduce((s, r) => s + Number(r.total_amount), 0),
        shareAmount: finance.reduce((s, r) => s + Number(r.share_amount), 0),
        projectCalls,
      };
    },
  });

  const metrics = [
    { label: "Overall Calls", value: data?.overallCalls ?? 0 },
    { label: "Drop Calls", value: data?.dropCalls ?? 0 },
    { label: "Today's Calls", value: data?.todayCalls ?? 0 },
    { label: "Weekly Calls", value: data?.weeklyCalls ?? 0 },
    { label: "Monthly Calls", value: data?.monthlyCalls ?? 0 },
    { label: "Total Amount", value: `₹${(data?.totalAmount ?? 0).toLocaleString()}` },
    { label: "Total Share", value: `₹${(data?.shareAmount ?? 0).toLocaleString()}` },
  ];

  if (role === "admin") {
    metrics.push({ label: "Profit", value: `₹${((data?.totalAmount ?? 0) - (data?.shareAmount ?? 0)).toLocaleString()}` });
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Analytics Dashboard</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{m.label}</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{m.value}</p></CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Calls by Project</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.projectCalls || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="calls" fill="hsl(210, 80%, 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Call Status Distribution</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: "Completed", value: (data?.overallCalls ?? 0) - (data?.dropCalls ?? 0) },
                    { name: "Dropped", value: data?.dropCalls ?? 0 },
                  ]}
                  cx="50%" cy="50%" outerRadius={100} dataKey="value" label
                >
                  <Cell fill="hsl(150, 60%, 45%)" />
                  <Cell fill="hsl(0, 70%, 55%)" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
