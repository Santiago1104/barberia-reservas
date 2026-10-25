'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type EnlaceAdmin = { href: string; texto: string };

// Pestañas del panel. La sección actual se resalta; en el celular se desplazan de lado.
export default function AdminNav({ enlaces }: { enlaces: EnlaceAdmin[] }) {
  const ruta = usePathname();
  const activa = useRef<HTMLAnchorElement>(null);

  // En el celular la pestaña actual puede quedar fuera de pantalla: se centra al entrar
  useEffect(() => {
    activa.current?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [ruta]);

  function activo(href: string): boolean {
    return href === '/admin' ? ruta === '/admin' : ruta === href || ruta.startsWith(`${href}/`);
  }

  return (
    <nav aria-label="Secciones del panel" className="sin-barra -mx-4 px-4 overflow-x-auto">
      <ul className="flex gap-2 pb-3 w-max">
        {enlaces.map((e) => (
          <li key={e.href}>
            <Link
              ref={activo(e.href) ? activa : undefined}
              href={e.href}
              aria-current={activo(e.href) ? 'page' : undefined}
              className={`presionable inline-flex items-center min-h-10 px-4 rounded-full border text-sm whitespace-nowrap ${
                activo(e.href)
                  ? 'border-amber-400 bg-amber-400 text-neutral-950 font-bold'
                  : 'border-neutral-700 text-neutral-300 hover:border-amber-400 hover:text-amber-400'
              }`}
            >
              {e.texto}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
