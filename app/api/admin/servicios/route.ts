import { crearClienteServidor } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';
import { usuarioAdmin, REGEX_ID } from '@/lib/seguridad';

// Solo el dueño gestiona servicios. Las escrituras van con la service role porque
// las políticas RLS ya no permiten escribir a usuarios autenticados.
async function soloDuenio(): Promise<NextResponse | null> {
  const supabase = await crearClienteServidor();
  const user = await usuarioAdmin(supabase);
  if (!user) {
    return NextResponse.json({ error: 'no_autorizado' }, { status: 401 });
  }
  return null;
}

type Campos = { nombre: string; descripcion: string | null; precio: number };

// Valida y normaliza nombre, descripción y precio
function leerCampos(cuerpo: Record<string, unknown>): Campos | NextResponse {
  const { nombre, descripcion, precio } = cuerpo;
  if (typeof nombre !== 'string' || nombre.trim() === '' || nombre.length > 80) {
    return NextResponse.json({ error: 'nombre_requerido' }, { status: 400 });
  }
  const precioNum = Number(precio);
  if (!Number.isFinite(precioNum) || precioNum < 0 || precioNum > 10000000) {
    return NextResponse.json({ error: 'precio_invalido' }, { status: 400 });
  }
  return {
    nombre: nombre.trim(),
    descripcion: typeof descripcion === 'string' ? descripcion.trim().slice(0, 300) || null : null,
    precio: precioNum,
  };
}

// Crear servicio
export async function POST(request: Request) {
  const denegado = await soloDuenio();
  if (denegado) return denegado;

  const campos = leerCampos(await request.json().catch(() => ({})));
  if (campos instanceof NextResponse) return campos;

  const { error } = await supabaseAdmin.from('services').insert(campos);
  if (error) {
    return NextResponse.json({ error: 'error_crear' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// Editar servicio (las citas ya hechas conservan el precio con que se reservaron)
export async function PUT(request: Request) {
  const denegado = await soloDuenio();
  if (denegado) return denegado;

  const cuerpo = await request.json().catch(() => ({}));
  if (typeof cuerpo.id !== 'string' || !REGEX_ID.test(cuerpo.id)) {
    return NextResponse.json({ error: 'id_requerido' }, { status: 400 });
  }
  const campos = leerCampos(cuerpo);
  if (campos instanceof NextResponse) return campos;

  const { data, error } = await supabaseAdmin
    .from('services')
    .update(campos)
    .eq('id', cuerpo.id)
    .eq('activo', true)
    .select('id');
  if (error) {
    return NextResponse.json({ error: 'error_editar' }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'no_encontrado' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

// Desactivar servicio
export async function PATCH(request: Request) {
  const denegado = await soloDuenio();
  if (denegado) return denegado;

  const { id } = await request.json().catch(() => ({}));
  if (typeof id !== 'string' || !REGEX_ID.test(id)) {
    return NextResponse.json({ error: 'id_requerido' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('services').update({ activo: false }).eq('id', id);
  if (error) {
    return NextResponse.json({ error: 'error_desactivar' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
