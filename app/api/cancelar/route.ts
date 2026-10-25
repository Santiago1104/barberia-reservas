import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';
import { enviarCancelacion } from '@/lib/email';
import { hora12, fechaBonita } from '@/lib/formato';
import { notificarBarbero } from '@/lib/notificar';
import { MINUTOS_CANCELACION } from '@/lib/config-reservas';
import { momentoCita } from '@/lib/tiempo';
import { REGEX_ID, excedeLimite, ipDe } from '@/lib/seguridad';

const supabase = supabaseAdmin;

export async function POST(request: Request) {
  try {
    // Máximo 10 intentos por IP cada 10 minutos (frena adivinar tokens)
    if (excedeLimite(`cancelar:${ipDe(request)}`, 10, 10 * 60 * 1000)) {
      return NextResponse.json({ error: 'demasiados_intentos' }, { status: 429 });
    }

    const cuerpo = await request.json().catch(() => null);
    const token = typeof cuerpo?.token === 'string' ? cuerpo.token : '';
    if (!REGEX_ID.test(token)) {
      return NextResponse.json({ error: 'sin_token' }, { status: 400 });
    }

    // 1. Buscar la cita por su token
    const { data: cita, error: errBuscar } = await supabase
      .from('appointments')
      .select(
        'id, barber_id, fecha, hora, estado, nombre_cliente, email_cliente, barbers(nombre), services(nombre)'
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

    // 3. Regla de los 30 minutos (hora de Colombia, independiente del servidor)
    const limite = momentoCita(cita.fecha, cita.hora) - MINUTOS_CANCELACION * 60 * 1000;
    if (Date.now() > limite) {
      return NextResponse.json({ error: 'fuera_de_plazo' }, { status: 409 });
    }

    // 4. Cancelar solo si sigue confirmada (evita doble cancelación simultánea)
    const { data: actualizadas, error: errUpdate } = await supabase
      .from('appointments')
      .update({ estado: 'cancelada' })
      .eq('cancel_token', token)
      .eq('estado', 'confirmada')
      .select('id');

    if (errUpdate) {
      return NextResponse.json({ error: 'error_cancelar' }, { status: 500 });
    }
    if (!actualizadas || actualizadas.length === 0) {
      return NextResponse.json({ error: 'ya_cancelada' }, { status: 409 });
    }

    // 5. Avisar al dueño y al cliente (best-effort, en paralelo)
    const barbero =
      (cita.barbers as unknown as { nombre: string } | null)?.nombre ?? '—';
    const servicio =
      (cita.services as unknown as { nombre: string } | null)?.nombre ?? '—';
    await Promise.allSettled([
      notificarBarbero(cita.barber_id, {
        asunto: `Cita cancelada - ${fechaBonita(cita.fecha)} ${hora12(cita.hora)}`,
        titulo: 'Reserva CANCELADA',
        lineas: [
          `Cliente: ${cita.nombre_cliente}`,
          `Barbero: ${barbero}`,
          `Servicio: ${servicio}`,
          `Fecha: ${fechaBonita(cita.fecha)} a las ${hora12(cita.hora)}`,
        ],
        push: {
          titulo: 'Cita cancelada',
          cuerpo: `${cita.nombre_cliente} · ${hora12(cita.hora)} · ${fechaBonita(cita.fecha)}`,
        },
      }),
      enviarCancelacion({
        emailCliente: cita.email_cliente,
        nombreCliente: cita.nombre_cliente,
        fecha: fechaBonita(cita.fecha),
        hora: hora12(cita.hora),
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error inesperado:', err);
    return NextResponse.json({ error: 'error_inesperado' }, { status: 500 });
  }
}
