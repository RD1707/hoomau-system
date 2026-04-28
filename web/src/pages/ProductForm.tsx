import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, X, ImagePlus, Trash2, ArrowLeft } from "lucide-react";

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  
  // Estado do Produto 
  const [product, setProduct] = useState<any>({
    name: "",
    description: "",
    category_id: "",
    price: "",
    colors: [] as string[],
    sizes: [] as string[],
    notes: "",
    active: true
  });

  const [images, setImages] = useState<any[]>([]);
  const [colorInput, setColorInput] = useState("");
  const [sizeInput, setSizeInput] = useState("");

  useEffect(() => {
    initPage();
  }, [id]);

  async function initPage() {
    setLoading(true);
    await loadCategories();
    if (isEdit) await loadProduct();
    setLoading(false);
  }

  async function loadCategories() {
    const { data } = await supabase.from("categories").select("id, name").order("name");
    if (data) setCategories(data);
  }

  async function loadProduct() {
    const { data, error } = await supabase
      .from("products")
      .select("*, product_images(*)")
      .eq("id", id)
      .single();

    if (data && !error) {
      setProduct({
        ...data,
        category_id: data.category_id || "none"
      });
      setImages(data.product_images || []);
    }
  }

  // Lógica de Upload de Imagens
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setSaving(true);
    for (const file of Array.from(files)) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      // CORRIGIDO AQUI: de "products" para "product-images"
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file);

      if (uploadError) {
        toast({ title: "Erro no upload", description: uploadError.message, variant: "destructive" });
        continue;
      }

      // CORRIGIDO AQUI: de "products" para "product-images"
      const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(filePath);

      // Se estiver editando, salva direto no banco. Se for novo, guarda no estado temporário.
      if (isEdit) {
        await supabase.from("product_images").insert({
          product_id: id,
          storage_path: filePath,
          public_url: publicUrl,
          position: images.length
        });
        loadProduct();
      } else {
        setImages(prev => [...prev, { storage_path: filePath, public_url: publicUrl, is_temp: true }]);
      }
    }
    setSaving(false);
  }

  async function handleSave() {
    if (!product.name) return toast({ title: "O nome é obrigatório", variant: "destructive" });

    setSaving(true);
    const productData = {
      ...product,
      category_id: product.category_id === "none" ? null : product.category_id,
      price: product.price ? parseFloat(product.price) : null,
      updated_at: new Date().toISOString()
    };

    const { data: savedProduct, error } = await supabase
      .from("products")
      .upsert(isEdit ? { id, ...productData } : productData)
      .select()
      .single();

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      // Se era um novo produto, vincula as imagens temporárias agora 
      if (!isEdit && images.length > 0) {
        const imageRecords = images.map((img, idx) => ({
          product_id: savedProduct.id,
          storage_path: img.storage_path,
          public_url: img.public_url,
          position: idx
        }));
        await supabase.from("product_images").insert(imageRecords);
      }
      toast({ title: isEdit ? "Produto atualizado!" : "Produto criado!" });
      navigate("/produtos");
    }
    setSaving(false);
  }

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/produtos")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {isEdit ? "Salvar Alterações" : "Criar Produto"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Informações Básicas</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Nome do Produto *</label>
                <Input value={product.name} onChange={e => setProduct({...product, name: e.target.value})} placeholder="Ex: Camiseta Oversized Cotton" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Descrição</label>
                <Textarea rows={4} value={product.description} onChange={e => setProduct({...product, description: e.target.value})} placeholder="Detalhes sobre o material, caimento..." />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Variações (Cores e Tamanhos)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Cores</label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {product.colors.map((c: string) => (
                    <span key={c} className="bg-muted px-2 py-1 rounded-md text-xs flex items-center gap-1">
                      {c} <X className="h-3 w-3 cursor-pointer" onClick={() => setProduct({...product, colors: product.colors.filter((i: string) => i !== c)})} />
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={colorInput} onChange={e => setColorInput(e.target.value)} placeholder="Adicionar cor..." onKeyDown={e => e.key === 'Enter' && (setProduct({...product, colors: [...product.colors, colorInput]}), setColorInput(""))} />
                  <Button variant="secondary" onClick={() => { if(colorInput) setProduct({...product, colors: [...product.colors, colorInput]}); setColorInput(""); }}>Add</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Status e Categoria</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm font-medium">Ativo no Catálogo</span>
                <Switch checked={product.active} onCheckedChange={checked => setProduct({...product, active: checked})} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Categoria</label>
                <Select value={product.category_id} onValueChange={val => setProduct({...product, category_id: val})}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Preço (R$)</label>
                <Input type="number" step="0.01" value={product.price} onChange={e => setProduct({...product, price: e.target.value})} placeholder="0,00" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Imagens</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative group aspect-square border rounded-md overflow-hidden">
                    <img src={img.public_url} className="object-cover w-full h-full" alt="Produto" />
                    <button className="absolute top-1 right-1 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <label className="aspect-square border-2 border-dashed rounded-md flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                  <ImagePlus className="h-6 w-6 text-muted-foreground mb-1" />
                  <span className="text-[10px] text-muted-foreground text-center">Adicionar Fotos</span>
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}