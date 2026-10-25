import { supabaseAdmin } from './supabase-admin';
import { enviarAvisoBarbero } from './email';

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

// Avisa al barbero dueño de la agenda afectada:
// - Dueño (su correo está en ADMIN_EMAILS): por WhatsApp (el bot gratuito es solo suyo).
// - Resto de barberos: por correo a barbers.email (obligatorio al crear un barbero).
export async function notificarBarbero(
  barberId: string,
  aviso: { asunto: string; titulo: string; lineas: string[] }
) {
  const { data: barbero, error } = await supabaseAdmin
    .from('barbers')
    .select('email')
    .eq('id', barberId)
    .maybeSingle();

  const correo = error ? null : barbero?.email?.trim().toLowerCase() || null;
  const duenios = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);

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
