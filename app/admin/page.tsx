import { crearClienteServidor } from '@/lib/supabase-server';
import BotonSalir from './BotonSalir';
import AgendaTabs from './AgendaTabs';
import Link from 'next/link';

export type Cita = {
  id: string;
  fecha: string;
  hora: string;
  barber_id: string;
  nombre_cliente: string;
  telefono_cliente: string;
  email_cliente: string;
  estado: string;
  barbers: { nombre: string } | null;
  services: { nombre: string; precio: number } | null;
};

export type BarberoOpcion = { id: string; nombre: string };

export default async function AdminPage() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: citas } = await supabase
    .from('appointments')
    .select(
      'id, fecha, hora, barber_id, nombre_cliente, telefono_cliente, email_cliente, estado, barbers(nombre), services(nombre, precio)'
    )
    .eq('estado', 'confirmada')
    .order('fecha', { ascending: true })
    .order('hora', { ascending: true });

  const { data: barberos } = await supabase
    .from('barbers')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre');

  const listaCitas = (citas ?? []) as unknown as Cita[];
  const listaBarberos = (barberos ?? []) as BarberoOpcion[];

  return (
    <main className="min-h-screen bg-neutral-950 text-white py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-2">
          <h1 className="font-[family-name:var(--font-oswald)] uppercase tracking-wide text-3xl font-bold text-amber-400">
            Agenda
          </h1>
          <BotonSalir />
        </div>
        <p className="text-neutral-500 text-sm mb-4">{user?.email}</p>

        <div className="flex gap-3 mb-6 flex-wrap">
          <Link
            href="/admin/barberos"
            className="text-sm px-4 py-2 rounded-lg border border-neutral-700 text-neutral-300 hover:border-amber-400 hover:text-amber-400 transition"
          >
            Gestionar barberos
          </Link>
          <Link
            href="/admin/servicios"
            className="text-sm px-4 py-2 rounded-lg border border-neutral-700 text-neutral-300 hover:border-amber-400 hover:text-amber-400 transition"
          >
            Gestionar servicios
          </Link>
          <Link
            href="/admin/estadisticas"
            className="text-sm px-4 py-2 rounded-lg border border-neutral-700 text-neutral-300 hover:border-amber-400 hover:text-amber-400 transition"
          >
            Estadísticas
          </Link>
        </div>

        <AgendaTabs citas={listaCitas} barberos={listaBarberos} />
      </div>
    </main>
  );
}