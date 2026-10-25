import type { User } from '@supabase/supabase-js';
import { supabaseAdmin } from './supabase-admin';

export type BarberoPermitido = { id: string; nombre: string };

// Barberos cuya agenda puede gestionar este usuario:
// - Si su correo está ligado a un barbero (barbers.email), solo ese barbero.
// - Si no está ligado y es admin (ver esAdmin), todos los barberos activos.
// - Si no, ninguno.
// Un correo listado explícitamente en ADMIN_EMAILS (dueño) siempre gestiona a todos.
export async function barberosPermitidos(user: User, esAdminUsuario: boolean): Promise<BarberoPermitido[]> {
  const correo = user.email?.toLowerCase();
  const duenio =
    !!correo &&
    !!process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim().toLowerCase()).includes(correo);

  const { data: propio } = correo
    ? await supabaseAdmin
        .from('barbers')
        .select('id, nombre')
        .eq('activo', true)
        .ilike('email', correo)
    : { data: null };

  if (propio && propio.length > 0 && !duenio) return propio;
  if (!duenio && !esAdminUsuario) return [];

  const { data: todos } = await supabaseAdmin
    .from('barbers')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre');
  return todos ?? [];
}
