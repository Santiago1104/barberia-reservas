import Link from 'next/link';
import { crearClienteServidor } from '@/lib/supabase-server';
import { esAdmin } from '@/lib/seguridad';
import AdminNav, { type EnlaceAdmin } from './AdminNav';
import BotonSalir from './BotonSalir';

// Marco común del panel: cabecera fija con navegación, usuario y salida
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const enlaces: EnlaceAdmin[] = [
    { href: '/admin', texto: 'Agenda' },
    { href: '/admin/disponibilidad', texto: 'Disponibilidad' },
    { href: '/admin/horarios', texto: 'Horarios' },
    ...(esAdmin(user)
      ? [
          { href: '/admin/barberos', texto: 'Barberos' },
          { href: '/admin/servicios', texto: 'Servicios' },
          { href: '/admin/estadisticas', texto: 'Estadísticas' },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="sticky top-0 z-30 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="min-w-0">
              <div className="font-[family-name:var(--font-oswald)] uppercase tracking-wide text-lg font-bold text-amber-400 leading-tight">
                Panel
              </div>
              <div className="text-xs text-neutral-400 truncate">{user?.email}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/admin/cuenta"
                className="presionable inline-flex items-center min-h-10 px-4 rounded-full border border-neutral-700 text-sm text-neutral-300 hover:border-amber-400 hover:text-amber-400"
              >
                Mi cuenta
              </Link>
              <BotonSalir />
            </div>
          </div>
          <AdminNav enlaces={enlaces} />
        </div>
      </header>
      {children}
    </div>
  );
}
