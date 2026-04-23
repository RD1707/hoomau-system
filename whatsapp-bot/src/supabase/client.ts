import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios no .env");
}

// Service role ignora RLS - usado somente no bot local, nunca exponha no frontend.
export const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false }
});
