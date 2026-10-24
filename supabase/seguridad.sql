-- Ejecutar en el SQL Editor de Supabase. Revisar antes cada punto contra el esquema real.

-- 1) Un barbero no puede tener dos citas CONFIRMADAS a la misma hora,
--    pero una hora cancelada vuelve a poder reservarse.
--    (Si hoy existe un UNIQUE sobre barber_id, fecha, hora sin filtro, hay que borrarlo primero:
--     consultar con  select conname from pg_constraint where conrelid = 'appointments'::regclass;)
create unique index if not exists appointments_slot_confirmado_uq
  on appointments (barber_id, fecha, hora)
  where estado = 'confirmada';

-- 2) El token de cancelación debe ser único y no nulo
create unique index if not exists appointments_cancel_token_uq on appointments (cancel_token);

-- 3) Estado limitado a valores válidos
alter table appointments
  add constraint appointments_estado_chk check (estado in ('confirmada', 'cancelada')) not valid;

-- 4) RLS activo en todas las tablas
alter table appointments enable row level security;
alter table barbers enable row level security;
alter table services enable row level security;

-- 5) Lectura pública SOLO de barberos y servicios activos (lo usa /reservas con la clave anónima)
drop policy if exists "publico lee barberos activos" on barbers;
create policy "publico lee barberos activos" on barbers for select using (activo = true);
drop policy if exists "publico lee servicios activos" on services;
create policy "publico lee servicios activos" on services for select using (activo = true);

-- 6) Usuarios autenticados (barberos): leer todo y gestionar barberos/servicios.
--    Si se quiere restringir a ciertos correos, cambiar auth.role() por una comprobación de auth.jwt() ->> 'email'.
drop policy if exists "admin gestiona barberos" on barbers;
create policy "admin gestiona barberos" on barbers for all to authenticated using (true) with check (true);
drop policy if exists "admin gestiona servicios" on services;
create policy "admin gestiona servicios" on services for all to authenticated using (true) with check (true);
drop policy if exists "admin lee citas" on appointments;
create policy "admin lee citas" on appointments for select to authenticated using (true);

-- Nota: el rol anónimo NO tiene ninguna política sobre appointments; las citas solo
-- se crean/cancelan desde las API routes con la service role.
