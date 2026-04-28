import { supabase } from "../supabase/client";
import { getSocket } from "../whatsapp/baileys-client";
import { logger, persistLog } from "../utils/logger";
import { appendMessage } from "./conversations";

export async function startCampaignRunner() {
  logger.info("Iniciando executor de campanhas...");
  
  // Rodar a cada 30 segundos para checar novas campanhas ou lotes
  setInterval(async () => {
    try {
      await processActiveCampaigns();
    } catch (err) {
      logger.error({ err }, "Erro no loop do campaign runner");
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
  // Buscar contatos pendentes desta campanha
  const { data: contacts, error } = await supabase
    .from("campaign_contacts")
    .select("*, customers(*)")
    .eq("campaign_id", campaign.id)
    .eq("status", "pending")
    .limit(campaign.batch_size || 10);

  if (error || !contacts || contacts.length === 0) {
    if (!error && contacts?.length === 0) {
      // Se não há mais contatos pendentes, marcar como concluída
      await supabase.from("campaigns").update({ status: "completed" }).eq("id", campaign.id);
      logger.info({ campaign: campaign.name }, "Campanha concluída");
    }
    return;
  }

  // Marcar como running se estava pending
  if (campaign.status === "pending") {
    await supabase.from("campaigns").update({ status: "running" }).eq("id", campaign.id);
  }

  logger.info({ campaign: campaign.name, batchSize: contacts.length }, "Processando lote de campanha");

  for (const contact of contacts) {
    try {
      // 1. Sortear variação de mensagem
      const variants = campaign.message_variants;
      let text = variants[Math.floor(Math.random() * variants.length)];
      
      // 2. Personalizar (ex: substituir {nome})
      const customerName = contact.customers?.name || "cliente";
      text = text.replace(/{nome}/gi, customerName);

      // 3. Enviar via WhatsApp
      const jid = `${contact.customers.phone}@s.whatsapp.net`;
      await getSocket().sendMessage(jid, { text });

      // 4. Registrar na conversa
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
      await supabase.from("campaign_contacts")
        .update({ status: "failed", error_message: err.message })
        .eq("id", contact.id);
    }
  }

  // 7. Pausa entre lotes (se houver mais para processar)
  // O loop do setInterval já cuida disso naturalmente, mas podemos forçar se necessário.
}
