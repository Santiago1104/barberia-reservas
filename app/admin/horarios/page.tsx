import { crearClienteServidor } from '@/lib/supabase-server';
import { barberosPermitidos } from '@/lib/permisos';
import HorariosPanel from './HorariosPanel';
import BotonVolver from '@/app/components/BotonVolver';

export const metadata = { title: 'Horarios' };

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
        <p className="text-neutral-400 text-sm mb-3">
          Define los días y las horas en que se puede reservar. Las citas ya reservadas no se
          cancelan al cambiar el horario.
        </p>
        <details className="mb-6 rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3 text-sm text-neutral-300">
          <summary className="cursor-pointer select-none text-amber-400">
            ¿Qué es «Una hora de inicio cada ___ min»?
          </summary>
          <p className="mt-2 text-neutral-400">
            Es cada cuánto se ofrece una hora al cliente, contando desde el inicio del tramo. Por
            ejemplo, un tramo desde las 10:20 con 40 minutos ofrece 10:20, 11:00, 11:40…
          </p>
        </details>
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
