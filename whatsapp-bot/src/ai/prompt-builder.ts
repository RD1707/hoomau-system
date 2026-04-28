import { supabase } from "../supabase/client";
import type { ProductWithImages } from "../services/products";

type Cfg = {
  attendant_name: string;
  tone: string;
  persona_prompt: string;
  store_address: string | null;
  store_phone: string | null;
  store_directions: string | null;
  contact_info: string | null;
  enable_recommendations: boolean;
  enable_photos: boolean;
  max_images: number;
};

export async function buildSystemPrompt(cfg: Cfg, products: ProductWithImages[], extra?: string) {
  const { data: faqs } = await supabase.from("faqs").select("question, answer").eq("active", true).limit(20);

  const faqBlock = (faqs ?? []).map((f) => `- P: ${f.question}\n  R: ${f.answer}`).join("\n") || "(sem FAQs)";
  const productBlock = products.map((p) => {
    const imgs = (p.images ?? []).slice(0, cfg.max_images).join(" | ");
    return `- ID:${p.id} | Nome:${p.name} | Preço:${p.price ?? "n/d"} | Cores:${(p.colors ?? []).join(", ")} | Tamanhos:${(p.sizes ?? []).join(", ")} | Desc:${p.description ?? ""} | Imagens:${imgs || "nenhuma"}`;
  }).join("\n") || "(nenhum produto encontrado para essa busca)";

  return `PERSONA E DIRETRIZES:
${cfg.persona_prompt}

DADOS DA LOJA (Use apenas se necessário para orientar o cliente):
- Endereço: ${cfg.store_address ?? "não cadastrado"}.
- Telefone: ${cfg.store_phone ?? "não cadastrado"}.
- Como chegar: ${cfg.store_directions ?? "não cadastrado"}.
- Outras formas de contato: ${cfg.contact_info ?? "não cadastrado"}.

PRODUTOS RELEVANTES (Caso o cliente queira saber algo específico do catálogo):
${productBlock}

FAQs:
${faqBlock}

REGRAS TÉCNICAS:
- Se o cliente digitar algo que não seja um número e não for uma dúvida clara, responda: "Não entendi, escolha uma opção do menu" e reenvie o menu.
- Responda sempre em JSON.
- Se a opção escolhida for "1" ou envolver envio de catálogo, defina "send_catalog": true.
- Jamais invente preços ou estoque que não estejam na lista acima.

${extra ?? ""}

Devolva APENAS o JSON:
{"text":"sua resposta elegante aqui","product_ids":[],"image_urls":[],"context":{}, "send_catalog": boolean}`;
}
