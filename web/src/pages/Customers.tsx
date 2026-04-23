import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Search, User, Pencil, Trash2, Loader2, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import type { Customer } from "@/types/db";

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    } else {
      setCustomers(data || []);
    }
    setLoading(false);
  }

  function openEditDialog(customer: Customer) {
    setSelectedCustomer({ id: customer.id, name: customer.name || "" });
    setIsDialogOpen(true);
  }

  async function updateCustomer() {
    if (!selectedCustomer) return;

    setSaving(true);
    const { error } = await supabase
      .from("customers")
      .update({ name: selectedCustomer.name })
      .eq("id", selectedCustomer.id);

    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Cliente atualizado!" });
      setIsDialogOpen(false);
      loadCustomers();
    }
    setSaving(false);
  }

  async function removeCustomer(id: string) {
    if (!confirm("Remover este cliente? Isso também removerá o histórico de conversas.")) return;

    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Cliente removido" });
      loadCustomers();
    }
  }

  const filtered = customers.filter((c) =>
    !search ||
    (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
        <p className="text-sm text-muted-foreground">Todos os contatos que já interagiram com o seu WhatsApp.</p>
      </div>

      <Card className="card-elevated">
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
          ) : (
            <div className="rounded-md border">
              <div className="grid grid-cols-1 divide-y sm:grid-cols-1">
                {filtered.map((customer) => (
                  <div key={customer.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {customer.name ? customer.name.substring(0, 2).toUpperCase() : <User className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium">{customer.name || "Sem nome"}</h3>
                        <p className="text-sm text-muted-foreground">{customer.phone}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          Desde: {format(new Date(customer.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild className="hidden sm:flex">
                        <Link to={`/conversas?customer=${customer.id}`}>
                          <MessageSquare className="mr-2 h-3.5 w-3.5" /> Conversa
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(customer)}>
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => removeCustomer(customer.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal para Editar Nome do Cliente */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do Cliente</label>
              <Input
                placeholder="Como você quer identificar este cliente?"
                value={selectedCustomer?.name || ""}
                onChange={(e) => setSelectedCustomer(prev => prev ? { ...prev, name: e.target.value } : null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={updateCustomer} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}