import { supabase } from "../supabase/client";

export async function isWithinBusinessHours(date = new Date()): Promise<boolean> {
  const dow = date.getDay(); // 0=domingo
  const { data } = await supabase
    .from("business_hours").select("*").eq("day_of_week", dow).maybeSingle();
  if (!data || data.closed) return false;
  if (!data.open_time || !data.close_time) return false;

  const hhmm = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  return hhmm >= data.open_time.slice(0, 5) && hhmm <= data.close_time.slice(0, 5);
}
