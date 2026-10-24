import { crearClienteServidor } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { usuarioAdmin, REGEX_ID } from '@/lib/seguridad';

// Crear barbero
export async function POST(request: Request) {
  const supabase = await crearClienteServidor();

  const user = await usuarioAdmin(supabase);
  if (!user) {
    return NextResponse.json({ error: 'no_autorizado' }, { status: 401 });
  }

  const { nombre, descripcion, foto_url } = await request.json().catch(() => ({}));
  if (typeof nombre !== 'string' || nombre.trim() === '' || nombre.length > 80) {
    return NextResponse.json({ error: 'nombre_requerido' }, { status: 400 });
  }

  const { error } = await supabase.from('barbers').insert({
    nombre: nombre.trim(),
    descripcion: typeof descripcion === 'string' ? descripcion.trim().slice(0, 300) || null : null,
    foto_url: typeof foto_url === 'string' && /^https:\/\//.test(foto_url) ? foto_url : null,
  });

  if (error) {
    return NextResponse.json({ error: 'error_crear' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// Desactivar barbero
export async function PATCH(request: Request) {
  const supabase = await crearClienteServidor();

  const user = await usuarioAdmin(supabase);
  if (!user) {
    return NextResponse.json({ error: 'no_autorizado' }, { status: 401 });
  }

  const { id } = await request.json().catch(() => ({}));
  if (typeof id !== 'string' || !REGEX_ID.test(id)) {
    return NextResponse.json({ error: 'id_requerido' }, { status: 400 });
  }

  const { error } = await supabase
    .from('barbers')
    .update({ activo: false })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'error_desactivar' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}