import { crearClienteServidor } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { barberosPermitidos } from '@/lib/permisos';
import AgendaTabs from './AgendaTabs';

export type Cita = {
  id: string;
  fecha: string;
  hora: string;
  barber_id: string;
  nombre_cliente: string;
  telefono_cliente: string;
  email_cliente: string;
  estado: string;
  precio: number | null;
  duracion_min: number | null;
  barbers: { nombre: string } | null;
  services: { nombre: string; precio: number } | null;
};

export type BarberoOpcion = { id: string; nombre: string };

export default async function AdminPage() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const barberos = user ? await barberosPermitidos(user) : [];
  const ids = barberos.map((b) => b.id);

  // Cada barbero ve solo sus citas; el dueño ve todas
  const { data: citas } = ids.length
    ? await supabaseAdmin
        .from('appointments')
        .select(
          'id, fecha, hora, barber_id, nombre_cliente, telefono_cliente, email_cliente, estado, precio, duracion_min, barbers(nombre), services(nombre, precio)'
        )
        .eq('estado', 'confirmada')
        .in('barber_id', ids)
        .order('fecha', { ascending: true })
        .order('hora', { ascending: true })
    : { data: [] };

  const listaCitas = (citas ?? []) as unknown as Cita[];
  const listaBarberos = barberos as BarberoOpcion[];

  return (
    <main className="py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-[family-name:var(--font-oswald)] uppercase tracking-wide text-3xl font-bold text-amber-400 mb-6">
          Agenda
        </h1>
        <AgendaTabs citas={listaCitas} barberos={listaBarberos} />
      </div>
    </main>
  );
}
