import { crearClienteServidor } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// Crear servicio
export async function POST(request: Request) {
  const supabase = await crearClienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'no_autorizado' }, { status: 401 });
  }

  const { nombre, descripcion, precio } = await request.json();

  if (!nombre || nombre.trim() === '') {
    return NextResponse.json({ error: 'nombre_requerido' }, { status: 400 });
  }
  const precioNum = Number(precio);
  if (isNaN(precioNum) || precioNum < 0) {
    return NextResponse.json({ error: 'precio_invalido' }, { status: 400 });
  }

  const { error } = await supabase.from('services').insert({
    nombre: nombre.trim(),
    descripcion: descripcion?.trim() || null,
    precio: precioNum,
  });

  if (error) {
    return NextResponse.json({ error: 'error_crear' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// Desactivar servicio
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
    .from('services')
    .update({ activo: false })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'error_desactivar' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}