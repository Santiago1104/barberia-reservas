-- SOLO si ya ejecutaste una versión anterior de duracion_horarios.sql (con duraciones de 30 en 30).
-- Si todavía no la has ejecutado, ejecuta únicamente duracion_horarios.sql (ya incluye esto).

-- Duraciones de 10 a 240 minutos, de 5 en 5 (ej. 40 o 45)
alter table services drop constraint if exists services_duracion_chk;
alter table services add constraint services_duracion_chk
  check (duracion_min between 10 and 240 and duracion_min % 5 = 0);

-- El trigger detecta cualquier cruce entre la cita y una franja bloqueada de 30 minutos
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
