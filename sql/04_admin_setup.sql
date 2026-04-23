-- =====================================================================
-- TORNAR UM USUÁRIO ADMIN
-- Passos:
-- 1. Crie um usuário em Authentication > Users no painel do Supabase
--    (Add user > Create new user > preencha email e senha).
-- 2. Copie o ID desse usuário.
-- 3. Substitua 'COLE_O_UUID_DO_USUARIO_AQUI' abaixo pelo ID copiado.
-- 4. Rode este script no SQL Editor.
-- =====================================================================

insert into public.user_roles (user_id, role)
values ('COLE_O_UUID_DO_USUARIO_AQUI', 'admin')
on conflict (user_id, role) do nothing;

-- Verificar:
-- select u.email, ur.role
-- from auth.users u
-- join public.user_roles ur on ur.user_id = u.id;
