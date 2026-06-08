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
      style={{
        padding: '10px 18px',
        borderRadius: 8,
        border: '1px solid #1F3864',
        background: '#fff',
        color: '#1F3864',
        cursor: 'pointer',
      }}
    >
      Cerrar sesión
    </button>
  );
}