import { crearClienteServidor } from '@/lib/supabase-server';
import Link from 'next/link';
import EstadisticasPanel from './EstadisticasPanel';

export type CitaStat = {
  fecha: string;
  estado: string;
  barber_id: string;
  services: { precio: number } | null;
};

export type BarberoOpcion = { id: string; nombre: string };

export default async function EstadisticasPage() {
  const supabase = await crearClienteServidor();

  const { data: citas } = await supabase
    .from('appointments')
    .select('fecha, estado, barber_id, services(precio)')
    .order('fecha', { ascending: true });

  const { data: barberos } = await supabase
    .from('barbers')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre');

  const listaCitas = (citas ?? []) as unknown as CitaStat[];
  const listaBarberos = (barberos ?? []) as BarberoOpcion[];

  return (
    <main className="min-h-screen bg-neutral-950 text-white py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/admin" className="text-neutral-400 hover:text-amber-400 transition text-sm">
          ← Volver a la agenda
        </Link>
        <h1 className="font-[family-name:var(--font-oswald)] uppercase tracking-wide text-3xl font-bold text-amber-400 mt-2 mb-6">
          Estadísticas
        </h1>
        <EstadisticasPanel citas={listaCitas} barberos={listaBarberos} />
      </div>
    </main>
  );
}