
# Sistema de Atendimento WhatsApp para Loja de Roupas

Entrega em duas partes que compartilham o mesmo Supabase:

**Parte A — Painel Admin (construído no Lovable, React + Vite + Supabase)**
**Parte B — Bot Baileys local (gerado como projeto Node.js .zip + README, você roda no PC da loja)**

---

## Parte A — Painel Administrativo

### Identidade visual
- Estilo moderno e clean, fundo claro, sidebar lateral, cards com sombras sutis.
- Tipografia **Poppins** em todo o painel (títulos, corpo, botões).
- Paleta neutra com um acento de marca, semântica via design tokens (HSL).

### Autenticação
- Supabase Auth com email/senha. Apenas o dono da loja.
- Tela de login, sessão persistente, logout, recuperação de senha.

### Estrutura de navegação (sidebar)
1. **Dashboard** — visão geral: nº de conversas hoje, clientes novos, produtos mais perguntados, status do bot (online/offline com base no último heartbeat), últimas mensagens.
2. **Produtos** — CRUD completo: nome, descrição, categoria, coleções, preço (opcional), cores, tamanhos, observações, ativo/inativo. Upload de múltiplas fotos (Supabase Storage), reordenação, foto principal. Busca e filtros.
3. **Categorias e Coleções** — CRUD de categorias (Camisas, Vestidos…) e coleções (Promoção, Novidades, Masculino, Feminino).
4. **Clientes** — lista com busca/filtro por data, cidade, intenção. Ficha do cliente: nome, telefone, cidade/bairro, preferências, tags geradas pela IA, resumo da última conversa, histórico de produtos perguntados.
5. **Conversas** — lista de threads do WhatsApp, filtros (com mensagens não lidas, pausadas, por data). Visualização de mensagens trocadas, resumo automático gerado por Cohere, produtos mostrados, intenção detectada. **Toggle "Assumir conversa"** que pausa o bot para aquele cliente; reativar libera o bot. Caixa de envio manual (mensagem entra na fila e o bot local envia via Baileys).
6. **Configurações do Bot**:
   - Nome do atendente virtual, tom (formal/descontraído via slider), persona/prompt-base.
   - Mensagem de boas-vindas, fora do horário, retomada após offline (com proteção anti-spam — uma vez por conversa).
   - Horário de atendimento por dia da semana.
   - Endereço, telefone, instruções para chegar, formas de contato.
   - FAQs e respostas rápidas (CRUD).
   - Toggles: recomendações automáticas, envio de fotos, coleta de dados do cliente, número máx. de fotos por resposta.
7. **Logs e Status** — heartbeat do bot, últimos erros, mensagens enviadas/recebidas por dia, status da conexão WhatsApp (conectado/QR pendente/desconectado).
8. **Conta** — trocar senha, dados do estabelecimento.

### Edge Functions (Lovable Cloud)
- `summarize-conversation` — Cohere gera resumo + intenção + tags (acionado pelo painel ou em batch).
- `classify-intent` — Cohere classifica (compra, dúvida, tamanho, localização, reclamação).
- `test-bot-reply` — usa Gemini com o prompt configurado e os produtos cadastrados para o dono testar respostas direto no painel sem precisar do WhatsApp.
- `send-manual-message` — escreve na fila `outbound_messages` que o bot local consome.

### Banco de dados (Supabase, com RLS)
Tabelas: `profiles`, `user_roles` (enum app_role), `categories`, `collections`, `products`, `product_images`, `product_collections`, `customers`, `conversations` (com `bot_paused`, `last_message_at`, `last_bot_reply_at`, `summary`, `intent`, `tags`), `messages` (texto, imagens, direção, autor: bot/humano/cliente), `outbound_messages` (fila para o bot enviar), `bot_config` (singleton com persona, tom, mensagens-padrão, horários, endereço, toggles, max_images), `faqs`, `business_hours`, `bot_status` (heartbeat, conexão WhatsApp, QR atual quando pendente), `logs`.
- Storage bucket público `product-images` com RLS de escrita só para admin.
- RLS: dono lê/escreve tudo; políticas estritas; bot acessa via service role no servidor local.

---

## Parte B — Bot Baileys (entregue como projeto Node.js)

Projeto separado, em **TypeScript + Node.js**, gerado como `.zip` em `/mnt/documents/`, pronto para você rodar no PC da loja. Estrutura:

