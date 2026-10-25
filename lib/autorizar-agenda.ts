import { crearClienteServidor } from './supabase-server';
import { NextResponse } from 'next/server';
import { REGEX_ID } from './seguridad';
import { barberosPermitidos } from './permisos';

export type ContextoAgenda = { barberoNombre: string; userEmail: string };

// Verifica la sesión y que el usuario pueda gestionar la agenda de ese barbero:
// el dueño la de cualquiera, cada barbero solo la suya.
export async function autorizarAgenda(barberId: unknown): Promise<ContextoAgenda | NextResponse> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'no_autorizado' }, { status: 401 });
  }
  if (typeof barberId !== 'string' || !REGEX_ID.test(barberId)) {
    return NextResponse.json({ error: 'datos_invalidos' }, { status: 400 });
  }
  const permitidos = await barberosPermitidos(user);
  const barbero = permitidos.find((b) => b.id === barberId);
  if (!barbero) {
    return NextResponse.json({ error: 'prohibido' }, { status: 403 });
  }
  return { barberoNombre: barbero.nombre, userEmail: user.email ?? '' };
}
