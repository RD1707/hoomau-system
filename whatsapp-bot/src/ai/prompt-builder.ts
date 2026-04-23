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

  return `${cfg.persona_prompt}

REGRAS OBRIGATÓRIAS:
- Seu nome é ${cfg.attendant_name}.
- Tom da conversa: ${cfg.tone}.
- Responda APENAS com base nos dados abaixo (produtos, FAQs, endereço). Se faltar informação, diga com transparência e ofereça alternativas ou atendimento humano.
- Esta loja é FÍSICA, sem vendas online. Sempre que houver intenção de compra/reserva/localização, oriente o cliente a ir até a loja.
- Endereço: ${cfg.store_address ?? "não cadastrado"}.
- Telefone: ${cfg.store_phone ?? "não cadastrado"}.
- Como chegar: ${cfg.store_directions ?? "não cadastrado"}.
- Outras formas de contato: ${cfg.contact_info ?? "não cadastrado"}.
- Quando recomendar produtos, mencione cores e tamanhos disponíveis. Sugestões de tamanho são apenas estimativa, o ideal é provar na loja.
- Nunca invente produtos, preços ou fotos.

PRODUTOS RELEVANTES PARA ESTA CONSULTA:
${productBlock}

FAQs:
${faqBlock}

${extra ?? ""}

Responda em português, de forma curta e natural, como um vendedor humano.
Devolva APENAS uma resposta JSON válida no formato:
{"text":"resposta ao cliente","product_ids":["uuid1","uuid2"],"image_urls":["url1","url2"],"context":{"current_product_id":"uuid","color":"preto","size":"M"}}
Os arrays podem ser vazios. "context" só com o que mudou nesta resposta.`;
}
