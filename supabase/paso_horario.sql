-- Ejecutar en el SQL Editor de Supabase (después de duracion_horarios.sql).
-- Cada tramo del horario define cada cuántos minutos se ofrece una hora de inicio
-- (ej. 40 -> 10:20, 11:00, 11:40...), independiente de la duración del servicio.
-- Los tramos existentes quedan en 15, igual que hasta ahora.

alter table horarios add column if not exists paso_min integer not null default 15;
alter table horarios drop constraint if exists horarios_paso_chk;
alter table horarios add constraint horarios_paso_chk
  check (paso_min between 5 and 240 and paso_min % 5 = 0);
