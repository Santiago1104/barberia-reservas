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
