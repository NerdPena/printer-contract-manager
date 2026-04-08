import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Mail } from "lucide-react";

const Counters = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ printer_id: "", month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()), counter_bw: "0", counter_color: "0" });
  const [emailText, setEmailText] = useState("");

  const { data: counters = [] } = useQuery({
    queryKey: ["counters"],
    queryFn: async () => {
      const { data } = await supabase.from("monthly_counters").select("*, printers(model, serial_number, initial_counter_bw, initial_counter_color)").order("year", { ascending: false }).order("month", { ascending: false });
      return data || [];
    },
  });

  const { data: printers = [] } = useQuery({
    queryKey: ["printers"],
    queryFn: async () => { const { data } = await supabase.from("printers").select("id, model, serial_number"); return data || []; },
  });

  const saveMutation = useMutation({
    mutationFn: async (source: string = "manual") => {
      const month = parseInt(form.month);
      const year = parseInt(form.year);
      const counter_bw = parseInt(form.counter_bw);
      const counter_color = parseInt(form.counter_color);

      // Find previous counter to calculate pages
      const { data: prev } = await supabase.from("monthly_counters")
        .select("counter_bw, counter_color")
        .eq("printer_id", form.printer_id)
        .or(`year.lt.${year},and(year.eq.${year},month.lt.${month})`)
        .order("year", { ascending: false }).order("month", { ascending: false }).limit(1);

      const printer = printers.find((p) => p.id === form.printer_id);
      const prevBw = prev?.[0]?.counter_bw ?? printer?.initial_counter_bw ?? 0;
      const prevColor = prev?.[0]?.counter_color ?? printer?.initial_counter_color ?? 0;

      const { error } = await supabase.from("monthly_counters").insert({
        user_id: user!.id, printer_id: form.printer_id, month, year,
        counter_bw, counter_color,
        pages_bw: Math.max(0, counter_bw - prevBw),
        pages_color: Math.max(0, counter_color - prevColor),
        source,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["counters"] });
      toast({ title: "Counter saved" });
      setOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const parseEmail = () => {
    // Basic parser - looks for B&W and Color counter values in plain text
    const bwMatch = emailText.match(/(?:b\s*(?:&|and)\s*w|black\s*(?:&|and)?\s*white|mono(?:chrome)?)\s*(?:counter|total|pages)?[\s:=]+(\d+)/i);
    const colorMatch = emailText.match(/(?:color|colour)\s*(?:counter|total|pages)?[\s:=]+(\d+)/i);

    if (bwMatch) setForm((f) => ({ ...f, counter_bw: bwMatch[1] }));
    if (colorMatch) setForm((f) => ({ ...f, counter_color: colorMatch[1] }));

    if (bwMatch || colorMatch) {
      toast({ title: "Counters extracted", description: `B&W: ${bwMatch?.[1] || "not found"}, Color: ${colorMatch?.[1] || "not found"}` });
    } else {
      toast({ title: "Could not parse", description: "No counter values found. Try manual entry.", variant: "destructive" });
    }
  };

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Counters</h1>
          <p className="text-muted-foreground mt-1">Monthly printer counter readings</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Counter</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="font-display">Add Monthly Counter</DialogTitle></DialogHeader>
            <Tabs defaultValue="manual">
              <TabsList className="w-full">
                <TabsTrigger value="manual" className="flex-1">Manual Entry</TabsTrigger>
                <TabsTrigger value="email" className="flex-1"><Mail className="h-4 w-4 mr-2" />Email Import</TabsTrigger>
              </TabsList>
              <TabsContent value="manual" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Printer *</Label>
                  <Select value={form.printer_id} onValueChange={(v) => setForm({ ...form, printer_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select printer" /></SelectTrigger>
                    <SelectContent>{printers.map((p) => <SelectItem key={p.id} value={p.id}>{p.model} ({p.serial_number})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Month</Label>
                    <Select value={form.month} onValueChange={(v) => setForm({ ...form, month: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{months.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Year</Label><Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>B&W Total Counter</Label><Input type="number" value={form.counter_bw} onChange={(e) => setForm({ ...form, counter_bw: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Color Total Counter</Label><Input type="number" value={form.counter_color} onChange={(e) => setForm({ ...form, counter_color: e.target.value })} /></div>
                </div>
                <Button className="w-full" onClick={() => saveMutation.mutate("manual")} disabled={saveMutation.isPending || !form.printer_id}>Save Counter</Button>
              </TabsContent>
              <TabsContent value="email" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Printer *</Label>
                  <Select value={form.printer_id} onValueChange={(v) => setForm({ ...form, printer_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select printer" /></SelectTrigger>
                    <SelectContent>{printers.map((p) => <SelectItem key={p.id} value={p.id}>{p.model} ({p.serial_number})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Paste email content</Label>
                  <Textarea rows={6} placeholder="Paste the counter email text here..." value={emailText} onChange={(e) => setEmailText(e.target.value)} />
                </div>
                <Button variant="secondary" className="w-full" onClick={parseEmail}>Extract Counters</Button>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>B&W Counter</Label><Input type="number" value={form.counter_bw} onChange={(e) => setForm({ ...form, counter_bw: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Color Counter</Label><Input type="number" value={form.counter_color} onChange={(e) => setForm({ ...form, counter_color: e.target.value })} /></div>
                </div>
                <Button className="w-full" onClick={() => saveMutation.mutate("email")} disabled={saveMutation.isPending || !form.printer_id}>Save Counter</Button>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Printer</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>B&W Counter</TableHead>
                <TableHead>Color Counter</TableHead>
                <TableHead>B&W Pages</TableHead>
                <TableHead>Color Pages</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {counters.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No counters yet</TableCell></TableRow>
              ) : counters.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.printers?.model || "—"}</TableCell>
                  <TableCell>{months[c.month - 1]} {c.year}</TableCell>
                  <TableCell>{c.counter_bw.toLocaleString()}</TableCell>
                  <TableCell>{c.counter_color.toLocaleString()}</TableCell>
                  <TableCell className="font-semibold">{c.pages_bw.toLocaleString()}</TableCell>
                  <TableCell className="font-semibold">{c.pages_color.toLocaleString()}</TableCell>
                  <TableCell><Badge variant={c.source === "email" ? "default" : "secondary"}>{c.source}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

// Need Badge import
import { Badge } from "@/components/ui/badge";

export default Counters;
