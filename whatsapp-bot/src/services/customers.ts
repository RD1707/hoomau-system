import { supabase } from "../supabase/client";

export async function upsertCustomerByPhone(phone: string, name?: string) {
  const { data: existing } = await supabase
    .from("customers").select("*").eq("phone", phone).maybeSingle();
  
  if (existing) {
    // Se o cliente já existe mas não tem nome (ou estava como nulo) e recebemos um nome válido agora, atualiza
    if (name && !existing.name && name !== 'Sem nome') {
      await updateCustomerInfo(existing.id, { name });
      existing.name = name; // Atualiza o objeto retornado para refletir a mudança
    }
    return existing;
  }

  // Se não existe, cria um novo registro com o telefone e o nome (se houver)
  const { data, error } = await supabase.from("customers")
    .insert({ phone, name: name || null })
    .select("*").single();
    
  if (error) throw error;
  return data;
}

export async function updateCustomerInfo(id: string, patch: Record<string, unknown>) {
  await supabase.from("customers").update(patch).eq("id", id);
}