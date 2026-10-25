import { crearClienteServidor } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';
import { usuarioAdmin, correosDuenios, claveValida, REGEX_ID } from '@/lib/seguridad';
import { buscarUsuarioPorEmail, fijarBloqueoUsuario } from '@/lib/cuentas';

// El dueño fija una contraseña nueva para un barbero que perdió la suya
// (o crea su acceso si el barbero existía sin cuenta).
export async function POST(request: Request) {
  const supabase = await crearClienteServidor();
  const duenio = await usuarioAdmin(supabase);
  if (!duenio) {
    return NextResponse.json({ error: 'no_autorizado' }, { status: 401 });
  }

  const { id, clave } = await request.json().catch(() => ({}));
  if (typeof id !== 'string' || !REGEX_ID.test(id)) {
    return NextResponse.json({ error: 'id_requerido' }, { status: 400 });
  }
  if (typeof clave !== 'string' || !claveValida(clave)) {
    return NextResponse.json({ error: 'clave_debil' }, { status: 400 });
  }

  const { data: barbero } = await supabaseAdmin
    .from('barbers')
    .select('email, user_id')
    .eq('id', id)
    .eq('activo', true)
    .maybeSingle();
  const correo = barbero?.email?.trim().toLowerCase();
  if (!barbero || !correo) {
    return NextResponse.json({ error: 'sin_correo' }, { status: 400 });
  }
  // La contraseña del dueño la cambia él mismo desde "Mi cuenta"
  if (correosDuenios().includes(correo)) {
    return NextResponse.json({ error: 'es_duenio' }, { status: 400 });
  }

  const usuario = barbero.user_id ? { id: barbero.user_id } : await buscarUsuarioPorEmail(correo);

  if (usuario) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(usuario.id, { password: clave });
    if (error) {
      console.error('Error al restablecer clave:', error);
      return NextResponse.json({ error: 'error_clave' }, { status: 500 });
    }
    await fijarBloqueoUsuario(usuario.id, false);
    if (!barbero.user_id) {
      await supabaseAdmin.from('barbers').update({ user_id: usuario.id }).eq('id', id);
    }
  } else {
    const { data: creado, error } = await supabaseAdmin.auth.admin.createUser({
      email: correo,
      password: clave,
      email_confirm: true,
    });
    if (error || !creado.user) {
      console.error('Error al crear acceso:', error);
      return NextResponse.json({ error: 'error_clave' }, { status: 500 });
    }
    await supabaseAdmin.from('barbers').update({ user_id: creado.user.id }).eq('id', id);
  }

  return NextResponse.json({ ok: true });
}
