# Sistema de Atendimento WhatsApp para Loja Hoomau

Este projeto contém DUAS partes que compartilham o mesmo banco Supabase:

1. **Painel Admin** — aplicação web (React + Vite + TypeScript) onde o dono da loja cadastra produtos, vê conversas, configura o bot etc. Pode ser publicada na Vercel, Netlify, Cloudflare Pages ou qualquer hospedagem estática.
2. **Bot WhatsApp** — serviço Node.js + TypeScript usando Baileys, que roda localmente no PC da loja, conecta no WhatsApp Web por QR Code e responde os clientes usando IA (Gemini + Cohere) com base nos dados do Supabase.

A IA do bot responde APENAS com base no que está cadastrado no painel. Nunca inventa produtos ou preços.

---

## SUMÁRIO

1. Pré-requisitos
2. Configurar Supabase (banco, RLS, Storage e usuário admin)
3. Obter chaves Gemini e Cohere
4. Rodar o painel admin
5. Publicar o painel admin (opcional)
6. Rodar o bot localmente
7. Manter o bot sempre online (PM2 ou Windows Service)
8. Teste ponta a ponta
9. Solução de problemas

---

## 1. PRÉ-REQUISITOS

- Node.js 20 ou superior — https://nodejs.org
- Conta no Supabase — https://supabase.com (plano free serve)
- Conta no Google AI Studio (Gemini) — https://aistudio.google.com
- Conta no Cohere — https://dashboard.cohere.com
- WhatsApp instalado no celular da loja

---

## 2. CONFIGURAR SUPABASE

### 2.1 Criar o projeto

1. Entre em https://supabase.com e clique em **New project**.
2. Escolha um nome, senha forte do banco, região mais próxima e crie.
3. Aguarde o provisionamento (1-2 min).

### 2.2 Rodar os scripts SQL

Abra **SQL Editor** no painel do Supabase e cole os arquivos da pasta `sql/` deste repositório, na ordem:

1. `sql/01_schema.sql` — cria todas as tabelas, funções e triggers.
2. `sql/02_rls.sql` — ativa Row Level Security e cria as políticas.
3. `sql/03_storage.sql` — cria o bucket `product-images` e suas políticas.

Rode um por vez. Cada um termina sem erros e diz "Success".

### 2.3 Criar o usuário admin

1. No painel do Supabase, vá em **Authentication > Users > Add user > Create new user**.
2. Preencha email e senha (estes serão os dados de login no painel admin).
3. Marque "Auto Confirm User" e clique Create.
4. Na lista de usuários, copie o **UID** desse usuário.
5. Abra `sql/04_admin_setup.sql`, substitua `COLE_O_UUID_DO_USUARIO_AQUI` pelo UID copiado e rode no SQL Editor.

### 2.4 Pegar as chaves do Supabase

Vá em **Project Settings > API**. Você precisará de:

- `Project URL` — usado tanto pelo painel quanto pelo bot.
- `anon public` (publishable) — usado APENAS pelo painel.
- `service_role` — usado APENAS pelo bot local. NUNCA exponha esta chave no painel ou em qualquer site público.

---

## 3. OBTER CHAVES GEMINI E COHERE

### 3.1 Gemini

1. Entre em https://aistudio.google.com/app/apikey
2. Clique em **Create API key**.
3. Copie e guarde — você vai colar no `.env` do bot.

### 3.2 Cohere

1. Entre em https://dashboard.cohere.com/api-keys
2. Crie uma chave de produção (Trial key também funciona para testes).
3. Copie e guarde.

---

## 4. RODAR O PAINEL ADMIN

O painel é o que está rodando no Lovable. Para usá-lo apontando para o SEU Supabase:

1. Configure as variáveis de ambiente do painel. No Lovable, abra **Project > Settings > Environment Variables** e adicione:
   - `VITE_SUPABASE_URL` = a URL do seu projeto Supabase
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = a chave `anon public`

2. (Se você baixou o painel para rodar local) crie um arquivo `.env` na raiz do painel com:
   ```
   VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=cole_aqui_a_anon_public_key
   ```
   Depois rode:
   ```
   npm install
   npm run dev
   ```
   Abra http://localhost:8080 e faça login com o email/senha que você criou no passo 2.3.

---

## 5. PUBLICAR O PAINEL (opcional)

O jeito mais simples é clicar em **Publish** dentro do Lovable.

Alternativas: Vercel, Netlify, Cloudflare Pages — basta conectar o repositório, definir as duas variáveis de ambiente acima e fazer build com `npm run build`.

---

## 6. RODAR O BOT LOCALMENTE

### 6.1 Instalar

```
cd whatsapp-bot
npm install
cp .env.example .env
```

Abra o `.env` e preencha:

```
SUPABASE_URL=https://SEU_PROJETO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=service_role_que_voce_copiou
GEMINI_API_KEY=sua_chave_gemini
COHERE_API_KEY=sua_chave_cohere
```

### 6.2 Primeira execução (desenvolvimento)

```
npm run dev
```

Um QR Code vai aparecer no terminal. No celular da loja:

1. Abra WhatsApp > Configurações (ou três pontinhos) > Aparelhos conectados.
2. Toque em **Conectar um aparelho** e aponte para o QR.
3. Aguarde a mensagem "WhatsApp conectado" no terminal.

Mande uma mensagem para o número da loja a partir de outro celular para testar.

### 6.3 Compilar para produção

```
npm run build
npm start
```

---

## 7. MANTER O BOT SEMPRE ONLINE

