import { crearClienteServidor } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';
import { esAdmin, excedeLimite } from '@/lib/seguridad';
import { barberosPermitidos } from '@/lib/permisos';

// Solo el dueño y los barberos pueden registrar un dispositivo
async function usuarioConAgenda() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  if (esAdmin(user)) return user;
  return (await barberosPermitidos(user)).length > 0 ? user : null;
}

// Registrar este dispositivo para recibir notificaciones
export async function POST(request: Request) {
  const user = await usuarioConAgenda();
  if (!user) {
    return NextResponse.json({ error: 'no_autorizado' }, { status: 401 });
  }
  if (excedeLimite(`push:${user.id}`, 20, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'demasiados_intentos' }, { status: 429 });
  }

  const cuerpo = await request.json().catch(() => ({}));
  const endpoint = cuerpo?.endpoint;
  const p256dh = cuerpo?.keys?.p256dh;
  const auth = cuerpo?.keys?.auth;
  if (
    typeof endpoint !== 'string' ||
    !endpoint.startsWith('https://') ||
    endpoint.length > 1000 ||
    typeof p256dh !== 'string' ||
    typeof auth !== 'string' ||
    p256dh.length > 200 ||
    auth.length > 100
  ) {
    return NextResponse.json({ error: 'datos_invalidos' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('push_suscripciones').upsert(
    {
      user_id: user.id,
      email: user.email!.toLowerCase(),
      endpoint,
      p256dh,
      auth,
      agente: (request.headers.get('user-agent') ?? '').slice(0, 200),
    },
    { onConflict: 'endpoint' }
  );
  if (error) {
    console.error('Error al guardar la suscripción push:', error);
    return NextResponse.json({ error: 'error_guardar' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// Quitar este dispositivo
export async function DELETE(request: Request) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'no_autorizado' }, { status: 401 });
  }

  const { endpoint } = await request.json().catch(() => ({}));
  if (typeof endpoint !== 'string' || endpoint.length > 1000) {
    return NextResponse.json({ error: 'datos_invalidos' }, { status: 400 });
  }

  // Solo se puede quitar un dispositivo propio
  const { error } = await supabaseAdmin
    .from('push_suscripciones')
    .delete()
    .eq('endpoint', endpoint)
    .eq('email', user.email.toLowerCase());
  if (error) {
    return NextResponse.json({ error: 'error_borrar' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
