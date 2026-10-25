import { crearClienteServidor } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';
import { esAdmin, REGEX_ID, REGEX_FECHA } from '@/lib/seguridad';
import { barberosPermitidos } from '@/lib/permisos';
import { HORARIO, DIAS_BLOQUEO } from '@/lib/config-reservas';
import { hoyColombia, momentoCita } from '@/lib/tiempo';
import { hora12, fechaBonita } from '@/lib/formato';
import { enviarCancelacionPorBarberia } from '@/lib/email';
import { notificarBarbero } from '@/lib/notificar';

type Contexto = { barberoNombre: string; userEmail: string };

// Verifica sesión y que el usuario pueda gestionar la agenda de ese barbero
async function autorizar(barberId: unknown): Promise<Contexto | NextResponse> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'no_autorizado' }, { status: 401 });
  }
  if (typeof barberId !== 'string' || !REGEX_ID.test(barberId)) {
    return NextResponse.json({ error: 'datos_invalidos' }, { status: 400 });
  }
  const permitidos = await barberosPermitidos(user, esAdmin(user));
  const barbero = permitidos.find((b) => b.id === barberId);
  if (!barbero) {
    return NextResponse.json({ error: 'prohibido' }, { status: 403 });
  }
  return { barberoNombre: barbero.nombre, userEmail: user.email ?? '' };
}

function fechaValida(fecha: unknown): fecha is string {
  return (
    typeof fecha === 'string' &&
    REGEX_FECHA.test(fecha) &&
    fecha >= hoyColombia() &&
    fecha <= hoyColombia(DIAS_BLOQUEO)
  );
}

function horasValidas(horas: unknown): string[] | null {
  if (!Array.isArray(horas) || horas.length === 0) return null;
  const unicas = [...new Set(horas)];
  if (!unicas.every((h) => typeof h === 'string' && HORARIO.includes(h))) return null;
  return unicas as string[];
}

// Estado de cada franja de un día: libre, bloqueada, reservada o pasada
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const barberId = searchParams.get('barber_id');
  const fecha = searchParams.get('fecha');

  const ctx = await autorizar(barberId);
  if (ctx instanceof NextResponse) return ctx;
  if (!fechaValida(fecha)) {
    return NextResponse.json({ error: 'fecha_invalida' }, { status: 400 });
  }

  const [{ data: citas }, { data: bloqueos }] = await Promise.all([
    supabaseAdmin
      .from('appointments')
      .select('hora, nombre_cliente')
      .eq('barber_id', barberId!)
      .eq('fecha', fecha)
      .eq('estado', 'confirmada'),
    supabaseAdmin.from('bloqueos').select('hora').eq('barber_id', barberId!).eq('fecha', fecha),
  ]);

  const franjas = HORARIO.map((hora) => {
    const cita = (citas ?? []).find((c) => c.hora.slice(0, 5) === hora);
    if (cita) return { hora, estado: 'reservada', cliente: cita.nombre_cliente };
    if ((bloqueos ?? []).some((b) => b.hora.slice(0, 5) === hora)) return { hora, estado: 'bloqueada' };
    if (momentoCita(fecha, hora) <= Date.now()) return { hora, estado: 'pasada' };
    return { hora, estado: 'libre' };
  });
  return NextResponse.json({ franjas });
}

// Bloquear franjas. Si hay citas confirmadas en ellas, exige cancelar_citas: true
export async function POST(request: Request) {
  const cuerpo = await request.json().catch(() => ({}));
  const ctx = await autorizar(cuerpo.barber_id);
  if (ctx instanceof NextResponse) return ctx;

  const horasPedidas = horasValidas(cuerpo.horas);
  if (!fechaValida(cuerpo.fecha) || !horasPedidas) {
    return NextResponse.json({ error: 'datos_invalidos' }, { status: 400 });
  }
  const barberId: string = cuerpo.barber_id;
  const fecha: string = cuerpo.fecha;
  // Las franjas que ya pasaron no se pueden bloquear
  const horas = horasPedidas.filter((h) => momentoCita(fecha, h) > Date.now());
  if (horas.length === 0) {
    return NextResponse.json({ error: 'datos_invalidos' }, { status: 400 });
  }

  // Citas confirmadas que serían afectadas
  const { data: citas, error: errCitas } = await supabaseAdmin
    .from('appointments')
    .select('id, hora, nombre_cliente, email_cliente')
    .eq('barber_id', barberId)
    .eq('fecha', fecha)
    .eq('estado', 'confirmada')
    .in('hora', horas);
  if (errCitas) {
    return NextResponse.json({ error: 'error_consulta' }, { status: 500 });
  }

  const afectadas = citas ?? [];
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
    horas.map((hora) => ({
      barber_id: barberId,
      fecha,
      hora,
      creado_por: ctx.userEmail,
    })),
    { onConflict: 'barber_id,fecha,hora', ignoreDuplicates: true }
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

    // 3. Avisar a los clientes y al dueño (best-effort)
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
      }),
    ]);
  }

  return NextResponse.json({ ok: true, bloqueadas: horas.length, canceladas });
}

// Desbloquear franjas
export async function DELETE(request: Request) {
  const cuerpo = await request.json().catch(() => ({}));
  const ctx = await autorizar(cuerpo.barber_id);
  if (ctx instanceof NextResponse) return ctx;

  const horas = horasValidas(cuerpo.horas);
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