### 7.1 Opção A — PM2 (recomendado, funciona em Windows, Mac e Linux)

```
npm install -g pm2
npm run build
pm2 start ecosystem.config.js
pm2 save
```

Para iniciar automaticamente com o sistema:

- Linux/Mac:
  ```
  pm2 startup
  ```
  Copie e execute o comando que ele imprimir.

- Windows: instale o `pm2-windows-startup`:
  ```
  npm install -g pm2-windows-startup
  pm2-startup install
  pm2 save
  ```

Comandos úteis:
- Ver status: `pm2 status`
- Ver logs: `pm2 logs whatsapp-bot-loja`
- Reiniciar: `pm2 restart whatsapp-bot-loja`
- Parar: `pm2 stop whatsapp-bot-loja`

### 7.2 Opção B — Windows Service com node-windows

Crie `install-service.js` na pasta do bot:

```js
const Service = require("node-windows").Service;
const path = require("path");
const svc = new Service({
  name: "WhatsApp Bot Loja",
  description: "Bot WhatsApp da loja com IA",
  script: path.join(__dirname, "dist", "index.js"),
  nodeOptions: ["--harmony", "--max_old_space_size=512"]
});
svc.on("install", () => svc.start());
svc.install();
```

Rode (como administrador):
```
npm install node-windows
npm run build
node install-service.js
```

O bot agora sobe junto com o Windows.

---

## 8. TESTE PONTA A PONTA

1. No painel admin, faça login.
2. Vá em **Categorias** e crie pelo menos uma (ex: "Vestidos").
3. Vá em **Produtos > Novo Produto**, preencha nome e descrição, escolha a categoria, faça upload de uma foto, salve.
4. Em **Configurações do Bot**, ajuste nome do atendente, endereço da loja, mensagem de boas-vindas e horário.
5. Verifique em **Logs e Status** se o bot está com status **conectado** (heartbeat recente).
6. De outro celular, mande uma mensagem para o número da loja: por exemplo "tem vestido preto?".
7. O bot deve responder com a descrição e enviar a foto (se cadastrada).
8. No painel, vá em **Conversas** — a thread deve aparecer com a mensagem.
9. Clique em **Assumir conversa** para pausar o bot, escreva uma mensagem manual e envie. O bot local irá despachar via Baileys.
10. Clique em **Reativar bot** para liberar o atendimento automático novamente.

---

## 9. SOLUÇÃO DE PROBLEMAS

**QR Code não escaneia ou expira:**
- Apague a pasta `auth/` dentro de `whatsapp-bot/` e rode `npm run dev` de novo.
- Certifique-se que o WhatsApp do celular tem internet boa no momento.

**Bot ficou offline (status "disconnected"):**
- Veja os logs com `pm2 logs whatsapp-bot-loja`.
- Reinicie: `pm2 restart whatsapp-bot-loja`.
- Se persistir, apague a pasta `auth/` e gere novo QR.

**Erro "API key not valid" do Gemini ou Cohere:**
- Confirme que copiou a chave correta no `.env`.
- Reinicie o bot após alterar o `.env`.

**Imagens dos produtos não aparecem para o cliente:**
- Verifique se o bucket `product-images` está marcado como **public** em Storage.
- Verifique no painel se o produto tem foto cadastrada.

**Erro de RLS no painel ("new row violates row-level security policy"):**
- Confirme que rodou o `04_admin_setup.sql` substituindo o UUID corretamente.
- Confirme que está logado com o email do admin.

**Painel não mostra dados:**
- Verifique se as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` estão corretas.
- Abra o console do navegador (F12) e veja se há erros de rede para o Supabase.

---

## ESTRUTURA DE ARQUIVOS

```
sql/
  01_schema.sql        - tabelas, enums, funções, triggers
  02_rls.sql           - políticas de segurança
  03_storage.sql       - bucket de imagens
  04_admin_setup.sql   - promove um usuário a admin

whatsapp-bot/
  src/
    index.ts                       - bootstrap
    whatsapp/baileys-client.ts     - conexão WhatsApp + QR + reconnect
    core/message-handler.ts        - processa cada mensagem recebida
    core/context-manager.ts        - memória de contexto por conversa
    core/outbound-queue.ts         - envia mensagens manuais do painel
    core/offline-recovery.ts       - mensagem de retomada após offline
    core/heartbeat.ts              - sinaliza vida ao painel a cada 30s
    ai/gemini.ts                   - geração de respostas
    ai/cohere.ts                   - classificação de intenção e resumo
    ai/prompt-builder.ts           - monta o system prompt
    services/products.ts           - busca produtos no Supabase
    services/customers.ts          - cria/atualiza cliente
    services/conversations.ts      - persiste mensagens
    services/business-hours.ts     - valida horário comercial
    utils/logger.ts                - Pino + persistência opcional
    utils/anti-spam.ts             - dedupe e debounce
  ecosystem.config.js              - configuração PM2
  .env.example                     - modelo de variáveis
  package.json
  tsconfig.json
```

---

## SEGURANÇA

- A chave **service_role** do Supabase NUNCA pode ser exposta no painel ou no front-end. Ela só vive no `.env` do bot local.
- A chave **anon public** é pública por design — RLS do Supabase é o que protege os dados.
- O painel só funciona para usuários com `role = 'admin'` na tabela `user_roles`.
- O bot local roda com service role (ignora RLS) porque precisa atender qualquer cliente sem autenticação — por isso ele NÃO pode estar exposto na internet, somente no PC da loja.
