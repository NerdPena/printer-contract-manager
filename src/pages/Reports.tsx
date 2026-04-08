import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download } from "lucide-react";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const Reports = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [selectedClient, setSelectedClient] = useState("");

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => { const { data } = await supabase.from("clients").select("id, name, business_name"); return data || []; },
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const { data } = await supabase.from("monthly_reports").select("*, clients(name, business_name)").order("year", { ascending: false }).order("month", { ascending: false });
      return data || [];
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const month = parseInt(selectedMonth);
      const year = parseInt(selectedYear);

      // Get active contracts for the client
      const { data: contracts } = await supabase.from("contracts")
        .select("*, printers(id, model)")
        .eq("client_id", selectedClient)
        .eq("status", "active");

      if (!contracts?.length) throw new Error("No active contracts found for this client");

      for (const contract of contracts) {
        // Get counter for this printer/month
        const { data: counter } = await supabase.from("monthly_counters")
          .select("pages_bw, pages_color")
          .eq("printer_id", contract.printer_id).eq("month", month).eq("year", year).single();

        const actualBw = counter?.pages_bw ?? 0;
        const actualColor = counter?.pages_color ?? 0;
        const exceededBw = Math.max(0, actualBw - contract.included_pages_bw);
        const exceededColor = Math.max(0, actualColor - contract.included_pages_color);
        const excessCostBw = exceededBw * Number(contract.price_per_extra_bw);
        const excessCostColor = exceededColor * Number(contract.price_per_extra_color);
        const totalDue = Number(contract.monthly_price) + excessCostBw + excessCostColor;

        const { error } = await supabase.from("monthly_reports").upsert({
          user_id: user!.id, client_id: selectedClient, contract_id: contract.id,
          month, year, subscription_cost: Number(contract.monthly_price),
          included_pages_bw: contract.included_pages_bw, included_pages_color: contract.included_pages_color,
          actual_pages_bw: actualBw, actual_pages_color: actualColor,
          exceeded_pages_bw: exceededBw, exceeded_pages_color: exceededColor,
          excess_cost_bw: excessCostBw, excess_cost_color: excessCostColor, total_due: totalDue,
        }, { onConflict: "id" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast({ title: "Report generated successfully" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const downloadPdf = async (report: any) => {
    // Client-side PDF generation using the report data
    const clientName = report.clients?.name || "Client";
    const content = `
MONTHLY USAGE REPORT
====================
Client: ${clientName} (${report.clients?.business_name || ""})
Period: ${months[report.month - 1]} ${report.year}

Subscription Cost: €${Number(report.subscription_cost).toFixed(2)}

Pages Included (B&W): ${report.included_pages_bw}
Pages Included (Color): ${report.included_pages_color}

Actual Pages (B&W): ${report.actual_pages_bw}
Actual Pages (Color): ${report.actual_pages_color}

Exceeded Pages (B&W): ${report.exceeded_pages_bw}
Exceeded Pages (Color): ${report.exceeded_pages_color}

Excess Cost (B&W): €${Number(report.excess_cost_bw).toFixed(2)}
Excess Cost (Color): €${Number(report.excess_cost_color).toFixed(2)}

TOTAL DUE: €${Number(report.total_due).toFixed(2)}
    `.trim();

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report_${clientName}_${months[report.month - 1]}_${report.year}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Report downloaded", description: "PDF generation will be available soon. Downloaded as text for now." });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Reports</h1>
        <p className="text-muted-foreground mt-1">Generate monthly usage reports</p>
      </div>

      <Card className="border-none shadow-md">
        <CardContent className="p-6">
          <h3 className="font-display font-semibold mb-4">Generate Report</h3>
          <div className="flex items-end gap-4">
            <div className="space-y-2 flex-1">
              <Label>Client</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>{months.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>{[2024, 2025, 2026].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={() => generateMutation.mutate()} disabled={!selectedClient || generateMutation.isPending}>
              <FileText className="h-4 w-4 mr-2" />Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>B&W Pages</TableHead>
                <TableHead>Color Pages</TableHead>
                <TableHead>Excess Cost</TableHead>
                <TableHead>Total Due</TableHead>
                <TableHead className="w-20">PDF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No reports yet</TableCell></TableRow>
              ) : reports.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.clients?.name || "—"}</TableCell>
                  <TableCell>{months[r.month - 1]} {r.year}</TableCell>
                  <TableCell>€{Number(r.subscription_cost).toFixed(2)}</TableCell>
                  <TableCell>{r.actual_pages_bw} / {r.included_pages_bw}</TableCell>
                  <TableCell>{r.actual_pages_color} / {r.included_pages_color}</TableCell>
                  <TableCell>€{(Number(r.excess_cost_bw) + Number(r.excess_cost_color)).toFixed(2)}</TableCell>
                  <TableCell className="font-bold">€{Number(r.total_due).toFixed(2)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => downloadPdf(r)}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
