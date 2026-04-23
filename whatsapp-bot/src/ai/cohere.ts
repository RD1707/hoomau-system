import { logger } from "../utils/logger";

const COHERE_URL = "https://api.cohere.com/v1/classify";

const EXAMPLES = [
  { text: "quero comprar essa camisa", label: "compra" },
  { text: "vocês reservam?",            label: "compra" },
  { text: "tem em outra cor?",          label: "duvida" },
  { text: "qual o tecido?",             label: "duvida" },
  { text: "tem tamanho M?",             label: "tamanho" },
  { text: "que tamanho serve pra mim?", label: "tamanho" },
  { text: "onde fica a loja?",          label: "localizacao" },
  { text: "como chegar?",               label: "localizacao" },
  { text: "produto veio com defeito",   label: "reclamacao" },
  { text: "quero trocar",               label: "reclamacao" },
  { text: "oi", label: "saudacao" },
  { text: "boa tarde", label: "saudacao" }
];

export async function classifyIntent(text: string): Promise<string> {
  const apiKey = process.env.COHERE_API_KEY;
  if (!apiKey) return "outro";
  try {
    const res = await fetch(COHERE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ inputs: [text], examples: EXAMPLES, model: "embed-multilingual-v3.0" })
    });
    if (!res.ok) return "outro";
    const json = await res.json();
    return json?.classifications?.[0]?.prediction ?? "outro";
  } catch (err) {
    logger.warn({ err }, "Cohere classify falhou");
    return "outro";
  }
}

export async function summarizeConversation(text: string): Promise<{ summary: string; tags: string[] }> {
  const apiKey = process.env.COHERE_API_KEY;
  if (!apiKey) return { summary: "", tags: [] };
  try {
    const res = await fetch("https://api.cohere.com/v1/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "command-a-03-2025",
        message: `Resuma a conversa abaixo em 2 frases e liste 3 tags (ex: tamanho-M, vestido-preto, intenção-compra). Responda em JSON {"summary":"...","tags":["..."]}.\n\n${text}`
      })
    });
    if (!res.ok) return { summary: "", tags: [] };
    const json = await res.json();
    const raw = json?.text ?? "{}";
    try {
      const parsed = JSON.parse(raw);
      return { summary: parsed.summary ?? "", tags: Array.isArray(parsed.tags) ? parsed.tags : [] };
    } catch { return { summary: raw.slice(0, 280), tags: [] }; }
  } catch (err) {
    logger.warn({ err }, "Cohere summary falhou");
    return { summary: "", tags: [] };
  }
}
