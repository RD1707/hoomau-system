import "dotenv/config";
import { startBaileys } from "./whatsapp/baileys-client";
import { startOutboundQueue } from "./core/outbound-queue";
import { startCampaignRunner } from "./services/campaign-runner";
import { startHeartbeat } from "./core/heartbeat";
import { runOfflineRecovery } from "./core/offline-recovery";
import { logger } from "./utils/logger";

async function main() {
  logger.info("Iniciando bot WhatsApp da loja...");

  // Conecta no WhatsApp (QR via terminal + salvo em bot_status.qr_code)
  await startBaileys();

  // Heartbeat a cada 30s para o painel saber que está online
  startHeartbeat();

  // Fila de envios manuais (o dono envia pelo painel -> bot envia no WhatsApp)
  startOutboundQueue();

  // Executor de campanhas (disparo em massa)
  startCampaignRunner();

  // Retomada após ficar offline: manda mensagem configurada uma única vez por conversa
  await runOfflineRecovery();

  logger.info("Bot pronto.");
}

process.on("unhandledRejection", (e) => logger.error({ err: e }, "unhandledRejection"));
process.on("uncaughtException",  (e) => logger.error({ err: e }, "uncaughtException"));

main().catch((err) => {
  logger.error({ err }, "Falha no bootstrap");
  process.exit(1);
});
