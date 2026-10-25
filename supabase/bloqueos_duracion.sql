-- Ejecutar en el SQL Editor de Supabase (después de paso_horario.sql).
-- Cada bloqueo guarda cuánto dura: ahora las franjas bloqueables son las mismas horas que ve el
-- cliente (según el "cada N min" de cada tramo), no bloques fijos de 30 minutos.
-- Los bloqueos existentes quedan en 30 minutos, como eran.

alter table bloqueos add column if not exists duracion_min integer not null default 30;
alter table bloqueos drop constraint if exists bloqueos_duracion_chk;
alter table bloqueos add constraint bloqueos_duracion_chk
  check (duracion_min between 5 and 240 and duracion_min % 5 = 0);

-- El trigger usa la duración propia de cada bloqueo
create or replace function impedir_cita_en_bloqueo() returns trigger
language plpgsql as $$
begin
  if new.estado = 'confirmada' and exists (
    select 1 from bloqueos b
    where b.barber_id = new.barber_id
      and b.fecha = new.fecha
      and b.hora < new.hora + make_interval(mins => new.duracion_min)
      and b.hora + make_interval(mins => b.duracion_min) > new.hora
  ) then
    raise exception 'franja_bloqueada' using errcode = 'P0001';
  end if;
  return new;
end $$;
