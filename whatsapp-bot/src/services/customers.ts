import { supabase } from "../supabase/client";

export async function upsertCustomerByPhone(phone: string) {
  const { data: existing } = await supabase
    .from("customers").select("*").eq("phone", phone).maybeSingle();
  if (existing) return existing;

  const { data, error } = await supabase.from("customers")
    .insert({ phone })
    .select("*").single();
  if (error) throw error;
  return data;
}

export async function updateCustomerInfo(id: string, patch: Record<string, unknown>) {
  await supabase.from("customers").update(patch).eq("id", id);
}
