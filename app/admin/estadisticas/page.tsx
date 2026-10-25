import { supabaseAdmin } from '@/lib/supabase-admin';
import { crearClienteServidor } from '@/lib/supabase-server';
import { barberosPermitidos } from '@/lib/permisos';
import EstadisticasPanel from './EstadisticasPanel';
import BotonVolver from '@/app/components/BotonVolver';

export const metadata = { title: 'Estadísticas' };

export type CitaStat = {
  fecha: string;
  estado: string;
  barber_id: string;
  precio: number | null;
  services: { precio: number } | null;
};

export type BarberoOpcion = { id: string; nombre: string; propio?: boolean };

export default async function EstadisticasPage() {
  // El acceso (solo dueño) lo controla el layout de esta sección
  const supabase = supabaseAdmin;

  const { data: citas } = await supabase
    .from('appointments')
    .select('fecha, estado, barber_id, precio, services(precio)')
    .order('fecha', { ascending: true });

  // El dueño ve a todos los barberos, con el suyo primero y seleccionado por defecto
  const sesion = await crearClienteServidor();
  const {
    data: { user },
  } = await sesion.auth.getUser();

  const listaCitas = (citas ?? []) as unknown as CitaStat[];
  const listaBarberos: BarberoOpcion[] = user ? await barberosPermitidos(user) : [];

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