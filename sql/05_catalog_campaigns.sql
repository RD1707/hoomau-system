-- Adicionar campos de catálogo na tabela bot_config
ALTER TABLE public.bot_config
ADD COLUMN IF NOT EXISTS catalog_url text,
ADD COLUMN IF NOT EXISTS catalog_type text; -- 'link', 'pdf', 'docx', 'image'

-- Tabela para armazenar as campanhas de disparo em massa
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  message_variants text[] NOT NULL, -- Spin-tax: array com variações de mensagens
  status text DEFAULT 'pending', -- pending, running, paused, completed, cancelled
  batch_size int DEFAULT 10,
  pause_between_batches int DEFAULT 60, -- pausa entre lotes (em segundos)
  pause_between_messages int DEFAULT 5, -- pausa aleatória entre mensagens do lote (em segundos)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela para relacionar a campanha com os contatos e controlar envios individuais
CREATE TABLE IF NOT EXISTS public.campaign_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  status text DEFAULT 'pending', -- pending, sent, failed
  sent_at timestamptz,
  error_message text,
  UNIQUE(campaign_id, customer_id)
);

-- Triggers para updated_at nas novas tabelas
DROP TRIGGER IF EXISTS trg_campaigns_updated ON public.campaigns;
CREATE TRIGGER trg_campaigns_updated BEFORE UPDATE ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
