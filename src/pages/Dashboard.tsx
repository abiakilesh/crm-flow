import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Phone, DollarSign, ArrowUpRight } from "lucide-react";
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
      return { leads: leads.count || 0, sales: sales.count || 0, calls: calls.count || 0, totalAmount, shareAmount, profit: totalAmount - shareAmount };
    },
  });

  const cards = [
    { title: "Total Leads", value: stats?.leads ?? 0, icon: Users, gradient: "from-blue-500/10 to-blue-600/5" },
    { title: "Total Sales", value: stats?.sales ?? 0, icon: TrendingUp, gradient: "from-emerald-500/10 to-emerald-600/5" },
    { title: "Total Calls", value: stats?.calls ?? 0, icon: Phone, gradient: "from-amber-500/10 to-amber-600/5" },
    { title: "Revenue", value: `₹${(stats?.totalAmount ?? 0).toLocaleString()}`, icon: DollarSign, gradient: "from-violet-500/10 to-violet-600/5" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Dashboard</h2>
        <p className="text-muted-foreground mt-1">Overview of your CRM metrics</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} className={`bg-gradient-to-br ${card.gradient} border-0 shadow-sm hover:shadow-md transition-shadow`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <div className="w-9 h-9 rounded-lg bg-background/80 flex items-center justify-center">
                <card.icon className="h-4 w-4 text-foreground/70" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-extrabold tracking-tight">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {role === "admin" && stats && (
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-0 shadow-sm max-w-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              Profit <span className="text-[10px] uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">Admin</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-extrabold tracking-tight text-emerald-600">₹{stats.profit.toLocaleString()}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
