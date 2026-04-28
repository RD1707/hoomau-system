import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Link as LinkIcon, Save, Loader2, Upload } from "lucide-react";
import { BotConfig } from "@/types/db";

export default function CatalogSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [catalogType, setCatalogType] = useState<string>("link");
  const [catalogUrl, setCatalogUrl] = useState<string>("");

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    try {
      const { data, error } = await supabase.from("bot_config").select("*").eq("id", 1).single();
      if (error) throw error;
      setConfig(data);
      setCatalogType(data.catalog_type || "link");
      setCatalogUrl(data.catalog_url || "");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao carregar configurações", description: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase.from("bot_config").update({
        catalog_url: catalogUrl,
        catalog_type: catalogType
      }).eq("id", 1);
      
      if (error) throw error;
      toast({ title: "Sucesso", description: "Configurações de catálogo salvas!" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `catalog_${Date.now()}.${fileExt}`;
      const filePath = `catalogs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('products') // Reusing products bucket or should create a specific one
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      setCatalogUrl(publicUrl);
      
      // Auto-detect type
      if (['pdf'].includes(fileExt?.toLowerCase() || '')) setCatalogType('pdf');
      else if (['jpg', 'jpeg', 'png', 'webp'].includes(fileExt?.toLowerCase() || '')) setCatalogType('image');
      
      toast({ title: "Upload concluído", description: "O arquivo do catálogo foi enviado com sucesso." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro no upload", description: error.message });
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
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Configuração do Catálogo
          </CardTitle>
          <CardDescription>
            Defina o catálogo que será enviado automaticamente quando o cliente digitar "1" ou quando a IA identificar a necessidade.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Tipo de Catálogo</Label>
            <Select value={catalogType} onValueChange={setCatalogType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="link">Link Externo (URL)</SelectItem>
                <SelectItem value="pdf">Arquivo PDF</SelectItem>
                <SelectItem value="image">Imagem</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{catalogType === "link" ? "Link do Catálogo" : "URL do Arquivo"}</Label>
            <div className="flex gap-2">
              <Input 
                placeholder={catalogType === "link" ? "https://exemplo.com/catalogo" : "Link gerado após upload"} 
                value={catalogUrl}
                onChange={(e) => setCatalogUrl(e.target.value)}
              />
              {catalogType !== "link" && (
                <div className="relative">
                  <Input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleFileUpload}
                    accept={catalogType === "pdf" ? ".pdf" : "image/*"}
                    disabled={saving}
                  />
                  <Button variant="outline" disabled={saving}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg bg-muted p-4 border border-border">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Dica de Funcionamento
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Sempre que o cliente digitar "1", este catálogo será enviado.</li>
              <li>A IA enviará este catálogo automaticamente se não encontrar o produto buscado.</li>
              <li>Formatos suportados: Links diretos, PDFs e Imagens.</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar Configurações
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
