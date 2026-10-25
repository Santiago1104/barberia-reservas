import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';
import { REGEX_ID, REGEX_FECHA, excedeLimite, ipDe } from '@/lib/seguridad';
import { cargarDia } from '@/lib/agenda';
import { horasLibres } from '@/lib/disponibilidad';
import { DIAS_ANTICIPACION } from '@/lib/config-reservas';
import { hoyColombia } from '@/lib/tiempo';

// Horas de inicio disponibles para un barbero, servicio y día.
// Solo devuelve horas: ningún dato personal de otros clientes.
export async function GET(request: Request) {
  if (excedeLimite(`disp:${ipDe(request)}`, 60, 60 * 1000)) {
    return NextResponse.json({ error: 'demasiados_intentos' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const barberId = searchParams.get('barber_id') ?? '';
  const serviceId = searchParams.get('service_id') ?? '';
  const fecha = searchParams.get('fecha') ?? '';

  if (!REGEX_ID.test(barberId) || !REGEX_ID.test(serviceId) || !REGEX_FECHA.test(fecha)) {
    return NextResponse.json({ error: 'faltan_parametros' }, { status: 400 });
  }

  // Fuera de la ventana de reserva no hay horas
  if (fecha < hoyColombia() || fecha > hoyColombia(DIAS_ANTICIPACION)) {
    return NextResponse.json({ horas: [] });
  }

  const { data: servicio } = await supabaseAdmin
    .from('services')
    .select('duracion_min')
    .eq('id', serviceId)
    .eq('activo', true)
    .maybeSingle();
  if (!servicio) {
    return NextResponse.json({ error: 'faltan_parametros' }, { status: 400 });
  }

  const dia = await cargarDia(barberId, fecha);
  if (!dia) {
    return NextResponse.json({ error: 'error_consulta' }, { status: 500 });
  }

  const horas = horasLibres({
    fecha,
    rangos: dia.rangos,
    duracion: servicio.duracion_min ?? 60,
    citas: dia.citas,
    bloqueos: dia.bloqueos,
  });
  return NextResponse.json({ horas });
}
