import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';
import { enviarConfirmacion } from '@/lib/email';

const supabase = supabaseAdmin;

// Envía el mensaje de WhatsApp al dueño vía CallMeBot
async function notificarWhatsApp(mensaje: string) {
  const phone = process.env.CALLMEBOT_PHONE;
  const apikey = process.env.CALLMEBOT_APIKEY;

  const url =
    `https://api.callmebot.com/whatsapp.php?phone=${phone}` +
    `&text=${encodeURIComponent(mensaje)}&apikey=${apikey}`;

  try {
    const res = await fetch(url);
    const textoRespuesta = await res.text();
    console.log('--- CallMeBot ---');
    console.log('Status:', res.status);
    console.log('Respuesta:', textoRespuesta);
    console.log('Phone usado:', phone);
    console.log('-----------------');
  } catch (err) {
    console.error('No se pudo enviar el WhatsApp:', err);
  }
}

export async function POST(request: Request) {
  try {
    const datos = await request.json();
    const {
      barber_id,
      service_id,
      fecha,
      hora,
      nombre_cliente,
      telefono_cliente,
      email_cliente,
      barbero_nombre,
      servicio_nombre,
    } = datos;

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
      })
      .select('cancel_token')
      .single();

    if (error) {
      // Slot ya ocupado
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'slot_ocupado' },
          { status: 409 }
        );
      }
      console.error('Error al guardar:', error);
      return NextResponse.json({ error: 'error_guardado' }, { status: 500 });
    }

    // 2. Notificar al dueño (best-effort, no bloquea)
    const mensaje =
      `Nueva reserva: ${nombre_cliente}\n` +
      `Barbero: ${barbero_nombre}\n` +
      `Servicio: ${servicio_nombre}\n` +
      `Fecha: ${fecha} a las ${hora}\n` +
      `Tel: ${telefono_cliente}`;

    await notificarWhatsApp(mensaje);
    await notificarWhatsApp(mensaje);

    // 2b. Enviar confirmación por correo al cliente (best-effort)
    const urlBase = new URL(request.url).origin;
    await enviarConfirmacion({
      emailCliente: email_cliente,
      nombreCliente: nombre_cliente,
      barbero: barbero_nombre,
      servicio: servicio_nombre,
      fecha,
      hora,
      urlCancelar: `${urlBase}/cancelar/${data.cancel_token}`,
    });

    // 3. Devolver el token al navegador
    return NextResponse.json({ cancel_token: data.cancel_token });
  } catch (err) {
    console.error('Error inesperado:', err);
    return NextResponse.json({ error: 'error_inesperado' }, { status: 500 });
  }
}