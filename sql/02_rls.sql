-- =====================================================================
-- ROW LEVEL SECURITY
-- O painel é usado APENAS pelo dono (admin). O bot acessa via SERVICE ROLE
-- (que ignora RLS), portanto não precisa de policies para o bot.
-- =====================================================================

-- Habilitar RLS em todas as tabelas
alter table public.profiles            enable row level security;
alter table public.user_roles          enable row level security;
alter table public.categories          enable row level security;
alter table public.collections         enable row level security;
alter table public.products            enable row level security;
alter table public.product_images      enable row level security;
alter table public.product_collections enable row level security;
alter table public.customers           enable row level security;
alter table public.conversations       enable row level security;
alter table public.messages            enable row level security;
alter table public.outbound_messages   enable row level security;
alter table public.bot_config          enable row level security;
alter table public.faqs                enable row level security;
alter table public.business_hours      enable row level security;
alter table public.bot_status          enable row level security;
alter table public.logs                enable row level security;

-- ---------- PROFILES ----------
drop policy if exists "profile self read"   on public.profiles;
drop policy if exists "profile self update" on public.profiles;
create policy "profile self read"   on public.profiles for select using (auth.uid() = id);
create policy "profile self update" on public.profiles for update using (auth.uid() = id);

-- ---------- USER_ROLES (somente admin gerencia; usuário pode ler o próprio) ----------
drop policy if exists "roles self read"  on public.user_roles;
drop policy if exists "roles admin all"  on public.user_roles;
create policy "roles self read" on public.user_roles for select using (auth.uid() = user_id);
create policy "roles admin all" on public.user_roles for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ---------- HELPER MACRO: políticas de admin para tabelas operacionais ----------
-- Repetimos manualmente porque SQL puro não tem macro. Cada tabela: admin pode tudo.

-- categories
drop policy if exists "categories admin all" on public.categories;
create policy "categories admin all" on public.categories for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- collections
drop policy if exists "collections admin all" on public.collections;
create policy "collections admin all" on public.collections for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- products
drop policy if exists "products admin all" on public.products;
create policy "products admin all" on public.products for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- product_images
drop policy if exists "product_images admin all" on public.product_images;
create policy "product_images admin all" on public.product_images for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- product_collections
drop policy if exists "product_collections admin all" on public.product_collections;
create policy "product_collections admin all" on public.product_collections for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- customers
drop policy if exists "customers admin all" on public.customers;
create policy "customers admin all" on public.customers for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- conversations
drop policy if exists "conversations admin all" on public.conversations;
create policy "conversations admin all" on public.conversations for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- messages
drop policy if exists "messages admin all" on public.messages;
create policy "messages admin all" on public.messages for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- outbound_messages
drop policy if exists "outbound admin all" on public.outbound_messages;
create policy "outbound admin all" on public.outbound_messages for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- bot_config
drop policy if exists "bot_config admin all" on public.bot_config;
create policy "bot_config admin all" on public.bot_config for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- faqs
drop policy if exists "faqs admin all" on public.faqs;
create policy "faqs admin all" on public.faqs for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- business_hours
drop policy if exists "business_hours admin all" on public.business_hours;
create policy "business_hours admin all" on public.business_hours for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- bot_status
drop policy if exists "bot_status admin read"  on public.bot_status;
create policy "bot_status admin read" on public.bot_status for select
  using (public.has_role(auth.uid(), 'admin'));

-- logs (admin lê)
drop policy if exists "logs admin read" on public.logs;
create policy "logs admin read" on public.logs for select
  using (public.has_role(auth.uid(), 'admin'));
