import { supabaseAdmin } from '@/lib/supabase-admin';
import EstadisticasPanel from './EstadisticasPanel';
import BotonVolver from '@/app/components/BotonVolver';

export type CitaStat = {
  fecha: string;
  estado: string;
  barber_id: string;
  precio: number | null;
  services: { precio: number } | null;
};

export type BarberoOpcion = { id: string; nombre: string };

export default async function EstadisticasPage() {
  // El acceso (solo dueño) lo controla el layout de esta sección
  const supabase = supabaseAdmin;

  const { data: citas } = await supabase
    .from('appointments')
    .select('fecha, estado, barber_id, precio, services(precio)')
    .order('fecha', { ascending: true });

  const { data: barberos } = await supabase
    .from('barbers')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre');

  const listaCitas = (citas ?? []) as unknown as CitaStat[];
  const listaBarberos = (barberos ?? []) as BarberoOpcion[];

  return (
    <main className="py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <BotonVolver href="/admin">Volver a la agenda</BotonVolver>
        <h1 className="font-[family-name:var(--font-oswald)] uppercase tracking-wide text-3xl font-bold text-amber-400 mt-5 mb-6">
          Estadísticas
        </h1>
        <EstadisticasPanel citas={listaCitas} barberos={listaBarberos} />
      </div>
    </main>
  );
}