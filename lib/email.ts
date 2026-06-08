import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);

// Para pruebas usamos el dominio de Resend. En producción se cambia al dominio real.
const REMITENTE = 'Barbería <onboarding@resend.dev>';

type DatosReserva = {
  emailCliente: string;
  nombreCliente: string;
  barbero: string;
  servicio: string;
  fecha: string;
  hora: string;
  urlCancelar: string;
};

// Correo de confirmación de reserva
export async function enviarConfirmacion(datos: DatosReserva) {
  try {
    await resend.emails.send({
      from: REMITENTE,
      to: datos.emailCliente,
      subject: 'Confirmación de tu cita',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; color: #1F3864;">
          <h2>¡Tu cita está confirmada!</h2>
          <p>Hola ${datos.nombreCliente}, estos son los detalles de tu reserva:</p>
          <div style="background: #f4f6fa; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p><strong>Barbero:</strong> ${datos.barbero}</p>
            <p><strong>Servicio:</strong> ${datos.servicio}</p>
            <p><strong>Fecha:</strong> ${datos.fecha}</p>
            <p><strong>Hora:</strong> ${datos.hora}</p>
          </div>
          <p>Si necesitas cancelar tu cita, haz clic aquí:</p>
          <p>
            <a href="${datos.urlCancelar}"
               style="display: inline-block; background: #c0392b; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none;">
              Cancelar mi cita
            </a>
          </p>
          <p style="font-size: 13px; color: #888; margin-top: 24px;">
            Guarda este correo por si necesitas cancelar más adelante.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('No se pudo enviar el correo de confirmación:', err);
  }
}

// Correo de aviso de cancelación
export async function enviarCancelacion(datos: {
  emailCliente: string;
  nombreCliente: string;
  fecha: string;
  hora: string;
}) {
  try {
    await resend.emails.send({
      from: REMITENTE,
      to: datos.emailCliente,
      subject: 'Tu cita fue cancelada',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; color: #1F3864;">
          <h2>Cita cancelada</h2>
          <p>Hola ${datos.nombreCliente}, confirmamos que tu cita del ${datos.fecha} a las ${datos.hora} fue cancelada.</p>
          <p>Esperamos verte pronto. Puedes agendar una nueva cita cuando quieras.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('No se pudo enviar el correo de cancelación:', err);
  }
}