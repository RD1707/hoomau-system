import { supabase } from "../supabase/client";
import { getSocket } from "../whatsapp/baileys-client";
import { logger, persistLog } from "../utils/logger";
import { appendMessage } from "./conversations";

let isRunning = false; // Variável de controlo (Lock) para evitar sobreposição

export async function startCampaignRunner() {
  logger.info("A iniciar executor de campanhas...");
  
  // Rodar a cada 30 segundos para verificar novas campanhas ou lotes
  setInterval(async () => {
    if (isRunning) return; // Se ainda estiver a processar, ignora este ciclo
    
    isRunning = true;
    try {
      await processActiveCampaigns();
    } catch (err) {
      logger.error({ err }, "Erro no ciclo do campaign runner");
    } finally {
      isRunning = false; // Liberta o lock no final
    }
  }, 30000);
}

async function processActiveCampaigns() {
  // Buscar campanhas em andamento ou pendentes
  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select("*")
    .in("status", ["pending", "running"])
    .limit(5);

  if (error || !campaigns) return;

  for (const campaign of campaigns) {
    await processCampaignBatch(campaign);
  }
}

async function processCampaignBatch(campaign: any) {
  // Buscar contactos pendentes desta campanha
  const { data: contacts, error } = await supabase
    .from("campaign_contacts")
    .select("*, customers(*)")
    .eq("campaign_id", campaign.id)
    .eq("status", "pending")
    .limit(campaign.batch_size || 10);

  if (error || !contacts || contacts.length === 0) {
    if (!error && contacts?.length === 0) {
      // Se não há mais contactos pendentes, marcar como concluída
      await supabase.from("campaigns").update({ status: "completed" }).eq("id", campaign.id);
      logger.info({ campaign: campaign.name }, "Campanha concluída");
    }
    return;
  }

  // Marcar como running se estava pending
  if (campaign.status === "pending") {
    await supabase.from("campaigns").update({ status: "running" }).eq("id", campaign.id);
  }

  logger.info({ campaign: campaign.name, batchSize: contacts.length }, "A processar lote de campanha");

  for (const contact of contacts) {
    try {
      // Garante que o Supabase lide bem seja a retornar um objeto ou um array
      const customerData = Array.isArray(contact.customers) 
        ? contact.customers[0] 
        : contact.customers;

      // Trava de segurança: Se não achar o cliente ou o telefone, avança este disparo e marca erro
      if (!customerData || !customerData.phone) {
        throw new Error("Dados do cliente (telefone) ausentes ou excluídos da base de dados.");
      }

      // 1. Sortear variação de mensagem
      const variants = campaign.message_variants;
      let text = variants[Math.floor(Math.random() * variants.length)];
      
      // 2. Personalizar (ex: substituir {nome})
      const customerName = customerData.name || "cliente";
      text = text.replace(/{nome}/gi, customerName);

      // 3. Enviar via WhatsApp
      const jid = `${customerData.phone}@s.whatsapp.net`;
      await getSocket().sendMessage(jid, { text });

      // 4. Registar na conversa
      const { data: conv } = await supabase
        .from("conversations")
        .select("id")
        .eq("customer_id", contact.customer_id)
        .single();
      
      if (conv) {
        await appendMessage({
          conversation_id: conv.id,
          direction: "outbound",
          author: "bot",
          text: `[CAMPANHA: ${campaign.name}] ${text}`
        });
      }

      // 5. Marcar como enviado
      await supabase.from("campaign_contacts")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", contact.id);

      // 6. Pausa entre mensagens do lote (Anti-Spam)
      const pause = (campaign.pause_between_messages || 5) * 1000;
      const jitter = Math.random() * 2000; // Adiciona até 2s de variação aleatória
      await new Promise(resolve => setTimeout(resolve, pause + jitter));

    } catch (err: any) {
      logger.error({ err, contactId: contact.id }, "Falha ao enviar mensagem de campanha");
      
      const currentRetries = contact.retry_count || 0;
      
      if (currentRetries < 3) {
        // Se falhou mas tem menos de 3 tentativas, apenas soma 1 ao contador e mantém 'pending'
        await supabase.from("campaign_contacts")
          .update({ retry_count: currentRetries + 1 })
          .eq("id", contact.id);
      } else {
        // Se já tentou mais de 3 vezes, então sim, desiste e marca como 'failed'
        await supabase.from("campaign_contacts")
          .update({ status: "failed", error_message: err.message })
          .eq("id", contact.id);
      }
    }
  }
}