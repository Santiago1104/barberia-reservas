-- Ejecutar en el SQL Editor de Supabase.
-- Dispositivos que recibieron permiso para notificaciones push. Cada fila es un
-- celular o navegador de un barbero (o del dueño). Solo el servidor accede a esta tabla.

create table if not exists push_suscripciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,            -- correo (en minúsculas) de quien activó las notificaciones
  endpoint text not null unique,  -- dirección de entrega del dispositivo (es un secreto)
  p256dh text not null,
  auth text not null,
  agente text,                    -- navegador/dispositivo, solo informativo
  creado_en timestamptz not null default now()
);

create index if not exists push_suscripciones_email_idx on push_suscripciones (email);

-- Sin políticas: ni la clave pública ni los usuarios autenticados pueden leerla o escribirla
alter table push_suscripciones enable row level security;
