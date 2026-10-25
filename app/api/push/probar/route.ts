import { crearClienteServidor } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { excedeLimite } from '@/lib/seguridad';
import { enviarPush } from '@/lib/push';

// Envía una notificación de prueba a los dispositivos del propio usuario
export async function POST() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'no_autorizado' }, { status: 401 });
  }
  if (excedeLimite(`push-prueba:${user.id}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'demasiados_intentos' }, { status: 429 });
  }

  const enviadas = await enviarPush([user.email], {
    titulo: 'Notificaciones activadas',
    cuerpo: 'Así verás tus reservas: nombre del cliente y hora.',
    url: '/admin',
  });
  return NextResponse.json({ ok: true, enviadas });
}
