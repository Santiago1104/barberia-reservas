-- Ejecutar en el SQL Editor de Supabase ANTES de desplegar este cambio.
-- Guarda en cada cita el precio con que se reservó, para que editar el precio de un
-- servicio no altere las estadísticas ni la agenda del pasado.

alter table appointments add column if not exists precio numeric;

-- Citas existentes: se les asigna el precio actual del servicio
update appointments a
set precio = s.precio
from services s
where a.service_id = s.id and a.precio is null;