```
whatsapp-bot/
  src/
    index.ts                  # bootstrap, PM2-friendly
    whatsapp/baileys-client.ts# conexão, QR, auto-reconnect, multi-file auth
    core/message-handler.ts   # roteamento de mensagens recebidas
    core/context-manager.ts   # memória de conversa (produto atual, cor, tamanho)
    core/outbound-queue.ts    # consome outbound_messages do Supabase
    core/offline-recovery.ts  # detecta msgs recebidas offline e dispara mensagem de retomada
    core/heartbeat.ts         # atualiza bot_status a cada 30s
    ai/gemini.ts              # chamadas Gemini com prompt-base + dados do Supabase
    ai/cohere.ts              # classificação de intenção, resumo
    ai/prompt-builder.ts      # monta system prompt com persona, produtos relevantes, FAQs, horário
    services/products.ts      # busca produtos no Supabase + URLs de imagens
    services/customers.ts     # cria/atualiza cliente, salva preferências
    services/conversations.ts # persiste mensagens, atualiza last_message_at
    services/business-hours.ts# valida se está em horário
    utils/logger.ts           # Pino, com persistência opcional no Supabase
    utils/anti-spam.ts        # debounce, dedupe
  ecosystem.config.js         # PM2
  .env.example                # SUPABASE_URL, SUPABASE_SERVICE_ROLE, GEMINI_API_KEY, COHERE_API_KEY
  package.json
  tsconfig.json
  README.md                   # instruções completas
```

### Comportamentos chave
- **Memória de contexto** por conversa (últimas N mensagens + produto/cor/tamanho atual) mantida em memória + snapshot no Supabase.
- **Respostas Gemini** estritamente baseadas em dados do Supabase (produtos, FAQs, config). Se faltar dado: responde com transparência e oferece alternativas ou atendente humano.
- **Cohere** classifica intenção a cada mensagem e gera resumo ao final/idle da conversa.
- **Envio de fotos**: busca `product_images`, respeita `max_images` da config; se sem foto, responde só texto.
- **Orientação para loja física** sempre que detectar intenção de compra/reserva/localização.
- **Fora do horário**: responde com mensagem configurada e marca pendência.
- **Retomada offline**: ao subir, busca conversas com `last_inbound_at > last_bot_reply_at` e dispara mensagem de retomada (uma vez, anti-spam).
- **Takeover humano**: se `conversations.bot_paused = true`, ignora mensagens do cliente e só processa envios manuais via `outbound_messages`.
- **Auto-reconnect** Baileys, multi-file auth (sessão persistida), QR exibido no terminal e também salvo em `bot_status.qr_code` para o painel mostrar.
- **PM2 + Windows Service**: scripts e instruções no README para auto-start.

### README.md (sem emojis, passo a passo)
1. Pré-requisitos (Node 20, Git, conta Supabase, chaves Gemini e Cohere).
2. Criar projeto Supabase, rodar SQL fornecido (`supabase/schema.sql` incluso) para tabelas, RLS e bucket.
3. Configurar Storage e Auth (criar usuário admin).
4. Deploy do painel (já feito no Lovable; instruções de domínio próprio opcional).
5. Instalar e configurar o bot: `git clone`, `npm install`, copiar `.env.example` para `.env`, preencher variáveis (com explicação de onde achar cada chave).
6. Primeiro start: `npm run dev`, escanear QR Code com WhatsApp do celular da loja.
7. Subir em produção com PM2: `npm run build`, `pm2 start ecosystem.config.js`, `pm2 save`, `pm2 startup`.
8. Alternativa Windows Service com `node-windows`.
9. Troubleshooting: desconexão, QR expirado, limpar pasta `auth/`, logs.
10. Teste ponta a ponta: cadastrar produto no painel → mandar mensagem no WhatsApp → ver conversa aparecer no painel → assumir conversa → reativar bot.

---

## Ordem de implementação
1. Schema Supabase + RLS + Storage + Auth.
2. Layout do painel com Poppins, sidebar, design system.
3. Produtos + Categorias/Coleções + upload de fotos.
4. Configurações do bot + FAQs + horários.
5. Clientes + Conversas + Takeover + envio manual.
6. Edge Functions (resumo, intenção, teste de bot).
7. Dashboard + Logs.
8. Geração do projeto do bot Node.js + README + .zip em `/mnt/documents/`.
