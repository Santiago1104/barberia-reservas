import { supabaseAdmin } from './supabase-admin';
import { enviarAvisoBarbero } from './email';
import { enviarPush, type CargaPush } from './push';
import { correosDuenios } from './seguridad';

// Avisa al dueño por WhatsApp vía CallMeBot (mejor esfuerzo, nunca lanza error)
export async function notificarWhatsApp(mensaje: string) {
  const phone = process.env.CALLMEBOT_PHONE;
  const apikey = process.env.CALLMEBOT_APIKEY;
  if (!phone || !apikey) return;

  const url =
    `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}` +
    `&text=${encodeURIComponent(mensaje)}&apikey=${encodeURIComponent(apikey)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) console.error('CallMeBot error:', res.status);
  } catch (err) {
    console.error('No se pudo enviar WhatsApp:', err);
  }
}

type Aviso = {
  asunto: string;
  titulo: string;
  lineas: string[];
  // Notificación push: el título lleva al final el nombre del barbero al que pertenece la agenda
  push?: CargaPush;
};

// Avisa por la agenda afectada de un barbero:
// - Dueño (su correo está en ADMIN_EMAILS): por WhatsApp (el bot gratuito es solo suyo).
// - Resto de barberos: por correo a barbers.email (obligatorio al crear un barbero).
// - Push: solo a los dispositivos de ese barbero (el dueño recibe únicamente las de su propia
//   agenda de barbero), con el nombre del barbero en el título.
export async function notificarBarbero(barberId: string, aviso: Aviso) {
  const { data: barbero, error } = await supabaseAdmin
    .from('barbers')
    .select('nombre, email')
    .eq('id', barberId)
    .maybeSingle();

  const correo = error ? null : barbero?.email?.trim().toLowerCase() || null;
  const duenios = correosDuenios();

  async function canal() {
    if (!correo) {
      console.warn(`El barbero ${barberId} no tiene correo registrado: aviso no enviado.`);
      return;
    }
    if (duenios.includes(correo)) {
      await notificarWhatsApp([aviso.titulo, ...aviso.lineas].join('\n'));
      return;
    }
    await enviarAvisoBarbero({ emailBarbero: correo, ...aviso });
  }

  async function push() {
    if (!aviso.push) return;
    const nombre = barbero?.nombre;
    if (!correo) return;
    await enviarPush([correo], {
      ...aviso.push,
      titulo: nombre ? `${aviso.push.titulo} · ${nombre}` : aviso.push.titulo,
    });
  }

  await Promise.allSettled([canal(), push()]);
}
