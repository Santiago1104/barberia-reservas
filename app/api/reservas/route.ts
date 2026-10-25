import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';
import { enviarConfirmacion } from '@/lib/email';
import { hora12, fechaBonita } from '@/lib/formato';
import { notificarBarbero } from '@/lib/notificar';
import { HORARIO, DIAS_ANTICIPACION } from '@/lib/config-reservas';
import { hoyColombia, momentoCita } from '@/lib/tiempo';
import {
  REGEX_ID,
  REGEX_FECHA,
  REGEX_EMAIL,
  excedeLimite,
  ipDe,
} from '@/lib/seguridad';

const supabase = supabaseAdmin;

function limpiar(valor: unknown, max: number): string {
  return typeof valor === 'string' ? valor.trim().slice(0, max) : '';
}

export async function POST(request: Request) {
  try {
    // Máximo 5 reservas por IP cada 10 minutos
    if (excedeLimite(`reservas:${ipDe(request)}`, 5, 10 * 60 * 1000)) {
      return NextResponse.json({ error: 'demasiados_intentos' }, { status: 429 });
    }

    const datos = await request.json().catch(() => null);
    if (!datos || typeof datos !== 'object') {
      return NextResponse.json({ error: 'datos_invalidos' }, { status: 400 });
    }

    const barber_id = limpiar(datos.barber_id, 40);
    const service_id = limpiar(datos.service_id, 40);
    const fecha = limpiar(datos.fecha, 10);
    const hora = limpiar(datos.hora, 5);
    const nombre_cliente = limpiar(datos.nombre_cliente, 80);
    const telefono_cliente = limpiar(datos.telefono_cliente, 20);
    const email_cliente = limpiar(datos.email_cliente, 254);

    // Validación de formato
    const campos: string[] = [];
    if (!REGEX_ID.test(barber_id)) campos.push('barber_id');
    if (!REGEX_ID.test(service_id)) campos.push('service_id');
    if (!REGEX_FECHA.test(fecha)) campos.push('fecha');
    if (!HORARIO.includes(hora)) campos.push('hora');
    if (nombre_cliente.length < 2) campos.push('nombre');
    if (!/^[+\d][\d\s().-]{6,19}$/.test(telefono_cliente)) campos.push('telefono');
    if (!REGEX_EMAIL.test(email_cliente)) campos.push('email');
    if (campos.length > 0) {
      console.warn('Reserva rechazada, campos inválidos:', campos);
      return NextResponse.json({ error: 'datos_invalidos', campos }, { status: 400 });
    }

    // Fecha dentro de la ventana permitida (hora de Colombia) y no pasada
    if (fecha < hoyColombia() || fecha > hoyColombia(DIAS_ANTICIPACION)) {
      return NextResponse.json({ error: 'fecha_invalida' }, { status: 400 });
    }
    if (momentoCita(fecha, hora) <= Date.now()) {
      return NextResponse.json({ error: 'fecha_invalida' }, { status: 400 });
    }

    // Los nombres salen de la base de datos, no del cliente (evita falsificarlos)
    const [{ data: barbero }, { data: servicio }] = await Promise.all([
      supabase.from('barbers').select('nombre').eq('id', barber_id).eq('activo', true).maybeSingle(),
      supabase.from('services').select('nombre, precio').eq('id', service_id).eq('activo', true).maybeSingle(),
    ]);
    if (!barbero || !servicio) {
      console.warn('Reserva rechazada: barbero o servicio no encontrado/activo', { barber_id, service_id });
      return NextResponse.json({ error: 'datos_invalidos' }, { status: 400 });
    }

    // Franja bloqueada por el barbero
    const { data: bloqueada } = await supabase
      .from('bloqueos')
      .select('id')
      .eq('barber_id', barber_id)
      .eq('fecha', fecha)
      .eq('hora', hora)
      .maybeSingle();
    if (bloqueada) {
      return NextResponse.json({ error: 'slot_ocupado' }, { status: 409 });
    }

    // 1. Guardar la reserva
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        barber_id,
        service_id,
        fecha,
        hora,
        nombre_cliente,
        telefono_cliente,
        email_cliente,
        precio: servicio.precio,
      })
      .select('cancel_token')
      .single();

    if (error) {
      // Slot ya ocupado
      if (error.code === '23505' || error.message?.includes('franja_bloqueada')) {
        return NextResponse.json({ error: 'slot_ocupado' }, { status: 409 });
      }
      console.error('Error al guardar:', error);
      return NextResponse.json({ error: 'error_guardado' }, { status: 500 });
    }

    // 2. Notificaciones en paralelo (best-effort, nunca lanzan error)
    const urlBase = new URL(request.url).origin;
    await Promise.allSettled([
      notificarBarbero(barber_id, {
        asunto: `Nueva reserva - ${fechaBonita(fecha)} ${hora12(hora)}`,
        titulo: `Nueva reserva: ${nombre_cliente}`,
        lineas: [
          `Barbero: ${barbero.nombre}`,
          `Servicio: ${servicio.nombre}`,
          `Fecha: ${fechaBonita(fecha)} a las ${hora12(hora)}`,
          `Tel: ${telefono_cliente}`,
        ],
      }),
      enviarConfirmacion({
        emailCliente: email_cliente,
        nombreCliente: nombre_cliente,
        barbero: barbero.nombre,
        servicio: servicio.nombre,
        fecha: fechaBonita(fecha),
        hora: hora12(hora),
        urlCancelar: `${urlBase}/cancelar/${data.cancel_token}`,
      }),
    ]);

    // 3. Devolver el token al navegador
    return NextResponse.json({ cancel_token: data.cancel_token });
  } catch (err) {
    console.error('Error inesperado:', err);
    return NextResponse.json({ error: 'error_inesperado' }, { status: 500 });
  }
}
