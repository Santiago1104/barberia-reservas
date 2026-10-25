import { crearClienteServidor } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';
import { usuarioAdmin, correosDuenios, REGEX_ID, REGEX_EMAIL } from '@/lib/seguridad';
import {
  generarClaveTemporal,
  buscarUsuarioPorEmail,
  fijarBloqueoUsuario,
} from '@/lib/cuentas';

// Solo el dueño (ADMIN_EMAILS) gestiona barberos y sus cuentas
async function soloDuenio(): Promise<NextResponse | null> {
  const supabase = await crearClienteServidor();
  const user = await usuarioAdmin(supabase);
  if (!user) {
    return NextResponse.json({ error: 'no_autorizado' }, { status: 401 });
  }
  return null;
}

// Listar barberos activos (incluye correo, que no es público)
export async function GET() {
  const denegado = await soloDuenio();
  if (denegado) return denegado;

  const { data, error } = await supabaseAdmin
    .from('barbers')
    .select('id, nombre, descripcion, foto_url, email')
    .eq('activo', true)
    .order('nombre');
  if (error) {
    return NextResponse.json({ error: 'error_consulta' }, { status: 500 });
  }
  return NextResponse.json({ barberos: data ?? [] });
}

// Crear barbero + su cuenta de acceso. Devuelve la contraseña temporal una sola vez.
export async function POST(request: Request) {
  const denegado = await soloDuenio();
  if (denegado) return denegado;

  const { nombre, descripcion, foto_url, email } = await request.json().catch(() => ({}));
  if (typeof nombre !== 'string' || nombre.trim() === '' || nombre.length > 80) {
    return NextResponse.json({ error: 'nombre_requerido' }, { status: 400 });
  }
  if (typeof email !== 'string' || !REGEX_EMAIL.test(email.trim())) {
    return NextResponse.json({ error: 'email_requerido' }, { status: 400 });
  }
  const correo = email.trim().toLowerCase();
  const datos = {
    nombre: nombre.trim(),
    descripcion:
      typeof descripcion === 'string' ? descripcion.trim().slice(0, 300) || null : null,
    foto_url: typeof foto_url === 'string' && /^https:\/\//.test(foto_url) ? foto_url : null,
  };

  // ¿Ya hay un barbero con ese correo?
  const { data: existente } = await supabaseAdmin
    .from('barbers')
    .select('id, activo')
    .ilike('email', correo.replace(/[\\%_]/g, '\\$&'))
    .maybeSingle();
  if (existente?.activo) {
    return NextResponse.json({ error: 'email_repetido' }, { status: 409 });
  }

  // Cuenta de acceso: se crea, o se reutiliza si el correo ya tiene cuenta (p. ej. el dueño)
  let usuario = await buscarUsuarioPorEmail(correo);
  let clave: string | null = null;
  let usuarioCreado = false;
  if (!usuario) {
    clave = generarClaveTemporal();
    const { data: creado, error: errCrear } = await supabaseAdmin.auth.admin.createUser({
      email: correo,
      password: clave,
      email_confirm: true,
    });
    if (errCrear || !creado.user) {
      console.error('Error al crear usuario:', errCrear);
      return NextResponse.json({ error: 'error_crear_cuenta' }, { status: 500 });
    }
    usuario = creado.user;
    usuarioCreado = true;
  } else if (existente && !correosDuenios().includes(correo)) {
    // Barbero que se reactiva: se restablece el acceso con una clave nueva
    clave = generarClaveTemporal();
    await supabaseAdmin.auth.admin.updateUserById(usuario.id, { password: clave });
    await fijarBloqueoUsuario(usuario.id, false);
  }

  const { error } = existente
    ? await supabaseAdmin
        .from('barbers')
        .update({ ...datos, email: correo, user_id: usuario.id, activo: true })
        .eq('id', existente.id)
    : await supabaseAdmin.from('barbers').insert({ ...datos, email: correo, user_id: usuario.id });

  if (error) {
    console.error('Error al guardar barbero:', error);
    if (usuarioCreado) await supabaseAdmin.auth.admin.deleteUser(usuario.id);
    return NextResponse.json({ error: 'error_crear' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, claveTemporal: clave });
}

// Desactivar barbero y bloquear su acceso
export async function PATCH(request: Request) {
  const denegado = await soloDuenio();
  if (denegado) return denegado;

  const { id } = await request.json().catch(() => ({}));
  if (typeof id !== 'string' || !REGEX_ID.test(id)) {
    return NextResponse.json({ error: 'id_requerido' }, { status: 400 });
  }

  const { data: barbero } = await supabaseAdmin
    .from('barbers')
    .select('email, user_id')
    .eq('id', id)
    .maybeSingle();
  if (!barbero) {
    return NextResponse.json({ error: 'no_encontrado' }, { status: 404 });
  }

  const { error } = await supabaseAdmin.from('barbers').update({ activo: false }).eq('id', id);
  if (error) {
    return NextResponse.json({ error: 'error_desactivar' }, { status: 500 });
  }

  // El acceso se bloquea, salvo el de un dueño (para no dejarlo fuera del panel)
  const correo = barbero.email?.toLowerCase();
  if (correo && !correosDuenios().includes(correo)) {
    const usuario = barbero.user_id ? { id: barbero.user_id } : await buscarUsuarioPorEmail(correo);
    if (usuario) await fijarBloqueoUsuario(usuario.id, true);
  }
  return NextResponse.json({ ok: true });
}
