'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Cita, BarberoOpcion } from './page';
import { hora12, fechaBonita } from '@/lib/formato';

type Vista = 'hoy' | 'proximas' | 'anteriores';

function inicioDe(cita: Cita): Date {
  const [año, mes, dia] = cita.fecha.split('-').map(Number);
  const [h, m] = cita.hora.split(':').map(Number);
  return new Date(año, mes - 1, dia, h, m, 0, 0);
}

function duracionDe(cita: Cita): number {
  return cita.duracion_min ?? 60;
}

function finDe(cita: Cita): Date {
  return new Date(inicioDe(cita).getTime() + duracionDe(cita) * 60 * 1000);
}

// "10:20" + 40 min -> "11:00"
function horaFin(cita: Cita): string {
  const f = finDe(cita);
  return `${String(f.getHours()).padStart(2, '0')}:${String(f.getMinutes()).padStart(2, '0')}`;
}

function esMismoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// "en 35 min", "en 2 h 10 min"
function enCuanto(minutos: number): string {
  if (minutos < 1) return 'ahora';
  if (minutos < 60) return `en ${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m === 0 ? `en ${h} h` : `en ${h} h ${m} min`;
}

// Número para WhatsApp: si no trae indicativo de país se asume Colombia (57)
function numeroWhatsApp(telefono: string): string {
  const digitos = telefono.replace(/\D/g, '');
  return digitos.length === 10 ? `57${digitos}` : digitos;
}

function etiquetaDia(fecha: string, ahora: Date): string {
  const [a, m, d] = fecha.split('-').map(Number);
  const dias = Math.round(
    (new Date(a, m - 1, d).getTime() - new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime()) /
      86400000
  );
  const base = fechaBonita(fecha);
  if (dias === 0) return `Hoy · ${base}`;
  if (dias === 1) return `Mañana · ${base}`;
  if (dias === -1) return `Ayer · ${base}`;
  return base;
}

const estiloAccion =
  'presionable inline-flex items-center gap-2 min-h-10 px-3 rounded-full border border-neutral-700 text-sm text-neutral-200 hover:border-amber-400 hover:text-amber-400';

export default function AgendaTabs({
  citas,
  barberos,
}: {
  citas: Cita[];
  barberos: BarberoOpcion[];
}) {
  const router = useRouter();
  const [actualizando, iniciarActualizacion] = useTransition();
  const [vista, setVista] = useState<Vista>('hoy');
  const [barberoFiltro, setBarberoFiltro] = useState<string>(
    () => barberos.find((b) => b.propio)?.id ?? 'todos'
  );
  // La hora se fija al montar (y se refresca sola) para no desajustar el HTML del servidor
  const [ahora, setAhora] = useState<Date | null>(null);

  useEffect(() => {
    const actualizarHora = () => setAhora(new Date());
    actualizarHora();
    const reloj = setInterval(actualizarHora, 30 * 1000);
    // Trae las reservas nuevas cada minuto mientras la pestaña está a la vista
    const datos = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, 60 * 1000);
    return () => {
      clearInterval(reloj);
      clearInterval(datos);
    };
  }, [router]);

  function actualizar() {
    iniciarActualizacion(() => router.refresh());
  }

  const citasFiltradas =
    barberoFiltro === 'todos' ? citas : citas.filter((c) => c.barber_id === barberoFiltro);

  const hoy: Cita[] = [];
  const proximas: Cita[] = [];
  const anteriores: Cita[] = [];

  if (ahora) {
    for (const cita of citasFiltradas) {
      if (finDe(cita) <= ahora) anteriores.push(cita);
      else if (esMismoDia(inicioDe(cita), ahora)) hoy.push(cita);
      else proximas.push(cita);
    }
    anteriores.reverse();
  }

  const grupos = { hoy, proximas, anteriores };
  const citasMostradas = grupos[vista];

  // La cita que sigue (si ninguna está en curso, la primera de hoy que no ha empezado)
  const siguiente =
    ahora && vista === 'hoy'
      ? hoy.find((c) => inicioDe(c) > ahora && !hoy.some((o) => inicioDe(o) <= ahora && finDe(o) > ahora))
      : undefined;

  const tabs: { clave: Vista; etiqueta: string; cantidad: number }[] = [
    { clave: 'hoy', etiqueta: 'Hoy', cantidad: hoy.length },
    { clave: 'proximas', etiqueta: 'Próximas', cantidad: proximas.length },
    { clave: 'anteriores', etiqueta: 'Anteriores', cantidad: anteriores.length },
  ];

  // Para las pestañas con varios días, se agrupan bajo el título de cada día
  const conTitulos = vista !== 'hoy';
  const empiezaDia = new Set<string>();
  let anterior = '';
  for (const c of citasMostradas) {
    if (c.fecha !== anterior) empiezaDia.add(c.id);
    anterior = c.fecha;
  }

  return (
    <div>
      <div className="flex items-end gap-3 mb-5">
        {barberos.length > 1 && (
          <div className="flex-1">
            <label htmlFor="filtro-barbero" className="text-neutral-400 text-sm block mb-1">
              Barbero:
            </label>
            <select
              id="filtro-barbero"
              value={barberoFiltro}
              onChange={(e) => setBarberoFiltro(e.target.value)}
              className="w-full min-h-11 px-3 rounded-xl bg-neutral-900 border border-neutral-700 text-white focus:border-amber-400 focus:outline-none"
            >
              <option value="todos">Todos los barberos</option>
              {barberos.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nombre}{b.propio ? ' (tú)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          onClick={actualizar}
          disabled={actualizando}
          className={`${estiloAccion} ${barberos.length > 1 ? '' : 'ml-auto'} disabled:opacity-60`}
          aria-label="Actualizar la agenda"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={actualizando ? 'animate-spin' : ''}
          >
            <path d="M21 12a9 9 0 11-3-6.7" />
            <path d="M21 3v6h-6" />
          </svg>
          Actualizar
        </button>
      </div>

      {/* Pestañas */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.clave}
            onClick={() => setVista(t.clave)}
            aria-pressed={vista === t.clave}
            className={`presionable min-h-10 px-4 rounded-full border text-sm ${
              vista === t.clave
                ? 'border-amber-400 bg-amber-400 text-neutral-950 font-bold'
                : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
            }`}
          >
            {t.etiqueta} ({ahora ? t.cantidad : '–'})
          </button>
        ))}
      </div>

      {!ahora ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Cargando agenda">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-neutral-900 animate-pulse" />
          ))}
        </div>
      ) : citasMostradas.length === 0 ? (
        <div className="anim-aparecer rounded-xl border border-dashed border-neutral-700 p-8 text-center">
          <div className="text-3xl mb-2" aria-hidden="true">
            {vista === 'anteriores' ? '🗂️' : '✂️'}
          </div>
          <p className="text-neutral-300">
            {vista === 'hoy'
              ? 'No tienes más citas hoy.'
              : vista === 'proximas'
              ? 'No tienes citas próximas.'
              : 'No hay citas anteriores.'}
          </p>
          {vista !== 'anteriores' && (
            <p className="text-neutral-400 text-sm mt-1">
              Las reservas nuevas aparecen aquí automáticamente.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {citasMostradas.map((cita) => {
            const inicio = inicioDe(cita);
            const enCurso = inicio <= ahora && finDe(cita) > ahora;
            const esSiguiente = siguiente?.id === cita.id;
            const precio = cita.precio ?? cita.services?.precio;
            const titulo = conTitulos && empiezaDia.has(cita.id) ? etiquetaDia(cita.fecha, ahora) : null;
            const whatsapp = numeroWhatsApp(cita.telefono_cliente);

            return (
              <div key={cita.id} className="contents">
                {titulo && (
                  <h3 className="mt-2 text-sm font-bold uppercase tracking-wide text-neutral-300">
                    {titulo}
                  </h3>
                )}
                <article
                  className={`anim-entrar rounded-xl border p-4 ${
                    enCurso
                      ? 'border-amber-400 bg-amber-400/10'
                      : esSiguiente
                      ? 'border-amber-400/60 bg-neutral-900'
                      : 'border-neutral-800 bg-neutral-900'
                  } ${vista === 'anteriores' ? 'opacity-70' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-amber-400 text-lg leading-tight">
                        {hora12(cita.hora)}
                        <span className="text-neutral-400 font-normal text-sm"> a {hora12(horaFin(cita))}</span>
                      </div>
                      {vista !== 'hoy' && !conTitulos && (
                        <div className="text-sm text-neutral-400">{fechaBonita(cita.fecha)}</div>
                      )}
                    </div>
                    {enCurso && (
                      <span className="shrink-0 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-neutral-950">
                        En curso
                      </span>
                    )}
                    {esSiguiente && (
                      <span className="shrink-0 rounded-full border border-amber-400 px-3 py-1 text-xs font-bold text-amber-400">
                        Próxima · {enCuanto(Math.round((inicio.getTime() - ahora.getTime()) / 60000))}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 font-bold text-white">{cita.nombre_cliente}</div>
                  <div className="text-neutral-300 text-sm">
                    {cita.services?.nombre ?? '—'}
                    {precio ? ` · $${precio.toLocaleString('es-CO')}` : ''}
                    {` · ${duracionDe(cita)} min`}
                    {barberos.length > 1 && cita.barbers?.nombre ? ` · ${cita.barbers.nombre}` : ''}
                  </div>

                  {vista !== 'anteriores' && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a href={`tel:${cita.telefono_cliente.replace(/[^\d+]/g, '')}`} className={estiloAccion}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M6.6 10.8a15 15 0 006.6 6.6l2.2-2.2a1 1 0 011-.25 11.4 11.4 0 003.6.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.6a1 1 0 01-.25 1z" />
                        </svg>
                        Llamar
                      </a>
                      <a
                        href={`https://wa.me/${whatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={estiloAccion}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M20.5 3.5A11.8 11.8 0 0012 0C5.4 0 0 5.4 0 12c0 2.1.55 4.2 1.6 6L0 24l6.2-1.6A12 12 0 0012 24c6.6 0 12-5.4 12-12 0-3.2-1.25-6.2-3.5-8.5zM12 22a10 10 0 01-5.1-1.4l-.4-.2-3.7 1 1-3.6-.25-.4A10 10 0 1112 22zm5.5-7.5c-.3-.15-1.8-.9-2.05-1-.3-.1-.5-.15-.7.15s-.8 1-1 1.2c-.2.2-.35.2-.65.05a8.2 8.2 0 01-2.4-1.5 9 9 0 01-1.65-2.05c-.15-.3 0-.45.15-.6l.45-.5c.15-.15.2-.3.3-.5s.05-.35 0-.5c-.05-.15-.7-1.65-.95-2.25-.25-.6-.5-.5-.7-.5h-.6c-.2 0-.55.07-.85.4-.3.3-1.1 1.1-1.1 2.65s1.15 3.1 1.3 3.3c.15.2 2.25 3.4 5.4 4.8 2.65 1.15 3.2.95 3.75.9.6-.05 1.8-.75 2.05-1.45.25-.7.25-1.3.18-1.45-.07-.12-.27-.2-.57-.35z" />
                        </svg>
                        WhatsApp
                      </a>
                      <a href={`mailto:${cita.email_cliente}`} className={estiloAccion}>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <rect x="3" y="5" width="18" height="14" rx="2" />
                          <path d="M3 7l9 6 9-6" />
                        </svg>
                        Correo
                      </a>
                    </div>
                  )}
                  {vista === 'anteriores' && (
                    <div className="mt-1 text-xs text-neutral-400">
                      {cita.telefono_cliente} · {cita.email_cliente}
                    </div>
                  )}
                </article>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
