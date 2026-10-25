'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase-client';

// Botón redondo con la inicial de la cuenta. Abre un menú con "Mi cuenta" y "Cerrar sesión",
// para que no se confundan con las pestañas de navegación.
export default function MenuCuenta({ nombre, email }: { nombre: string; email: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);

  // Se cierra al tocar fuera o con Esc
  useEffect(() => {
    if (!abierto) return;

    function alTocarFuera(e: MouseEvent | TouchEvent) {
      if (!raiz.current?.contains(e.target as Node)) setAbierto(false);
    }
    function alTeclear(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setAbierto(false);
        boton.current?.focus();
      }
    }
    document.addEventListener('mousedown', alTocarFuera);
    document.addEventListener('touchstart', alTocarFuera);
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('mousedown', alTocarFuera);
      document.removeEventListener('touchstart', alTocarFuera);
      document.removeEventListener('keydown', alTeclear);
    };
  }, [abierto]);

  async function cerrarSesion() {
    setSaliendo(true);
    await crearClienteNavegador().auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div ref={raiz} className="relative">
      <button
        ref={boton}
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label="Menú de la cuenta"
        className={`presionable flex h-11 w-11 items-center justify-center rounded-full border bg-neutral-900 font-bold text-amber-400 hover:border-amber-400 ${
          abierto ? 'border-amber-400' : 'border-neutral-700'
        }`}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </button>

      {abierto && (
        <div
          role="menu"
          className="anim-aparecer absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900 shadow-xl shadow-black/50"
        >
          <div className="border-b border-neutral-800 px-4 py-3">
            <div className="truncate font-bold">{nombre}</div>
            <div className="break-all text-xs text-neutral-400">{email}</div>
          </div>

          <Link
            href="/admin/cuenta"
            role="menuitem"
            onClick={() => setAbierto(false)}
            className="flex min-h-12 items-center gap-3 px-4 text-neutral-200 hover:bg-neutral-800"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Mi cuenta
          </Link>

          <button
            role="menuitem"
            onClick={cerrarSesion}
            disabled={saliendo}
            className="flex min-h-12 w-full items-center gap-3 border-t border-neutral-800 px-4 text-left text-red-400 hover:bg-neutral-800 disabled:opacity-60"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
            {saliendo ? 'Saliendo...' : 'Cerrar sesión'}
          </button>
        </div>
      )}
    </div>
  );
}
