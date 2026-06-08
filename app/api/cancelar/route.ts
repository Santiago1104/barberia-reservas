import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function notificarWhatsApp(mensaje: string) {
  const phone = process.env.CALLMEBOT_PHONE;
  const apikey = process.env.CALLMEBOT_APIKEY;
  const url =
    `https://api.callmebot.com/whatsapp.php?phone=${phone}` +
    `&text=${encodeURIComponent(mensaje)}&apikey=${apikey}`;
  try {
    const res = await fetch(url);
    if (!res.ok) console.error('CallMeBot error:', res.status);
  } catch (err) {
    console.error('No se pudo enviar WhatsApp:', err);
  }
}

export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: 'sin_token' }, { status: 400 });
    }

    // 1. Buscar la cita por su token
    const { data: cita, error: errBuscar } = await supabase
      .from('appointments')
      .select(
        'id, fecha, hora, estado, nombre_cliente, barbers(nombre), services(nombre)'
      )
      .eq('cancel_token', token)
      .single();

    if (errBuscar || !cita) {
      return NextResponse.json({ error: 'no_encontrada' }, { status: 404 });
    }

    // 2. Si ya estaba cancelada
    if (cita.estado === 'cancelada') {
      return NextResponse.json({ error: 'ya_cancelada' }, { status: 409 });
    }

    // 3. Validar la regla de los 30 minutos
    const [año, mes, dia] = cita.fecha.split('-').map(Number);
    const [h, m] = cita.hora.split(':').map(Number);
    const fechaCita = new Date(año, mes - 1, dia, h, m, 0, 0);
    const limite = new Date(fechaCita.getTime() - 30 * 60 * 1000); // 30 min antes

    if (new Date() > limite) {
      return NextResponse.json({ error: 'fuera_de_plazo' }, { status: 409 });
    }

    // 4. Cancelar (cambiar estado)
    const { error: errUpdate } = await supabase
      .from('appointments')
      .update({ estado: 'cancelada' })
      .eq('cancel_token', token);

    if (errUpdate) {
      return NextResponse.json({ error: 'error_cancelar' }, { status: 500 });
    }

    // 5. Avisar al dueño
    const barbero = (cita.barbers as { nombre: string } | null)?.nombre ?? '—';
    const servicio = (cita.services as { nombre: string } | null)?.nombre ?? '—';
    const mensaje =
      `Reserva CANCELADA\n` +
      `Cliente: ${cita.nombre_cliente}\n` +
      `Barbero: ${barbero}\n` +
      `Servicio: ${servicio}\n` +
      `Era: ${cita.fecha} a las ${cita.hora.slice(0, 5)}`;
    await notificarWhatsApp(mensaje);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error inesperado:', err);
    return NextResponse.json({ error: 'error_inesperado' }, { status: 500 });
  }
}