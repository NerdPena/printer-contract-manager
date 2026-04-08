import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Printer, FileText, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const StatCard = ({ title, value, icon: Icon, color }: { title: string; value: number; icon: any; color: string }) => (
  <Card className="border-none shadow-md">
    <CardContent className="flex items-center gap-4 p-6">
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-3xl font-display font-bold text-foreground">{value}</p>
      </div>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const { user } = useAuth();

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("*");
      return data || [];
    },
  });

  const { data: printers = [] } = useQuery({
    queryKey: ["printers"],
    queryFn: async () => {
      const { data } = await supabase.from("printers").select("*");
      return data || [];
    },
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["contracts"],
    queryFn: async () => {
      const { data } = await supabase.from("contracts").select("*");
      return data || [];
    },
  });

  const activeContracts = contracts.filter((c) => c.status === "active");
  const expiringContracts = contracts.filter((c) => {
    if (!c.end_date || c.status !== "active") return false;
    const daysLeft = (new Date(c.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysLeft <= 30 && daysLeft > 0;
  });

  const chartData = [
    { name: "Active", count: activeContracts.length },
    { name: "Expired", count: contracts.filter((c) => c.status === "expired").length },
    { name: "Cancelled", count: contracts.filter((c) => c.status === "cancelled").length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back! Here's your overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Clients" value={clients.length} icon={Users} color="bg-primary" />
        <StatCard title="Printers" value={printers.length} icon={Printer} color="bg-secondary" />
        <StatCard title="Active Contracts" value={activeContracts.length} icon={FileText} color="bg-success" />
        <StatCard title="Expiring Soon" value={expiringContracts.length} icon={AlertTriangle} color="bg-accent" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="font-display">Contract Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="font-display">Recent Clients</CardTitle>
          </CardHeader>
          <CardContent>
            {clients.length === 0 ? (
              <p className="text-muted-foreground text-sm">No clients yet. Add your first client to get started.</p>
            ) : (
              <div className="space-y-3">
                {clients.slice(0, 5).map((client) => (
                  <div key={client.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-foreground">{client.name}</p>
                      <p className="text-sm text-muted-foreground">{client.business_name || "—"}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{client.email || "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
