import { supabase } from "../supabase/client";
import { logger } from "../utils/logger";

const HEARTBEAT_MS = Number(process.env.HEARTBEAT_MS || 30000);

export function startHeartbeat() {
  setInterval(async () => {
    try {
      await supabase.from("bot_status").update({
        last_heartbeat: new Date().toISOString()
      }).eq("id", 1);
    } catch (err) {
      logger.warn({ err }, "heartbeat falhou");
    }
  }, HEARTBEAT_MS);
}
