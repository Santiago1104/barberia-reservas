import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';
import { REGEX_FECHA } from '@/lib/seguridad';
import { autorizarAgenda } from '@/lib/autorizar-agenda';
import { cargarDia } from '@/lib/agenda';
import { franjasDelDia, citaCubreFranja, aMin, deMin } from '@/lib/disponibilidad';
import { DIAS_BLOQUEO } from '@/lib/config-reservas';
import { hoyColombia, momentoCita } from '@/lib/tiempo';
import { hora12, fechaBonita } from '@/lib/formato';
import { enviarCancelacionPorBarberia } from '@/lib/email';
import { notificarBarbero } from '@/lib/notificar';

function fechaValida(fecha: unknown): fecha is string {
  return (
    typeof fecha === 'string' &&
    REGEX_FECHA.test(fecha) &&
    fecha >= hoyColombia() &&
    fecha <= hoyColombia(DIAS_BLOQUEO)
  );
}

function listaDeHoras(horas: unknown): string[] | null {
  if (!Array.isArray(horas) || horas.length === 0 || horas.length > 100) return null;
  if (!horas.every((h) => typeof h === 'string' && /^\d{2}:\d{2}$/.test(h))) return null;
  return [...new Set(horas as string[])];
}

// Estado de cada franja de 30 minutos del horario del día:
// libre, bloqueada, reservada o pasada
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const barberId = searchParams.get('barber_id');
  const fecha = searchParams.get('fecha');

  const ctx = await autorizarAgenda(barberId);
  if (ctx instanceof NextResponse) return ctx;
  if (!fechaValida(fecha)) {
    return NextResponse.json({ error: 'fecha_invalida' }, { status: 400 });
  }

  const dia = await cargarDia(barberId!, fecha);
  if (!dia) {
    return NextResponse.json({ error: 'error_consulta' }, { status: 500 });
  }

  const grilla = franjasDelDia(dia.rangos);
  const horasGrilla = new Set(grilla.map((f) => f.hora));

  // Bloqueos que ya no coinciden con la grilla (p. ej. se cambió el "cada ___ min" después)
  // se muestran igual para poder quitarlos
  const antiguas = dia.bloqueos
    .filter((b) => !horasGrilla.has(b.hora))
    .map((b) => ({ hora: b.hora, duracion: b.duracion_min }));

  const franjas = [...grilla, ...antiguas]
    .sort((x, y) => x.hora.localeCompare(y.hora))
    .map((f) => {
      const base = { hora: f.hora, fin: deMin(aMin(f.hora) + f.duracion) };
      const cita = dia.citas.find((c) => citaCubreFranja(c, f));
      if (cita) {
        return { ...base, estado: 'reservada', cliente: cita.nombre_cliente, inicio: cita.hora === f.hora };
      }
      if (dia.bloqueos.some((b) => b.hora === f.hora)) return { ...base, estado: 'bloqueada' };
      if (momentoCita(fecha, f.hora) <= Date.now()) return { ...base, estado: 'pasada' };
      return { ...base, estado: 'libre' };
    });
  return NextResponse.json({ franjas });
}

