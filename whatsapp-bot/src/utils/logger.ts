import pino from "pino";
import { supabase } from "../supabase/client";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: { target: "pino-pretty", options: { colorize: true } }
});

export async function persistLog(level: "info" | "warn" | "error", message: string, meta?: unknown) {
  try {
    await supabase.from("logs").insert({
      level, source: "bot", message, meta: meta ? JSON.parse(JSON.stringify(meta)) : null
    });
  } catch (err) {
    logger.warn({ err }, "Falha ao persistir log");
  }
}
