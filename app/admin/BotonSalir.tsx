'use client';

import { useRouter } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase-client';

export default function BotonSalir() {
  const router = useRouter();

  async function cerrarSesion() {
    const supabase = crearClienteNavegador();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      onClick={cerrarSesion}
      className="text-sm min-h-10 px-4 rounded-full inline-flex items-center justify-center presionable border border-neutral-700 text-neutral-300 hover:border-red-500 hover:text-red-400 transition"
    >
      Cerrar sesión
    </button>
  );
}