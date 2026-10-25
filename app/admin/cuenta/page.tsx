import { crearClienteServidor } from '@/lib/supabase-server';
import Link from 'next/link';
import CambiarClaveForm from './CambiarClaveForm';

export const dynamic = 'force-dynamic';

export default async function CuentaPage() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-neutral-950 text-white py-10 px-4">
      <div className="max-w-md mx-auto">
        <Link href="/admin" className="text-neutral-400 hover:text-amber-400 transition text-sm">
          ← Volver a la agenda
        </Link>
        <h1 className="font-[family-name:var(--font-oswald)] uppercase tracking-wide text-3xl font-bold text-amber-400 mt-2 mb-2">
          Mi cuenta
        </h1>
        <p className="text-neutral-500 text-sm mb-6">{user?.email}</p>
        <h2 className="text-neutral-200 mb-3">Cambiar contraseña</h2>
        <CambiarClaveForm />
      </div>
    </main>
  );
}
