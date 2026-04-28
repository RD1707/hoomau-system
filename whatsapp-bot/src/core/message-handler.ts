import { proto } from "@whiskeysockets/baileys";
import { logger, persistLog } from "../utils/logger";
import { alreadyProcessed, shouldDebounce } from "../utils/anti-spam";
import { upsertCustomerByPhone } from "../services/customers";
import { getOrCreateConversation, appendMessage, updateConversationContext } from "../services/conversations";
import { isWithinBusinessHours } from "../services/business-hours";
import { generateBotReply } from "../ai/gemini";
import { classifyIntent } from "../ai/cohere";
import { getSocket } from "../whatsapp/baileys-client";
import { supabase } from "../supabase/client";

function extractText(msg: proto.IWebMessageInfo): string {
  const m = msg.message;
  return (
    m?.conversation ||
    m?.extendedTextMessage?.text ||
    m?.imageMessage?.caption ||
    m?.videoMessage?.caption ||
    ""
  ).trim();
}

function extractPhone(jid: string): string {
  return jid.split("@")[0];
}

export async function handleIncomingMessage(msg: proto.IWebMessageInfo) {
  const messageId = msg.key.id || "";
  if (!messageId || alreadyProcessed(messageId)) return;

  const remoteJid = msg.key.remoteJid;
  if (!remoteJid || remoteJid.endsWith("@g.us") || remoteJid.endsWith("@broadcast")) return;

  const phone = extractPhone(remoteJid);
  const text = extractText(msg);
  if (!text) return;

  // 1) Cliente + conversa
  const customer = await upsertCustomerByPhone(phone);
  const conversation = await getOrCreateConversation(customer.id);

  // 2) Anti-spam por conversa
  if (shouldDebounce(conversation.id)) {
    logger.debug({ phone }, "Debounce");
    return;
  }

  // 3) Persistir a mensagem do cliente
  await appendMessage({
    conversation_id: conversation.id,
    direction: "inbound",
    author: "customer",
    text,
    whatsapp_message_id: messageId
  });

  // 4) Se conversa pausada (takeover humano), não responde
  if (conversation.bot_paused) {
    logger.info({ phone }, "Conversa pausada (takeover) - bot não responde");
    return;
  }

  // 5) Carregar config
  const { data: cfg } = await supabase.from("bot_config").select("*").eq("id", 1).single();

  // 6) Fora do horário?
  if (!(await isWithinBusinessHours())) {
    await sendText(remoteJid, cfg?.out_of_hours_message || "Estamos fora do horário.");
    await appendMessage({
      conversation_id: conversation.id,
      direction: "outbound",
      author: "bot",
      text: cfg?.out_of_hours_message || "Estamos fora do horário."
    });
    return;
  }

  // 7) Classificar intenção em paralelo (best effort)
  let forceCatalog = (text === "1");

  classifyIntent(text)
    .then((intent) => supabase.from("conversations").update({ intent }).eq("id", conversation.id))
    .catch((err) => logger.warn({ err }, "Falha classify intent"));

  // 8) Gerar resposta via Gemini (com produtos, FAQs, persona)
  const reply = await generateBotReply({
    userText: text,
    conversationId: conversation.id,
    customer,
    config: cfg
  });

  // 9) Enviar texto + imagens
  await sendText(remoteJid, reply.text);
  
  // Se a IA sinalizar ou se o usuário digitou "1" manualmente
  if (reply.sendCatalog || forceCatalog) {
    await sendCatalog(remoteJid, cfg);
  }

  for (const url of reply.imageUrls.slice(0, cfg?.max_images ?? 3)) {
    try {
      await getSocket().sendMessage(remoteJid, { image: { url } });
    } catch (err) {
      logger.warn({ err, url }, "Falha enviando imagem");
    }
  }

  // 10) Persistir resposta + atualizar contexto
  await appendMessage({
    conversation_id: conversation.id,
    direction: "outbound",
    author: "bot",
    text: reply.text,
    image_urls: reply.imageUrls,
    product_ids: reply.productIds
  });

  if (reply.contextPatch) {
    await updateConversationContext(conversation.id, reply.contextPatch);
  }

  await supabase.from("conversations").update({
    last_bot_reply_at: new Date().toISOString()
  }).eq("id", conversation.id);

  await persistLog("info", "Resposta enviada", { phone, intent: reply.detectedIntent });
}

async function sendText(jid: string, text: string) {
  await getSocket().sendMessage(jid, { text });
}
o está disponível no momento.");
    return;
  }

  const type = cfg.catalog_type || "link";
  
  if (type === "link") {
    await sendText(jid, `Aqui está o nosso catálogo: ${cfg.catalog_url}`);
  } else if (type === "pdf") {
    await getSocket().sendMessage(jid, { 
      document: { url: cfg.catalog_url }, 
      fileName: "Catalogo.pdf", 
      mimetype: "application/pdf" 
    });
  } else if (type === "image") {
    await getSocket().sendMessage(jid, { 
      image: { url: cfg.catalog_url }, 
      caption: "Aqui está o nosso catálogo!" 
    });
  }
}
