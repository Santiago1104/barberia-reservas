import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';
import { REGEX_ID, REGEX_FECHA, excedeLimite, ipDe } from '@/lib/seguridad';

export async function GET(request: Request) {
  if (excedeLimite(`disp:${ipDe(request)}`, 60, 60 * 1000)) {
    return NextResponse.json({ error: 'demasiados_intentos' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const barberId = searchParams.get('barber_id') ?? '';
  const fecha = searchParams.get('fecha') ?? '';

  if (!REGEX_ID.test(barberId) || !REGEX_FECHA.test(fecha)) {
    return NextResponse.json({ error: 'faltan_parametros' }, { status: 400 });
  }

  // Solo devolvemos las HORAS ocupadas — ningún dato personal
  const [{ data, error }, { data: bloqueos, error: errBloq }] = await Promise.all([
    supabaseAdmin
      .from('appointments')
      .select('hora')
      .eq('barber_id', barberId)
      .eq('fecha', fecha)
      .eq('estado', 'confirmada'),
    supabaseAdmin.from('bloqueos').select('hora').eq('barber_id', barberId).eq('fecha', fecha),
  ]);

  if (errBloq) console.error('Error al leer bloqueos:', errBloq);
  if (error) {
    return NextResponse.json({ error: 'error_consulta' }, { status: 500 });
  }

  const horasOcupadas = [...(data ?? []), ...(bloqueos ?? [])].map((c) => c.hora.slice(0, 5));
  return NextResponse.json({ horasOcupadas });
}
