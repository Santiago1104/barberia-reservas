import { createClient } from '@supabase/supabase-js';
import { crearClienteServidor } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';
import { excedeLimite, claveValida } from '@/lib/seguridad';

// Cambio de contraseña del propio usuario (dueño o barbero).
// Exige la contraseña actual.
export async function POST(request: Request) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: 'no_autorizado' }, { status: 401 });
  }

  // Verifica la contraseña actual, así que se limita para frenar adivinarla
  if (excedeLimite(`clave:${user.id}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'demasiados_intentos' }, { status: 429 });
  }

  const { actual, nueva } = await request.json().catch(() => ({}));
  if (typeof actual !== 'string' || typeof nueva !== 'string' || actual === '') {
    return NextResponse.json({ error: 'datos_invalidos' }, { status: 400 });
  }
  if (!claveValida(nueva)) {
    return NextResponse.json({ error: 'clave_debil' }, { status: 400 });
  }
  if (nueva === actual) {
    return NextResponse.json({ error: 'clave_igual' }, { status: 400 });
  }

  // Comprobar la contraseña actual con un cliente aparte (sin tocar la sesión del navegador)
  const verificador = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { error: errActual } = await verificador.auth.signInWithPassword({
    email: user.email,
    password: actual,
  });
  if (errActual) {
    return NextResponse.json({ error: 'clave_actual_incorrecta' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    password: nueva,
  });
  if (error) {
    console.error('Error al cambiar clave:', error);
    return NextResponse.json({ error: 'error_cambiar' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
