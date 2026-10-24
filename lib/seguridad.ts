import type { SupabaseClient, User } from '@supabase/supabase-js';

// Escapa texto del usuario antes de meterlo en HTML (correos)
export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Identificador seguro (UUID o numérico): solo letras, números, guion y guion bajo
export const REGEX_ID = /^[A-Za-z0-9_-]{1,64}$/;
export const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;
export const REGEX_EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

// IP del cliente (Vercel y proxies la envían en x-forwarded-for)
export function ipDe(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'desconocida'
  );
}

// Limitador de frecuencia en memoria. Es "mejor esfuerzo": en serverless cada
// instancia tiene su propio contador. Para protección fuerte usar Upstash/Redis.
const intentos = new Map<string, { cuenta: number; reinicio: number }>();

export function excedeLimite(clave: string, maximo: number, ventanaMs: number): boolean {
  const ahora = Date.now();
  if (intentos.size > 5000) {
    for (const [k, v] of intentos) if (v.reinicio < ahora) intentos.delete(k);
  }
  const reg = intentos.get(clave);
  if (!reg || reg.reinicio < ahora) {
    intentos.set(clave, { cuenta: 1, reinicio: ahora + ventanaMs });
    return false;
  }
  reg.cuenta += 1;
  return reg.cuenta > maximo;
}

// Si ADMIN_EMAILS está definido (separado por comas), solo esos correos son admin.
// Si no, cualquier usuario autenticado lo es (comportamiento anterior).
export function esAdmin(user: User | null): boolean {
  if (!user) return false;
  const lista = process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!lista || lista.length === 0) return true;
  return !!user.email && lista.includes(user.email.toLowerCase());
}

export async function usuarioAdmin(supabase: SupabaseClient): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return esAdmin(user) ? user : null;
}
