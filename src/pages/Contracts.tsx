import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

const emptyForm = {
  client_id: "", printer_id: "", subscription_name: "", monthly_price: "0",
  included_pages_bw: "0", included_pages_color: "0",
  price_per_extra_bw: "0", price_per_extra_color: "0",
  start_date: new Date().toISOString().split("T")[0], end_date: "", status: "active", notes: "",
};

const statusColors: Record<string, string> = {
  active: "bg-success text-success-foreground",
  expired: "bg-destructive text-destructive-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

const Contracts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: contracts = [] } = useQuery({
    queryKey: ["contracts"],
    queryFn: async () => {
      const { data } = await supabase.from("contracts").select("*, clients(name), printers(model, serial_number)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: async () => { const { data } = await supabase.from("clients").select("id, name"); return data || []; } });
  const { data: printers = [] } = useQuery({ queryKey: ["printers"], queryFn: async () => { const { data } = await supabase.from("printers").select("id, model, serial_number"); return data || []; } });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        client_id: form.client_id, printer_id: form.printer_id, subscription_name: form.subscription_name,
        monthly_price: parseFloat(form.monthly_price), included_pages_bw: parseInt(form.included_pages_bw),
        included_pages_color: parseInt(form.included_pages_color), price_per_extra_bw: parseFloat(form.price_per_extra_bw),
        price_per_extra_color: parseFloat(form.price_per_extra_color), start_date: form.start_date,
        end_date: form.end_date || null, status: form.status, notes: form.notes || null,
      };
      if (editId) {
        const { error } = await supabase.from("contracts").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("contracts").insert({ ...payload, user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast({ title: editId ? "Contract updated" : "Contract created" });
      setOpen(false); setForm(emptyForm); setEditId(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("contracts").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["contracts"] }); toast({ title: "Contract deleted" }); },
  });

  const openEdit = (c: any) => {
    setEditId(c.id);
    setForm({
      client_id: c.client_id, printer_id: c.printer_id, subscription_name: c.subscription_name,
      monthly_price: String(c.monthly_price), included_pages_bw: String(c.included_pages_bw),
      included_pages_color: String(c.included_pages_color), price_per_extra_bw: String(c.price_per_extra_bw),
      price_per_extra_color: String(c.price_per_extra_color), start_date: c.start_date,
      end_date: c.end_date || "", status: c.status, notes: c.notes || "",
    });
    setOpen(true);
  };

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Contracts</h1>
          <p className="text-muted-foreground mt-1">Manage printer lease subscriptions</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Contract</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display">{editId ? "Edit Contract" : "New Contract"}</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Client *</Label>
                  <Select value={form.client_id} onValueChange={(v) => set("client_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Printer *</Label>
                  <Select value={form.printer_id} onValueChange={(v) => set("printer_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Select printer" /></SelectTrigger>
                    <SelectContent>{printers.map((p) => <SelectItem key={p.id} value={p.id}>{p.model} ({p.serial_number})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Subscription Name *</Label><Input value={form.subscription_name} onChange={(e) => set("subscription_name", e.target.value)} required /></div>
                <div className="space-y-2"><Label>Monthly Price</Label><Input type="number" step="0.01" value={form.monthly_price} onChange={(e) => set("monthly_price", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Included B&W Pages/mo</Label><Input type="number" value={form.included_pages_bw} onChange={(e) => set("included_pages_bw", e.target.value)} /></div>
                <div className="space-y-2"><Label>Included Color Pages/mo</Label><Input type="number" value={form.included_pages_color} onChange={(e) => set("included_pages_color", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Price/Extra B&W Page</Label><Input type="number" step="0.0001" value={form.price_per_extra_bw} onChange={(e) => set("price_per_extra_bw", e.target.value)} /></div>
                <div className="space-y-2"><Label>Price/Extra Color Page</Label><Input type="number" step="0.0001" value={form.price_per_extra_color} onChange={(e) => set("price_per_extra_color", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Start Date *</Label><Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} required /></div>
                <div className="space-y-2"><Label>End Date</Label><Input type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} /></div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => set("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : editId ? "Update" : "Create Contract"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Printer</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Price/mo</TableHead>
                <TableHead>B&W Incl.</TableHead>
                <TableHead>Color Incl.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No contracts yet</TableCell></TableRow>
              ) : contracts.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.clients?.name || "—"}</TableCell>
                  <TableCell>{c.printers?.model || "—"}</TableCell>
                  <TableCell>{c.subscription_name}</TableCell>
                  <TableCell>€{Number(c.monthly_price).toFixed(2)}</TableCell>
                  <TableCell>{c.included_pages_bw.toLocaleString()}</TableCell>
                  <TableCell>{c.included_pages_color.toLocaleString()}</TableCell>
                  <TableCell><Badge className={statusColors[c.status]}>{c.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
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

export default Contracts;
