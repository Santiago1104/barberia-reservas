import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);
const REMITENTE = 'Africa Latina Barbershop <onboarding@resend.dev>';

type DatosReserva = {
  emailCliente: string;
  nombreCliente: string;
  barbero: string;
  servicio: string;
  fecha: string;
  hora: string;
  urlCancelar: string;
};

// Envoltura común con el estilo de la marca
function plantilla(contenido: string): string {
  return `<div style="background:#1a1a1a;padding:24px;font-family:Arial,sans-serif"><div style="max-width:480px;margin:0 auto;background:#262626;border-radius:12px;padding:32px;color:#ffffff"><h1 style="color:#d4a437;font-size:22px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px">Africa Latina Barbershop</h1><p style="color:#999;font-size:13px;margin:0 0 24px">Cortes americanos y todos los estilos</p>${contenido}</div></div>`;
}

export async function enviarConfirmacion(datos: DatosReserva) {
  try {
    const contenido = `<h2 style="color:#ffffff;font-size:18px;margin:0 0 16px">¡Tu cita está confirmada!</h2><p style="color:#ddd;margin:0 0 16px">Hola ${datos.nombreCliente}, estos son los detalles:</p><div style="background:#1a1a1a;border-radius:8px;padding:16px;margin:0 0 24px;color:#ddd"><p style="margin:0 0 8px"><strong style="color:#d4a437">Barbero:</strong> ${datos.barbero}</p><p style="margin:0 0 8px"><strong style="color:#d4a437">Servicio:</strong> ${datos.servicio}</p><p style="margin:0 0 8px"><strong style="color:#d4a437">Fecha:</strong> ${datos.fecha}</p><p style="margin:0"><strong style="color:#d4a437">Hora:</strong> ${datos.hora}</p></div><a href="${datos.urlCancelar}" style="display:block;background:#c0392b;color:#ffffff;padding:14px;border-radius:8px;text-align:center;text-decoration:none;font-weight:bold">Cancelar mi cita</a>`;
    await resend.emails.send({
      from: REMITENTE,
      to: datos.emailCliente,
      subject: 'Confirmación de tu cita - Africa Latina Barbershop',
      html: plantilla(contenido),
    });
  } catch (err) {
    console.error('No se pudo enviar el correo de confirmación:', err);
  }
}

export async function enviarCancelacion(datos: {
  emailCliente: string;
  nombreCliente: string;
  fecha: string;
  hora: string;
}) {
  try {
    const contenido = `<h2 style="color:#ffffff;font-size:18px;margin:0 0 16px">Cita cancelada</h2><p style="color:#ddd;margin:0 0 16px">Hola ${datos.nombreCliente}, confirmamos que tu cita del ${datos.fecha} a las ${datos.hora} fue cancelada.</p><p style="color:#ddd;margin:0">Esperamos verte pronto. Puedes agendar una nueva cita cuando quieras.</p>`;
    await resend.emails.send({
      from: REMITENTE,
      to: datos.emailCliente,
      subject: 'Tu cita fue cancelada - Africa Latina Barbershop',
      html: plantilla(contenido),
    });
  } catch (err) {
    console.error('No se pudo enviar el correo de cancelación:', err);
  }
}