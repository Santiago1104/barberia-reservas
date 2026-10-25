import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';
import { autorizarAgenda } from '@/lib/autorizar-agenda';
import { aMin, type Rango } from '@/lib/disponibilidad';
import { DURACION_MIN, DURACION_MAX, DURACION_PASO, PASO_INICIO_MIN } from '@/lib/config-reservas';

// Cualquier hora en pasos de 5 minutos (ej. 10:20)
const REGEX_HORA = /^([01]\d|2[0-3]):[0-5][05]$/;

// Horario semanal de un barbero: { dias: { "0": [{inicio, fin}], ... "6": [...] } }
export async function GET(request: Request) {
  const barberId = new URL(request.url).searchParams.get('barber_id');
  const ctx = await autorizarAgenda(barberId);
  if (ctx instanceof NextResponse) return ctx;

  const { data, error } = await supabaseAdmin
    .from('horarios')
    .select('dia_semana, hora_inicio, hora_fin, paso_min')
    .eq('barber_id', barberId!);
  if (error) {
    return NextResponse.json({ error: 'error_consulta' }, { status: 500 });
  }

  const dias: Record<string, Rango[]> = { '0': [], '1': [], '2': [], '3': [], '4': [], '5': [], '6': [] };
  for (const h of data ?? []) {
    dias[String(h.dia_semana)].push({
      inicio: h.hora_inicio.slice(0, 5),
      fin: h.hora_fin.slice(0, 5),
      paso: h.paso_min ?? PASO_INICIO_MIN,
    });
  }
  for (const d of Object.keys(dias)) dias[d].sort((a, b) => a.inicio.localeCompare(b.inicio));
  return NextResponse.json({ dias });
}

// Reemplaza todo el horario semanal. Las citas ya reservadas no se tocan.
export async function PUT(request: Request) {
  const cuerpo = await request.json().catch(() => ({}));
  const ctx = await autorizarAgenda(cuerpo.barber_id);
  if (ctx instanceof NextResponse) return ctx;

  const dias = cuerpo.dias;
  if (!dias || typeof dias !== 'object') {
    return NextResponse.json({ error: 'datos_invalidos' }, { status: 400 });
  }

  const filas: {
    barber_id: string;
    dia_semana: number;
    hora_inicio: string;
    hora_fin: string;
    paso_min: number;
  }[] = [];
  for (let dia = 0; dia <= 6; dia++) {
    const rangos = dias[String(dia)];
    if (rangos === undefined) continue;
    if (!Array.isArray(rangos) || rangos.length > 3) {
      return NextResponse.json({ error: 'datos_invalidos' }, { status: 400 });
    }
    const limpios: Rango[] = [];
    for (const r of rangos) {
      if (
        typeof r?.inicio !== 'string' ||
        typeof r?.fin !== 'string' ||
        !REGEX_HORA.test(r.inicio) ||
        !REGEX_HORA.test(r.fin) ||
        aMin(r.fin) - aMin(r.inicio) < DURACION_MIN
      ) {
        return NextResponse.json({ error: 'horario_invalido' }, { status: 400 });
      }
      const paso = r.paso === undefined ? PASO_INICIO_MIN : Number(r.paso);
      if (
        !Number.isInteger(paso) ||
        paso < DURACION_PASO ||
        paso > DURACION_MAX ||
        paso % DURACION_PASO !== 0
      ) {
        return NextResponse.json({ error: 'paso_invalido' }, { status: 400 });
      }
      limpios.push({ inicio: r.inicio, fin: r.fin, paso });
    }
    // Los tramos de un mismo día no pueden solaparse
    limpios.sort((a, b) => a.inicio.localeCompare(b.inicio));
    for (let i = 1; i < limpios.length; i++) {
      if (aMin(limpios[i].inicio) < aMin(limpios[i - 1].fin)) {
        return NextResponse.json({ error: 'tramos_solapados' }, { status: 400 });
      }
    }
    for (const r of limpios) {
      filas.push({
        barber_id: cuerpo.barber_id,
        dia_semana: dia,
        hora_inicio: r.inicio,
        hora_fin: r.fin,
        paso_min: r.paso ?? PASO_INICIO_MIN,
      });
    }
  }

  const { error: errBorrar } = await supabaseAdmin
    .from('horarios')
    .delete()
    .eq('barber_id', cuerpo.barber_id);
  if (errBorrar) {
    return NextResponse.json({ error: 'error_guardar' }, { status: 500 });
  }
  if (filas.length > 0) {
    const { error } = await supabaseAdmin.from('horarios').insert(filas);
    if (error) {
      console.error('Error al guardar horario:', error);
      return NextResponse.json({ error: 'error_guardar' }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true });
}
