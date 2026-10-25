import { crearClienteServidor } from '@/lib/supabase-server';
import { barberosPermitidos } from '@/lib/permisos';
import { DIAS_BLOQUEO } from '@/lib/config-reservas';
import { hoyColombia } from '@/lib/tiempo';
import DisponibilidadPanel from './DisponibilidadPanel';
import BotonVolver from '@/app/components/BotonVolver';

export const metadata = { title: 'Disponibilidad' };

export const dynamic = 'force-dynamic';

export default async function DisponibilidadPage() {
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
          Disponibilidad
        </h1>
        <p className="text-neutral-400 text-sm mb-6">
          Bloquea las franjas en las que no puedes atender. Los clientes no podrán reservarlas.
        </p>
        {barberos.length === 0 ? (
          <p className="text-neutral-300">
            Tu usuario no está ligado a ningún barbero. Pide al dueño que registre tu correo en
            «Gestionar barberos».
          </p>
        ) : (
          <DisponibilidadPanel
            barberos={barberos}
            hoy={hoyColombia()}
            maxFecha={hoyColombia(DIAS_BLOQUEO)}
          />
        )}
      </div>
    </main>
  );
}
