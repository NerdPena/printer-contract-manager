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

const emptyForm = { model: "", serial_number: "", client_id: "", initial_counter_bw: "0", initial_counter_color: "0", status: "active", notes: "" };

const statusColors: Record<string, string> = {
  active: "bg-success text-success-foreground",
  inactive: "bg-muted text-muted-foreground",
  maintenance: "bg-accent text-accent-foreground",
};

const Printers = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: printers = [] } = useQuery({
    queryKey: ["printers"],
    queryFn: async () => {
      const { data } = await supabase.from("printers").select("*, clients(name)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name");
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        model: form.model,
        serial_number: form.serial_number,
        client_id: form.client_id || null,
        initial_counter_bw: parseInt(form.initial_counter_bw),
        initial_counter_color: parseInt(form.initial_counter_color),
        status: form.status,
        notes: form.notes || null,
      };
      if (editId) {
        const { error } = await supabase.from("printers").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("printers").insert({ ...payload, user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["printers"] });
      toast({ title: editId ? "Printer updated" : "Printer added" });
      setOpen(false); setForm(emptyForm); setEditId(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("printers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["printers"] });
      toast({ title: "Printer deleted" });
    },
  });

  const openEdit = (p: any) => {
    setEditId(p.id);
    setForm({ model: p.model, serial_number: p.serial_number, client_id: p.client_id || "", initial_counter_bw: String(p.initial_counter_bw), initial_counter_color: String(p.initial_counter_color), status: p.status, notes: p.notes || "" });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Printers</h1>
          <p className="text-muted-foreground mt-1">Track all leased printers</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Printer</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="font-display">{editId ? "Edit Printer" : "New Printer"}</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Model *</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Serial Number *</Label><Input value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Assign to Client</Label>
                  <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Initial B&W Counter</Label><Input type="number" value={form.initial_counter_bw} onChange={(e) => setForm({ ...form, initial_counter_bw: e.target.value })} /></div>
                <div className="space-y-2"><Label>Initial Color Counter</Label><Input type="number" value={form.initial_counter_color} onChange={(e) => setForm({ ...form, initial_counter_color: e.target.value })} /></div>
              </div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : editId ? "Update" : "Add Printer"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>S/N</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>B&W Counter</TableHead>
                <TableHead>Color Counter</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {printers.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No printers yet</TableCell></TableRow>
              ) : printers.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.model}</TableCell>
                  <TableCell className="font-mono text-sm">{p.serial_number}</TableCell>
                  <TableCell>{p.clients?.name || "—"}</TableCell>
                  <TableCell>{p.initial_counter_bw.toLocaleString()}</TableCell>
                  <TableCell>{p.initial_counter_color.toLocaleString()}</TableCell>
                  <TableCell><Badge className={statusColors[p.status]}>{p.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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

export default Printers;
