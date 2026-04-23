import { supabase } from "../supabase/client";

export async function getOrCreateConversation(customerId: string) {
  const { data: existing } = await supabase
    .from("conversations").select("*").eq("customer_id", customerId).maybeSingle();
  if (existing) return existing;

  const { data, error } = await supabase.from("conversations")
    .insert({ customer_id: customerId, last_message_at: new Date().toISOString() })
    .select("*").single();
  if (error) throw error;
  return data;
}

export async function appendMessage(input: {
  conversation_id: string;
  direction: "inbound" | "outbound";
  author: "customer" | "bot" | "human";
  text?: string | null;
  image_urls?: string[];
  product_ids?: string[];
  whatsapp_message_id?: string;
}) {
  await supabase.from("messages").insert({
    conversation_id: input.conversation_id,
    direction: input.direction,
    author: input.author,
    text: input.text ?? null,
    image_urls: input.image_urls ?? [],
    product_ids: input.product_ids ?? [],
    whatsapp_message_id: input.whatsapp_message_id ?? null
  });

  const patch: Record<string, unknown> = { last_message_at: new Date().toISOString() };
  if (input.direction === "inbound")  patch.last_inbound_at = new Date().toISOString();
  if (input.direction === "outbound") patch.last_bot_reply_at = new Date().toISOString();
  await supabase.from("conversations").update(patch).eq("id", input.conversation_id);
}

export async function updateConversationContext(id: string, patch: Record<string, unknown>) {
  const { data } = await supabase.from("conversations").select("context").eq("id", id).single();
  const merged = { ...(data?.context ?? {}), ...patch };
  await supabase.from("conversations").update({ context: merged }).eq("id", id);
}
