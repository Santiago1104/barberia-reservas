import { crearClienteServidor } from '@/lib/supabase-server';
import CambiarClaveForm from './CambiarClaveForm';
import BotonVolver from '@/app/components/BotonVolver';

export const dynamic = 'force-dynamic';

export default async function CuentaPage() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="py-8 px-4">
      <div className="max-w-md mx-auto">
        <BotonVolver href="/admin">Volver a la agenda</BotonVolver>
        <h1 className="font-[family-name:var(--font-oswald)] uppercase tracking-wide text-3xl font-bold text-amber-400 mt-5 mb-2">
          Mi cuenta
        </h1>
        <p className="text-neutral-500 text-sm mb-6">{user?.email}</p>
        <h2 className="text-neutral-200 mb-3">Cambiar contraseña</h2>
        <CambiarClaveForm />
      </div>
    </main>
  );
}
