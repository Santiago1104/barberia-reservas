-- Ejecutar en el SQL Editor de Supabase ANTES de desplegar este cambio.
-- Añade duración por servicio, horario semanal por barbero y franjas de 30 minutos.

-- 1) Duración de cada servicio (10 a 240 minutos, de 5 en 5). Los actuales quedan en 60.
alter table services add column if not exists duracion_min integer not null default 60;
alter table services drop constraint if exists services_duracion_chk;
alter table services add constraint services_duracion_chk
  check (duracion_min between 10 and 240 and duracion_min % 5 = 0);

-- 2) Cada cita guarda la duración con que se reservó (editar el servicio no altera el pasado)
alter table appointments add column if not exists duracion_min integer not null default 60;

-- 3) Horario semanal por barbero. dia_semana: 0 = domingo ... 6 = sábado.
--    Un día puede tener varios tramos (ej. mañana y tarde). Sin filas = ese día no trabaja.
create table if not exists horarios (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references barbers(id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6),
  hora_inicio time not null,
  hora_fin time not null,
  check (hora_fin > hora_inicio),
  unique (barber_id, dia_semana, hora_inicio)
);
alter table horarios enable row level security;  -- sin políticas: solo el servidor accede

-- Horario inicial de los barberos existentes: igual al que había (todos los días,
-- 9:00-12:00 y 14:00-18:00). El dueño lo ajusta después en /admin/horarios.
insert into horarios (barber_id, dia_semana, hora_inicio, hora_fin)
select b.id, d.dia, t.inicio, t.fin
from barbers b
cross join generate_series(0, 6) as d(dia)
cross join (values ('09:00'::time, '12:00'::time), ('14:00'::time, '18:00'::time)) as t(inicio, fin)
where b.activo = true
on conflict do nothing;

-- 4) Los bloqueos pasan a franjas de 30 minutos: cada bloqueo de hora completa existente
--    se completa con su media hora siguiente, para que sigan cubriendo la hora entera.
insert into bloqueos (barber_id, fecha, hora, creado_por)
select barber_id, fecha, hora + interval '30 minutes', creado_por
from bloqueos
where extract(minute from hora) = 0
on conflict (barber_id, fecha, hora) do nothing;

-- 5) Una cita confirmada no puede solaparse con otra del mismo barbero (respaldo en la base,
--    por si dos clientes reservan a la vez). Complementa al índice de "misma hora exacta".
create extension if not exists btree_gist with schema extensions;
alter table appointments drop constraint if exists appointments_sin_solape;
alter table appointments add constraint appointments_sin_solape
  exclude using gist (
    barber_id with =,
    tsrange(fecha + hora, fecha + hora + make_interval(mins => duracion_min), '[)') with &&
  ) where (estado = 'confirmada');

-- 6) El trigger de bloqueos ahora considera la duración de la cita
create or replace function impedir_cita_en_bloqueo() returns trigger
language plpgsql as $$
begin
  if new.estado = 'confirmada' and exists (
    select 1 from bloqueos b
    where b.barber_id = new.barber_id
      and b.fecha = new.fecha
      and b.hora < new.hora + make_interval(mins => new.duracion_min)
      and b.hora + interval '30 minutes' > new.hora
  ) then
    raise exception 'franja_bloqueada' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists trg_impedir_cita_en_bloqueo on appointments;
create trigger trg_impedir_cita_en_bloqueo
  before insert or update of estado, fecha, hora, duracion_min, barber_id on appointments
  for each row execute function impedir_cita_en_bloqueo();
