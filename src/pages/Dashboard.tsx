import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Phone, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const { role } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [leads, sales, calls, finance] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("sales").select("id", { count: "exact", head: true }),
        supabase.from("call_logs").select("id", { count: "exact", head: true }),
        supabase.from("finance").select("total_amount, share_amount"),
      ]);
      const totalAmount = (finance.data || []).reduce((s, r) => s + Number(r.total_amount), 0);
      const shareAmount = (finance.data || []).reduce((s, r) => s + Number(r.share_amount), 0);
      return {
        leads: leads.count || 0,
        sales: sales.count || 0,
        calls: calls.count || 0,
        totalAmount,
        shareAmount,
        profit: totalAmount - shareAmount,
      };
    },
  });

  const cards = [
    { title: "Total Leads", value: stats?.leads ?? 0, icon: Users, color: "text-blue-600" },
    { title: "Total Sales", value: stats?.sales ?? 0, icon: TrendingUp, color: "text-green-600" },
    { title: "Total Calls", value: stats?.calls ?? 0, icon: Phone, color: "text-orange-600" },
    { title: "Total Revenue", value: `₹${(stats?.totalAmount ?? 0).toLocaleString()}`, icon: DollarSign, color: "text-emerald-600" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Dashboard Overview</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {role === "admin" && stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Profit (Admin Only)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">₹{stats.profit.toLocaleString()}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
