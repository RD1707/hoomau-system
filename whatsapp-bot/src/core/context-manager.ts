import { supabase } from "../supabase/client";
import { logger } from "../utils/logger";

// Memória em processo (rápida) + snapshot no Supabase (persistente).
const memory = new Map<string, Record<string, unknown>>();

export function getContext(conversationId: string): Record<string, unknown> {
  return memory.get(conversationId) ?? {};
}

export async function setContext(conversationId: string, patch: Record<string, unknown>) {
  const merged = { ...getContext(conversationId), ...patch };
  memory.set(conversationId, merged);
  try {
    await supabase.from("conversations").update({ context: merged }).eq("id", conversationId);
  } catch (err) {
    logger.warn({ err }, "Falha ao snapshot de contexto");
  }
}

export async function loadContextFromDb(conversationId: string) {
  const { data } = await supabase.from("conversations").select("context").eq("id", conversationId).single();
  if (data?.context) memory.set(conversationId, data.context as Record<string, unknown>);
}
