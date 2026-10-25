-- Ejecutar en el SQL Editor de Supabase (después de bloqueos.sql).
-- Cierra el acceso directo: a partir de aquí, los datos sensibles solo se leen/escriben desde
-- el servidor (service role), donde se comprueba quién es el dueño y qué barbero es cada usuario.

-- 1) Cuenta de Supabase Auth ligada a cada barbero
alter table barbers add column if not exists user_id uuid references auth.users(id) on delete set null;

-- 2) Quitar políticas que daban acceso a CUALQUIER usuario autenticado
--    (comprobar antes con:  select tablename, policyname from pg_policies where schemaname = 'public';)
drop policy if exists "admin gestiona barberos" on barbers;
drop policy if exists "admin gestiona servicios" on services;
drop policy if exists "admin lee citas" on appointments;

-- 3) Columnas privadas de barbers (email, user_id) no legibles con la clave pública
revoke select on barbers from anon, authenticated;
grant select (id, nombre, descripcion, foto_url, activo) on barbers to anon, authenticated;

-- Las políticas "publico lee barberos/servicios activos" de seguridad.sql se mantienen.
-- Comprobación: con la clave anónima, esto debe fallar por permisos:
--   GET /rest/v1/barbers?select=email
