import {
  default as makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  WASocket,
  proto
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import qrcodeTerminal from "qrcode-terminal";
import QRCode from "qrcode";
import path from "path";
import { logger, persistLog } from "../utils/logger";
import { supabase } from "../supabase/client";
import { handleIncomingMessage } from "../core/message-handler";
import { upsertCustomerByPhone } from "../services/customers";

let sock: WASocket | null = null;

export function getSocket(): WASocket {
  if (!sock) throw new Error("Baileys socket ainda não está pronto");
  return sock;
}

export async function startBaileys() {
  const authDir = path.resolve(process.cwd(), "auth");
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: ["Loja", "Chrome", "1.0.0"]
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrcodeTerminal.generate(qr, { small: true });
      const dataUrl = await QRCode.toDataURL(qr);
      await supabase.from("bot_status").update({
        connection_status: "qr_pending",
        qr_code: dataUrl,
        last_heartbeat: new Date().toISOString()
      }).eq("id", 1);
      logger.info("QR Code gerado. Escaneie com o WhatsApp da loja.");
    }

    if (connection === "open") {
      const number = sock?.user?.id?.split(":")[0] ?? null;
      await supabase.from("bot_status").update({
        connection_status: "connected",
        qr_code: null,
        whatsapp_number: number,
        last_heartbeat: new Date().toISOString(),
        last_error: null
      }).eq("id", 1);
      logger.info({ number }, "WhatsApp conectado");
      await persistLog("info", "WhatsApp conectado", { number });
    }

    if (connection === "close") {
      const code = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      logger.warn({ code }, "Conexão fechada");
      await supabase.from("bot_status").update({
        connection_status: "disconnected",
        last_error: `code ${code}`,
        last_heartbeat: new Date().toISOString()
      }).eq("id", 1);
      await persistLog("warn", "Conexão fechada", { code, shouldReconnect });

      if (shouldReconnect) {
        setTimeout(() => startBaileys().catch((e) => logger.error({ e }, "Reconnect falhou")), 3000);
      } else {
        logger.error("Logged out. Apague a pasta auth/ e gere um novo QR.");
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      try {
        if (!msg.message || msg.key.fromMe) continue;
        await handleIncomingMessage(msg as proto.IWebMessageInfo);
      } catch (err) {
        logger.error({ err }, "Erro ao processar mensagem");
        await persistLog("error", "Erro ao processar mensagem", { err: String(err) });
      }
    }
  });

  // Escuta os contactos da agenda sendo sincronizados
  sock.ev.on("contacts.upsert", async (contacts) => {
    for (const contact of contacts) {
      try {
        // Ignora grupos e status, pega apenas contactos normais
        if (contact.id && contact.id.endsWith("@s.whatsapp.net")) {
          const phone = contact.id.split("@")[0];
          const name = contact.name || contact.notify || "Sem nome";
          await upsertCustomerByPhone(phone, name);
        }
      } catch (err) {
        logger.error({ err, phone: contact.id }, "Erro ao sincronizar contacto");
      }
    }
  });

  // Escuta o histórico de conversas antigas (ocorre geralmente após ler o QR Code)
  sock.ev.on("messaging-history.set", async ({ chats, contacts }) => {
    logger.info("Sincronizando histórico de conversas do WhatsApp...");
    
    // Salva as conversas do histórico
    for (const chat of chats) {
      try {
        if (chat.id && chat.id.endsWith("@s.whatsapp.net")) {
          const phone = chat.id.split("@")[0];
          const name = chat.name || "Sem nome";
          await upsertCustomerByPhone(phone, name);
        }
      } catch (err) {
        logger.error({ err, phone: chat.id }, "Erro ao sincronizar chat histórico");
      }
    }
  });
}