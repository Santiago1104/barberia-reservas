import type { User } from '@supabase/supabase-js';
import { supabaseAdmin } from './supabase-admin';
import { esAdmin } from './seguridad';

export type BarberoPermitido = { id: string; nombre: string };

// Barberos cuya agenda puede gestionar este usuario:
// - El dueño (ADMIN_EMAILS): todos los barberos activos.
// - Un barbero: solo el suyo, ligado por barbers.email.
// - Cualquier otro: ninguno.
export async function barberosPermitidos(user: User): Promise<BarberoPermitido[]> {
  if (esAdmin(user)) {
    const { data } = await supabaseAdmin
      .from('barbers')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre');
    return data ?? [];
  }

  const correo = user.email?.toLowerCase();
  if (!correo) return [];

  // Se escapan los comodines de LIKE (_ y %) para comparar el correo exacto
  const { data } = await supabaseAdmin
    .from('barbers')
    .select('id, nombre')
    .eq('activo', true)
    .ilike('email', correo.replace(/[\%_]/g, '\$&'));
  return data ?? [];
}
