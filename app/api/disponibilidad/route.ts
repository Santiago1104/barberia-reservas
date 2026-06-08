import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const barberId = searchParams.get('barber_id');
  const fecha = searchParams.get('fecha');

  if (!barberId || !fecha) {
    return NextResponse.json({ error: 'faltan_parametros' }, { status: 400 });
  }

  // Solo devolvemos las HORAS ocupadas — ningún dato personal
  const { data, error } = await supabaseAdmin
    .from('appointments')
    .select('hora')
    .eq('barber_id', barberId)
    .eq('fecha', fecha)
    .eq('estado', 'confirmada');

  if (error) {
    return NextResponse.json({ error: 'error_consulta' }, { status: 500 });
  }

  const horasOcupadas = (data ?? []).map((c) => c.hora.slice(0, 5));
  return NextResponse.json({ horasOcupadas });
}