'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// Botón "Agendar cita" fijo abajo en el celular: aparece cuando el botón principal
// de la portada ya quedó arriba (fuera de pantalla)
export default function AgendarFijo() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const objetivo = document.getElementById('cta-agendar');
    if (!objetivo) return;
    const observador = new IntersectionObserver(([entrada]) => {
      setVisible(!entrada.isIntersecting && entrada.boundingClientRect.top < 0);
    });
    observador.observe(objetivo);
    return () => observador.disconnect();
  }, []);

  return (
    <div
      aria-hidden={!visible}
      className={`md:hidden fixed bottom-0 inset-x-0 z-30 bg-gradient-to-t from-neutral-950 via-neutral-950/90 to-transparent px-4 pb-4 pt-8 transition-transform duration-300 ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <Link
        href="/reservas"
        tabIndex={visible ? 0 : -1}
        className="presionable flex w-full items-center justify-center rounded-xl bg-amber-400 py-4 text-lg font-bold uppercase tracking-wide text-neutral-950 shadow-lg shadow-black/50 hover:bg-amber-300"
      >
        Agendar cita
      </Link>
    </div>
  );
}
