import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Send, Users, ShieldAlert, Plus, Trash2, Loader2, RefreshCw } from "lucide-react";
import { Customer, Campaign } from "@/types/db";

export default function Campaigns() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  
  // Nova Campanha
  const [name, setName] = useState("");
  const [variants, setVariants] = useState<string[]>([""]);
  const [batchSize, setBatchSize] = useState(10);
  const [pauseBatch, setPauseBatch] = useState(60);
  const [pauseMessage, setPauseMessage] = useState(5);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [custRes, campRes] = await Promise.all([
        supabase.from("customers").select("*").order("created_at", { ascending: false }),
        supabase.from("campaigns").select("*").order("created_at", { ascending: false })
      ]);

      if (custRes.error) throw custRes.error;
      if (campRes.error) throw campRes.error;

      setCustomers(custRes.data || []);
      setCampaigns(campRes.data || []);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao carregar dados", description: error.message });
    } finally {
      setLoading(false);
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedCustomerIds(customers.map(c => c.id));
    else setSelectedCustomerIds([]);
  };

  const handleSelectRandom = (count: number) => {
    const shuffled = [...customers].sort(() => 0.5 - Math.random());
    setSelectedCustomerIds(shuffled.slice(0, count).map(c => c.id));
  };

  const handleVariantChange = (index: number, value: string) => {
    const newVariants = [...variants];
    newVariants[index] = value;
    setVariants(newVariants);
  };

  const addVariant = () => setVariants([...variants, ""]);
  const removeVariant = (index: number) => {
    if (variants.length > 1) setVariants(variants.filter((_, i) => i !== index));
  };

  async function handleCreateCampaign() {
    if (!name || selectedCustomerIds.length === 0 || variants.some(v => !v.trim())) {
      toast({ variant: "destructive", title: "Campos incompletos", description: "Preencha o nome, selecione contatos e escreva as mensagens." });
      return;
    }

    setSaving(true);
    try {
      // 1. Criar a campanha
      const { data: campaign, error: campError } = await supabase.from("campaigns").insert({
        name,
        message_variants: variants,
        batch_size: batchSize,
        pause_between_batches: pauseBatch,
        pause_between_messages: pauseMessage,
        status: 'pending'
      }).select().single();

      if (campError) throw campError;

      // 2. Criar os registros de contatos
      const contacts = selectedCustomerIds.map(cid => ({
        campaign_id: campaign.id,
        customer_id: cid,
        status: 'pending'
      }));

      const { error: contError } = await supabase.from("campaign_contacts").insert(contacts);
      if (contError) throw contError;

      toast({ title: "Campanha criada!", description: `Disparo agendado para ${selectedCustomerIds.length} contatos.` });
      
      // Reset form
      setName("");
      setVariants([""]);
      setSelectedCustomerIds([]);
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao criar campanha", description: error.message });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Disparos em Massa</h1>
        <Badge variant="outline" className="flex gap-1 py-1">
          <ShieldAlert className="h-3 w-3 text-yellow-500" />
          Anti-Spam Ativo
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Nova Campanha</CardTitle>
              <CardDescription>Configure as mensagens e estratégias de envio.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Campanha</Label>
                <Input placeholder="Ex: Promoção de Verão" value={name} onChange={e => setName(e.target.value)} />
              </div>

              <div className="space-y-3">
                <Label className="flex justify-between items-center">
                  Variações de Mensagem (Spin-tax)
                  <Button variant="ghost" size="sm" onClick={addVariant} className="h-8">
                    <Plus className="h-3 w-3 mr-1" /> Adicionar Versão
                  </Button>
                </Label>
                {variants.map((v, i) => (
                  <div key={i} className="flex gap-2">
                    <Textarea 
                      placeholder="Use {nome} para personalizar" 
                      value={v} 
                      onChange={e => handleVariantChange(i, e.target.value)}
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeVariant(i)} disabled={variants.length === 1}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Lote</Label>
                  <Input type="number" value={batchSize} onChange={e => setBatchSize(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Pausa Lote (s)</Label>
                  <Input type="number" value={pauseBatch} onChange={e => setPauseBatch(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Pausa Msg (s)</Label>
                  <Input type="number" value={pauseMessage} onChange={e => setPauseMessage(Number(e.target.value))} />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={handleCreateCampaign} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Iniciar Disparo ({selectedCustomerIds.length} contatos)
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Últimas Campanhas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campanha</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criada em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === 'completed' ? 'secondary' : 'outline'}>
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {campaigns.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-4">Nenhuma campanha enviada.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="flex flex-col h-full max-h-[800px]">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Selecionar Contatos
                </CardTitle>
                <div className="flex gap-2">
                   <Button variant="outline" size="sm" onClick={() => handleSelectRandom(30)}>30 Aleatórios</Button>
                   <Button variant="outline" size="sm" onClick={() => handleSelectRandom(50)}>50 Aleatórios</Button>
                </div>
              </div>
              <CardDescription>Puxa todos os contatos que já interagiram com o bot.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox 
                        checked={selectedCustomerIds.length === customers.length && customers.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Nome / Telefone</TableHead>
                    <TableHead>Última Conversa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map(c => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedCustomerIds.includes(c.id)}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedCustomerIds([...selectedCustomerIds, c.id]);
                            else setSelectedCustomerIds(selectedCustomerIds.filter(id => id !== c.id));
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{c.name || "Sem Nome"}</span>
                          <span className="text-xs text-muted-foreground">{c.phone}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(c.updated_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
