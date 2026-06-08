import { crearClienteServidor } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// Crear barbero
// Crear barbero
export async function POST(request: Request) {
  const supabase = await crearClienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'no_autorizado' }, { status: 401 });
  }

  const { nombre, descripcion, foto_url } = await request.json();
  if (!nombre || nombre.trim() === '') {
    return NextResponse.json({ error: 'nombre_requerido' }, { status: 400 });
  }

  const { error } = await supabase.from('barbers').insert({
    nombre: nombre.trim(),
    descripcion: descripcion?.trim() || null,
    foto_url: foto_url || null,
  });

  if (error) {
    return NextResponse.json({ error: 'error_crear' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// Desactivar barbero
export async function PATCH(request: Request) {
  const supabase = await crearClienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'no_autorizado' }, { status: 401 });
  }

  const { id } = await request.json();
  if (!id) {
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