// Bloquear franjas. Si hay citas confirmadas que las cruzan, exige cancelar_citas: true
export async function POST(request: Request) {
  const cuerpo = await request.json().catch(() => ({}));
  const ctx = await autorizarAgenda(cuerpo.barber_id);
  if (ctx instanceof NextResponse) return ctx;

  const horasPedidas = listaDeHoras(cuerpo.horas);
  if (!fechaValida(cuerpo.fecha) || !horasPedidas) {
    return NextResponse.json({ error: 'datos_invalidos' }, { status: 400 });
  }
  const barberId: string = cuerpo.barber_id;
  const fecha: string = cuerpo.fecha;

  const dia = await cargarDia(barberId, fecha);
  if (!dia) {
    return NextResponse.json({ error: 'error_consulta' }, { status: 500 });
  }

  // Solo se bloquean franjas del horario de ese día que todavía no pasaron
  const grilla = new Map(franjasDelDia(dia.rangos).map((f) => [f.hora, f]));
  const franjasABloquear = horasPedidas
    .map((h) => grilla.get(h))
    .filter((f): f is { hora: string; duracion: number } => !!f && momentoCita(fecha, f.hora) > Date.now());
  const horas = franjasABloquear.map((f) => f.hora);
  if (franjasABloquear.length === 0) {
    return NextResponse.json({ error: 'datos_invalidos' }, { status: 400 });
  }

  // Citas confirmadas que serían afectadas (cualquiera que cubra alguna franja)
  const { data: citasDia, error: errCitas } = await supabaseAdmin
    .from('appointments')
    .select('id, hora, duracion_min, nombre_cliente, email_cliente')
    .eq('barber_id', barberId)
    .eq('fecha', fecha)
    .eq('estado', 'confirmada');
  if (errCitas) {
    return NextResponse.json({ error: 'error_consulta' }, { status: 500 });
  }
  const afectadas = (citasDia ?? []).filter((c) =>
    franjasABloquear.some((f) =>
      citaCubreFranja({ hora: c.hora.slice(0, 5), duracion_min: c.duracion_min ?? 60 }, f)
    )
  );

  if (afectadas.length > 0 && cuerpo.cancelar_citas !== true) {
    return NextResponse.json(
      {
        error: 'hay_citas',
        citas: afectadas.map((c) => ({ hora: c.hora.slice(0, 5), cliente: c.nombre_cliente })),
      },
      { status: 409 }
    );
  }

  // 1. Bloquear primero, para que nadie pueda reservar mientras se cancelan las citas
  const { error: errBloqueo } = await supabaseAdmin.from('bloqueos').upsert(
    franjasABloquear.map((f) => ({
      barber_id: barberId,
      fecha,
      hora: f.hora,
      duracion_min: f.duracion,
      creado_por: ctx.userEmail,
    })),
    { onConflict: 'barber_id,fecha,hora' }
  );
  if (errBloqueo) {
    console.error('Error al bloquear:', errBloqueo);
    return NextResponse.json({ error: 'error_bloquear' }, { status: 500 });
  }

  // 2. Cancelar las citas afectadas (solo las que sigan confirmadas)
  let canceladas = 0;
  if (afectadas.length > 0) {
    const { data: actualizadas, error: errCancel } = await supabaseAdmin
      .from('appointments')
      .update({ estado: 'cancelada' })
      .in('id', afectadas.map((c) => c.id))
      .eq('estado', 'confirmada')
      .select('id');
    if (errCancel) {
      console.error('Error al cancelar citas:', errCancel);
      return NextResponse.json({ error: 'error_cancelar' }, { status: 500 });
    }
    const idsCanceladas = new Set((actualizadas ?? []).map((c) => c.id));
    const aNotificar = afectadas.filter((c) => idsCanceladas.has(c.id));
    canceladas = aNotificar.length;

    // 3. Avisar a los clientes y al barbero (best-effort)
    const urlReservar = `${new URL(request.url).origin}/reservas`;
    await Promise.allSettled([
      ...aNotificar.map((c) =>
        enviarCancelacionPorBarberia({
          emailCliente: c.email_cliente,
          nombreCliente: c.nombre_cliente,
          barbero: ctx.barberoNombre,
          fecha: fechaBonita(fecha),
          hora: hora12(c.hora),
          urlReservar,
        })
      ),
      notificarBarbero(barberId, {
        asunto: `Citas canceladas por bloqueo - ${fechaBonita(fecha)}`,
        titulo: `Citas canceladas por ${ctx.barberoNombre}`,
        lineas: [
          `Fecha: ${fechaBonita(fecha)}`,
          ...aNotificar.map((c) => `${hora12(c.hora)} - ${c.nombre_cliente}`),
        ],
        push: {
          titulo: aNotificar.length === 1 ? 'Cita cancelada por bloqueo' : 'Citas canceladas por bloqueo',
          cuerpo:
            aNotificar
              .slice(0, 3)
              .map((c) => `${c.nombre_cliente} · ${hora12(c.hora)}`)
              .join(', ') + (aNotificar.length > 3 ? ` y ${aNotificar.length - 3} más` : ''),
        },
      }),
    ]);
  }

  return NextResponse.json({ ok: true, bloqueadas: horas.length, canceladas });
}

// Desbloquear franjas
export async function DELETE(request: Request) {
  const cuerpo = await request.json().catch(() => ({}));
  const ctx = await autorizarAgenda(cuerpo.barber_id);
  if (ctx instanceof NextResponse) return ctx;

  const horas = listaDeHoras(cuerpo.horas);
  if (typeof cuerpo.fecha !== 'string' || !REGEX_FECHA.test(cuerpo.fecha) || !horas) {
    return NextResponse.json({ error: 'datos_invalidos' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('bloqueos')
    .delete()
    .eq('barber_id', cuerpo.barber_id)
    .eq('fecha', cuerpo.fecha)
    .in('hora', horas);
  if (error) {
    return NextResponse.json({ error: 'error_desbloquear' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
