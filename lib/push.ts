import webpush from 'web-push';
import { supabaseAdmin } from './supabase-admin';

export type CargaPush = { titulo: string; cuerpo: string; url?: string };

let configurado: boolean | null = null;

// Las claves VAPID identifican a este servidor ante los servicios de notificaciones.
// Sin ellas, las notificaciones push se omiten sin afectar al resto del sistema.
function configurar(): boolean {
  if (configurado !== null) return configurado;
  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  const sujeto = process.env.VAPID_SUBJECT;
  if (!publica || !privada || !sujeto) {
    configurado = false;
    return false;
  }
  try {
    webpush.setVapidDetails(sujeto, publica, privada);
    configurado = true;
  } catch (err) {
    console.error('Claves VAPID inválidas:', err);
    configurado = false;
  }
  return configurado;
}

// Envía la notificación a todos los dispositivos registrados con esos correos.
// Devuelve cuántos recibieron el envío. Nunca lanza error.
export async function enviarPush(correos: string[], carga: CargaPush): Promise<number> {
  if (!configurar() || correos.length === 0) return 0;

  const lista = [...new Set(correos.map((c) => c.trim().toLowerCase()))];
  const { data, error } = await supabaseAdmin
    .from('push_suscripciones')
    .select('id, endpoint, p256dh, auth')
    .in('email', lista);
  if (error) {
    console.error('No se pudieron leer las suscripciones push:', error);
    return 0;
  }
  if (!data || data.length === 0) return 0;

  const mensaje = JSON.stringify({
    titulo: carga.titulo,
    cuerpo: carga.cuerpo,
    url: carga.url ?? '/admin',
  });
  const muertas: string[] = [];
  let enviadas = 0;

  await Promise.allSettled(
    data.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          mensaje,
          { TTL: 60 * 60, urgency: 'high' }
        );
        enviadas += 1;
      } catch (err) {
        const codigo = (err as { statusCode?: number }).statusCode;
        // 404/410: el dispositivo ya no existe (se desinstaló la app o se revocó el permiso)
        if (codigo === 404 || codigo === 410) muertas.push(s.id);
        else console.error('Error al enviar push:', codigo ?? err);
      }
    })
  );

  if (muertas.length > 0) {
    await supabaseAdmin.from('push_suscripciones').delete().in('id', muertas);
  }
  return enviadas;
}
