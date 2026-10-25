import type { User } from '@supabase/supabase-js';
import { supabaseAdmin } from './supabase-admin';
import { esAdmin } from './seguridad';

// `propio` marca al barbero ligado al correo del usuario (para mostrarlo primero y por defecto)
export type BarberoPermitido = { id: string; nombre: string; propio: boolean };

// Barberos cuya agenda puede gestionar este usuario:
// - El dueño (ADMIN_EMAILS): todos los barberos activos, con el suyo primero.
// - Un barbero: solo el suyo, ligado por barbers.email.
// - Cualquier otro: ninguno.
export async function barberosPermitidos(user: User): Promise<BarberoPermitido[]> {
  const correo = user.email?.toLowerCase() ?? '';

  if (esAdmin(user)) {
    const { data } = await supabaseAdmin
      .from('barbers')
      .select('id, nombre, email')
      .eq('activo', true)
      .order('nombre');
    return (data ?? [])
      .map((b) => ({
        id: b.id as string,
        nombre: b.nombre as string,
        propio: !!correo && (b.email as string | null)?.toLowerCase() === correo,
      }))
      .sort((a, b) => Number(b.propio) - Number(a.propio));
  }

  if (!correo) return [];

  // Se escapan los comodines de LIKE (_ y %) para comparar el correo exacto
  const { data } = await supabaseAdmin
    .from('barbers')
    .select('id, nombre')
    .eq('activo', true)
    .ilike('email', correo.replace(/[\\%_]/g, '\\$&'));
  return (data ?? []).map((b) => ({ id: b.id as string, nombre: b.nombre as string, propio: true }));
}
