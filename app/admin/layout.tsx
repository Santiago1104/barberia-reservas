import type { Metadata, Viewport } from 'next';
import { crearClienteServidor } from '@/lib/supabase-server';
import { esAdmin } from '@/lib/seguridad';
import { barberosPermitidos } from '@/lib/permisos';
import AdminNav, { type EnlaceAdmin } from './AdminNav';
import MenuCuenta from './MenuCuenta';
import FeedbackProvider from '@/app/components/Feedback';

// El panel se puede instalar en el celular como app (PWA). El manifiesto solo se ofrece aquí,
// no en la página pública de los clientes.
export const metadata: Metadata = {
  manifest: '/panel.webmanifest',
  appleWebApp: { capable: true, title: 'Africa Latina', statusBarStyle: 'black' },
  icons: { apple: '/icons/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
};

// Marco común del panel: cabecera fija con navegación y menú de la cuenta
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ?? '';
  // Se muestra el nombre del barbero (si la cuenta está ligada a uno) en lugar del correo cortado
  const barberos = user ? await barberosPermitidos(user) : [];
  const nombre = barberos.find((b) => b.propio)?.nombre ?? email.split('@')[0] ?? 'Mi cuenta';

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
    <FeedbackProvider>
    <div className="min-h-screen bg-neutral-950 text-white">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-amber-400 focus:text-neutral-950"
      >
        Saltar al contenido
      </a>
      <header className="sticky top-0 z-30 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="min-w-0">
              <div className="font-[family-name:var(--font-oswald)] uppercase tracking-wide text-lg font-bold text-amber-400 leading-tight">
                Panel
              </div>
              <div className="text-xs text-neutral-400 truncate">{nombre}</div>
            </div>
            <MenuCuenta nombre={nombre} email={email} />
          </div>
          <AdminNav enlaces={enlaces} />
        </div>
      </header>
      <div id="contenido">{children}</div>
    </div>
    </FeedbackProvider>
  );
}
