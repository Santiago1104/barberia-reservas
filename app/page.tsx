import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import Revelar from './components/Revelar';
import AgendarFijo from './components/AgendarFijo';

// Los barberos y servicios se leen de la base y la página se renueva cada minuto
export const revalidate = 60;

type Barbero = { id: string; nombre: string; descripcion: string | null; foto_url: string | null };
type Servicio = {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  duracion_min: number;
};

async function cargarCatalogo(): Promise<{ barberos: Barbero[]; servicios: Servicio[] }> {
  try {
    const [barberos, servicios] = await Promise.all([
      supabase
        .from('barbers')
        .select('id, nombre, descripcion, foto_url')
        .eq('activo', true)
        .order('nombre'),
      supabase
        .from('services')
        .select('id, nombre, descripcion, precio, duracion_min')
        .eq('activo', true)
        .order('nombre'),
    ]);
    return {
      barberos: (barberos.data ?? []) as Barbero[],
      servicios: (servicios.data ?? []) as Servicio[],
    };
  } catch {
    return { barberos: [], servicios: [] };
  }
}

const redes = [
  {
    nombre: 'WhatsApp',
    url: 'https://wa.me/573148532393',
    icono: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
        <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
      </svg>
    ),
  },
  {
    nombre: 'Instagram',
    url: 'https://www.instagram.com/chapubarber_21/',
    icono: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
  },
  {
    nombre: 'Facebook',
    url: 'https://www.facebook.com/profile.php?id=100068227933784',
    icono: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
];

const estiloTitulo =
  'font-[family-name:var(--font-oswald)] uppercase tracking-wide text-2xl font-bold text-amber-400 mb-6 text-center';

export default async function Home() {
  const { barberos, servicios } = await cargarCatalogo();

  return (
    <main className="relative overflow-x-hidden bg-neutral-950 text-white pb-24 md:pb-0">
      <header className="absolute top-0 inset-x-0 z-10 flex justify-end p-4">
        <Link
          href="/login"
          aria-label="Acceso barberos"
          title="Acceso barberos"
          className="presionable inline-flex h-11 w-11 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900/60 text-neutral-200 backdrop-blur hover:border-amber-400 hover:text-amber-400"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </Link>
      </header>

      {/* Portada */}
      <section className="flex flex-col items-center px-6 pt-24 pb-16 text-center bg-[radial-gradient(ellipse_at_top,rgba(212,164,55,0.18),transparent_65%)]">
        <Image
          src="/logo.png"
          alt="Africa Latina Barbershop"
          width={220}
          height={220}
          priority
          className="anim-entrar rounded-2xl shadow-2xl shadow-black/60"
        />
        <h1
          style={{ animationDelay: '0.1s' }}
          className="anim-entrar mt-8 font-[family-name:var(--font-oswald)] text-4xl sm:text-5xl font-bold uppercase tracking-wide text-amber-400"
        >
          Africa Latina Barbershop
        </h1>
        <p style={{ animationDelay: '0.2s' }} className="anim-entrar mt-3 text-lg text-neutral-300">
          Cortes americanos y todos los estilos
        </p>
        <div style={{ animationDelay: '0.3s' }} className="anim-entrar mt-8">
          <Link
            id="cta-agendar"
            href="/reservas"
            className="presionable inline-flex items-center rounded-xl bg-amber-400 px-10 py-4 text-lg font-bold uppercase tracking-wide text-neutral-950 shadow-lg shadow-amber-400/20 hover:bg-amber-300"
          >
            Agendar cita
          </Link>
        </div>
      </section>

      <div className="mx-auto flex max-w-2xl flex-col gap-16 px-6 pb-16">
        {/* Servicios */}
        {servicios.length > 0 && (
          <Revelar>
            <section aria-labelledby="titulo-servicios">
              <h2 id="titulo-servicios" className={estiloTitulo}>
                Servicios
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {servicios.map((sv) => (
                  <li
                    key={sv.id}
                    className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 transition-colors hover:border-amber-400/60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-bold">{sv.nombre}</h3>
                      <span className="shrink-0 font-bold text-amber-400">
                        ${sv.precio.toLocaleString('es-CO')}
                      </span>
                    </div>
                    {sv.descripcion && <p className="mt-1 text-sm text-neutral-300">{sv.descripcion}</p>}
                    <p className="mt-2 text-xs text-neutral-400">{sv.duracion_min} min</p>
                  </li>
                ))}
              </ul>
            </section>
          </Revelar>
        )}

        {/* Barberos */}
        {barberos.length > 0 && (
          <Revelar>
            <section aria-labelledby="titulo-barberos">
              <h2 id="titulo-barberos" className={estiloTitulo}>
                Nuestros barberos
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {barberos.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center gap-4 rounded-xl border border-neutral-800 bg-neutral-900 p-4"
                  >
                    {b.foto_url ? (
                      <Image
                        src={b.foto_url}
                        alt=""
                        width={64}
                        height={64}
                        unoptimized
                        className="h-16 w-16 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        aria-hidden="true"
                        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-2xl font-bold text-amber-400"
                      >
                        {b.nombre.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-bold">{b.nombre}</h3>
                      {b.descripcion && <p className="text-sm text-neutral-300">{b.descripcion}</p>}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-6 text-center">
                <Link
                  href="/reservas"
                  className="presionable inline-flex min-h-11 items-center rounded-xl border border-amber-400 px-6 font-bold text-amber-400 hover:bg-amber-400 hover:text-neutral-950"
                >
                  Reservar con ellos
                </Link>
              </div>
            </section>
          </Revelar>
        )}

        {/* Ubicación */}
        <Revelar>
          <section aria-labelledby="titulo-donde">
            <h2 id="titulo-donde" className={estiloTitulo}>
              ¿Dónde estamos?
            </h2>
            <div className="overflow-hidden rounded-2xl border border-neutral-800">
              <iframe
                title="Mapa de Africa Latina Barbershop"
                src="https://www.google.com/maps?q=2.4381109,-76.6081384&z=17&output=embed"
                width="100%"
                height="300"
                style={{ border: 0 }}
                loading="lazy"
              />
            </div>
            <div className="mt-4 text-center">
              <Link
                href="https://maps.app.goo.gl/1nPDN3dYNyLsjaHC6"
                target="_blank"
                rel="noopener noreferrer"
                className="presionable inline-flex min-h-11 items-center gap-2 rounded-xl border border-neutral-700 px-6 text-neutral-200 hover:border-amber-400 hover:text-amber-400"
              >
                Cómo llegar
              </Link>
            </div>
          </section>
        </Revelar>

        {/* Redes */}
        <Revelar>
          <section aria-labelledby="titulo-redes" className="text-center">
            <h2 id="titulo-redes" className={estiloTitulo}>
              Síguenos
            </h2>
            <div className="flex justify-center gap-5">
              {redes.map((red) => (
                <Link
                  key={red.url}
                  href={red.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={red.nombre}
                  className="presionable flex h-14 w-14 items-center justify-center rounded-full bg-amber-400 text-neutral-950 hover:scale-110 hover:bg-amber-300"
                >
                  {red.icono}
                </Link>
              ))}
            </div>
          </section>
        </Revelar>
      </div>

      <footer className="border-t border-neutral-800 px-6 py-6 text-center text-sm text-neutral-400">
        © {new Date().getFullYear()} Africa Latina Barbershop
      </footer>

      <AgendarFijo />
    </main>
  );
}
