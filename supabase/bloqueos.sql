-- Ejecutar en el SQL Editor de Supabase (después de seguridad.sql).
-- Nota: si barbers.id NO es uuid, cambiar el tipo de barber_id abajo para que coincida.

-- 1) Correo de login de cada barbero (liga usuario <-> barbero). NO se expone al público:
--    /reservas pide columnas explícitas, sin esta.
alter table barbers add column if not exists email text;
create unique index if not exists barbers_email_uq on barbers (lower(email)) where email is not null;

-- 2) Franjas bloqueadas por el barbero
create table if not exists bloqueos (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references barbers(id) on delete cascade,
  fecha date not null,
  hora time not null,
  creado_por text,
  creado_en timestamptz not null default now(),
  unique (barber_id, fecha, hora)
);

-- Solo el servidor (service role) accede: sin políticas = nadie más puede leer ni escribir
alter table bloqueos enable row level security;

-- 3) Respaldo en la base: no se puede crear una cita confirmada en una franja bloqueada
create or replace function impedir_cita_en_bloqueo() returns trigger
language plpgsql as $$
begin
  if new.estado = 'confirmada' and exists (
    select 1 from bloqueos b
    where b.barber_id = new.barber_id and b.fecha = new.fecha and b.hora = new.hora
  ) then
    raise exception 'franja_bloqueada' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists trg_impedir_cita_en_bloqueo on appointments;
create trigger trg_impedir_cita_en_bloqueo
  before insert or update of estado, fecha, hora, barber_id on appointments
  for each row execute function impedir_cita_en_bloqueo();
