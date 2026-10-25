import { crearClienteServidor } from '@/lib/supabase-server';
import { barberosPermitidos } from '@/lib/permisos';
import { DIAS_BLOQUEO } from '@/lib/config-reservas';
import { hoyColombia } from '@/lib/tiempo';
import Link from 'next/link';
import DisponibilidadPanel from './DisponibilidadPanel';

export const dynamic = 'force-dynamic';

export default async function DisponibilidadPage() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const barberos = user ? await barberosPermitidos(user) : [];

  return (
    <main className="min-h-screen bg-neutral-950 text-white py-10 px-4">
      <div className="max-w-xl mx-auto">
        <Link href="/admin" className="text-neutral-400 hover:text-amber-400 transition text-sm">
          ← Volver a la agenda
        </Link>
        <h1 className="font-[family-name:var(--font-oswald)] uppercase tracking-wide text-3xl font-bold text-amber-400 mt-2 mb-2">
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
