import { crearClienteServidor } from '@/lib/supabase-server';
import { barberosPermitidos } from '@/lib/permisos';
import HorariosPanel from './HorariosPanel';
import BotonVolver from '@/app/components/BotonVolver';

export const dynamic = 'force-dynamic';

export default async function HorariosPage() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const barberos = user ? await barberosPermitidos(user) : [];

  return (
    <main className="py-8 px-4">
      <div className="max-w-xl mx-auto">
        <BotonVolver href="/admin">Volver a la agenda</BotonVolver>
        <h1 className="font-[family-name:var(--font-oswald)] uppercase tracking-wide text-3xl font-bold text-amber-400 mt-5 mb-2">
          Horarios
        </h1>
        <p className="text-neutral-400 text-sm mb-6">
          Define los días y las horas en que se puede reservar. Un día sin tramos es día libre.
          «Cada ___ min» es cada cuánto se ofrece una hora de inicio, desde el comienzo del tramo
          (ej. tramo desde 10:20 cada 40 min: 10:20, 11:00, 11:40…). Las citas ya reservadas no se
          cancelan al cambiar el horario.
        </p>
        {barberos.length === 0 ? (
          <p className="text-neutral-300">
            Tu usuario no está ligado a ningún barbero. Pide al dueño que registre tu correo en
            «Gestionar barberos».
          </p>
        ) : (
          <HorariosPanel barberos={barberos} />
        )}
      </div>
    </main>
  );
}
