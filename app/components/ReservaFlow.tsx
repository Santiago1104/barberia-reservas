'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import BotonVolver from './BotonVolver';
import { hora12, fechaBonita } from '@/lib/formato';
import { DIAS_ANTICIPACION } from '@/lib/config-reservas';

type Barber = {
  id: string;
  nombre: string;
  descripcion: string | null;
  foto_url: string | null;
  activo: boolean;
};

type Service = {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  duracion_min: number;
};

function generarDias(): Date[] {
  const dias: Date[] = [];
  for (let i = 0; i <= DIAS_ANTICIPACION; i++) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    dias.push(d);
  }
  return dias;
}

function aTextoFecha(d: Date): string {
  const año = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`;
}

// "2026-06-09" -> "mar 9 jun"
function fechaCorta(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

const estiloInput =
  'p-3 rounded-xl bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none transition-colors';

const estiloTitulo =
  'font-[family-name:var(--font-oswald)] uppercase tracking-wide text-lg text-white mb-3';

function Palomita({ className = '' }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

// Tarjeta elegible (barbero, servicio): reacciona al toque y marca la elegida
function Tarjeta({
  activa,
  onClick,
  children,
}: {
  activa: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={activa}
      className={`presionable relative w-full p-4 pr-12 rounded-xl border text-left ${
        activa
          ? 'border-amber-400 bg-amber-400/10'
          : 'border-neutral-700 bg-neutral-900 hover:border-neutral-500'
      }`}
    >
      {children}
      {activa && (
        <span className="anim-pop absolute top-1/2 right-4 -translate-y-1/2 w-6 h-6 rounded-full bg-amber-400 text-neutral-950 flex items-center justify-center">
          <Palomita />
        </span>
      )}
    </button>
  );
}

export default function ReservaFlow({
  barbers,
  services,
}: {
  barbers: Barber[];
  services: Service[];
}) {
  const [barberoElegido, setBarberoElegido] = useState<Barber | null>(null);
  const [servicioElegido, setServicioElegido] = useState<Service | null>(null);
  const [diaElegido, setDiaElegido] = useState<string | null>(null);
  const [horaElegida, setHoraElegida] = useState<string | null>(null);
  const [horasDisponibles, setHorasDisponibles] = useState<string[]>([]);
  const [cargandoHoras, setCargandoHoras] = useState(false);

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');

  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const [reservaHecha, setReservaHecha] = useState<{ cancelToken: string } | null>(null);

  const refBarbero = useRef<HTMLElement>(null);
  const refServicio = useRef<HTMLElement>(null);
  const refDia = useRef<HTMLElement>(null);
  const refHora = useRef<HTMLElement>(null);
  const refDatos = useRef<HTMLElement>(null);
  const dias = generarDias();

  // Las horas disponibles dependen del barbero, del servicio (duración) y del día
  useEffect(() => {
    async function cargarHoras() {
      if (!barberoElegido || !servicioElegido || !diaElegido) return;
      setCargandoHoras(true);
      setHoraElegida(null);

      try {
        const res = await fetch(
          `/api/disponibilidad?barber_id=${barberoElegido.id}&service_id=${servicioElegido.id}&fecha=${diaElegido}`
        );
        const data = await res.json();
        setHorasDisponibles(data.horas ?? []);
      } catch {
        setHorasDisponibles([]);
      }
      setCargandoHoras(false);
    }
    cargarHoras();
  }, [barberoElegido, servicioElegido, diaElegido]);

  // Scroll automático al siguiente paso cuando se elige una opción
  useEffect(() => {
    if (barberoElegido) refServicio.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [barberoElegido]);

  useEffect(() => {
    if (servicioElegido) refDia.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [servicioElegido]);

  useEffect(() => {
    if (diaElegido) refHora.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [diaElegido]);

  useEffect(() => {
    if (horaElegida) refDatos.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [horaElegida]);

  function emailValido(correo: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
  }

  const formularioCompleto =
    nombre.trim() !== '' &&
    telefono.trim() !== '' &&
    email.trim() !== '' &&
    emailValido(email);

  async function confirmarReserva() {
    if (!barberoElegido || !servicioElegido || !diaElegido || !horaElegida) return;

    setGuardando(true);
    setErrorGuardado(null);

    try {
      const res = await fetch('/api/reservas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barber_id: barberoElegido.id,
          service_id: servicioElegido.id,
          fecha: diaElegido,
          hora: horaElegida,
          nombre_cliente: nombre.trim(),
          telefono_cliente: telefono.trim(),
          email_cliente: email.trim(),
        }),
      });

      const resultado = await res.json();
      setGuardando(false);

      if (!res.ok) {
        if (resultado.error === 'slot_ocupado') {
          setErrorGuardado('Esa hora acaba de ser reservada por alguien más. Por favor elige otra.');
          setHorasDisponibles((prev) => prev.filter((h) => h !== horaElegida));
          setHoraElegida(null);
        } else if (resultado.error === 'demasiados_intentos') {
          setErrorGuardado('Has hecho demasiados intentos. Espera unos minutos e intenta de nuevo.');
        } else if (resultado.error === 'fecha_invalida') {
          setErrorGuardado('Esa fecha u hora ya no está disponible. Elige otra.');
        } else if (resultado.error === 'datos_invalidos') {
          setErrorGuardado('Revisa tus datos (nombre, teléfono y correo) e intenta de nuevo.');
        } else {
          setErrorGuardado('Ocurrió un error al guardar. Intenta de nuevo.');
        }
        return;
      }

      setReservaHecha({ cancelToken: resultado.cancel_token });
    } catch {
      setGuardando(false);
      setErrorGuardado('No se pudo conectar. Revisa tu internet e intenta de nuevo.');
    }
  }

  function reiniciar() {
    setBarberoElegido(null);
    setServicioElegido(null);
    setDiaElegido(null);
    setHoraElegida(null);
    setHorasDisponibles([]);
    setNombre('');
    setTelefono('');
    setEmail('');
    setErrorGuardado(null);
    setReservaHecha(null);
    window.scrollTo({ top: 0 });
  }

  // PANTALLA DE CONFIRMACIÓN
  if (reservaHecha) {
    const urlCancelar = `${window.location.origin}/cancelar/${reservaHecha.cancelToken}`;

    // Enlace para agregar la cita a Google Calendar (cita de 1 hora, hora de Colombia)
    const [hh, mm] = horaElegida!.split(':');
    const inicio = `${diaElegido!.replace(/-/g, '')}T${hh}${mm}00`;
    const fin = `${diaElegido!.replace(/-/g, '')}T${String(Number(hh) + 1).padStart(2, '0')}${mm}00`;
    const urlCalendario =
      'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      `&text=${encodeURIComponent(`Cita en Africa Latina Barbershop con ${barberoElegido?.nombre}`)}` +
      `&details=${encodeURIComponent(`Servicio: ${servicioElegido?.nombre}`)}` +
      `&dates=${inicio}/${fin}&ctz=America/Bogota`;

    const filas: [string, string][] = [
      ['Barbero', barberoElegido?.nombre ?? ''],
      ['Servicio', servicioElegido?.nombre ?? ''],
      ['Fecha', fechaBonita(diaElegido!)],
      ['Hora', hora12(horaElegida!)],
    ];

    return (
      <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
        <div className="anim-entrar max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center">
          <svg viewBox="0 0 52 52" className="w-20 h-20 mx-auto mb-4" aria-hidden="true">
            <circle cx="26" cy="26" r="24" fill="#fbbf24" className="anim-pop" />
            <path
              d="M15 27l8 8 14-16"
              fill="none"
              stroke="#0a0a0a"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="anim-trazo"
            />
          </svg>
          <h1 className="font-[family-name:var(--font-oswald)] uppercase tracking-wide text-2xl font-bold text-amber-400 mb-1">
            ¡Reserva confirmada!
          </h1>
          <p className="text-neutral-400 text-sm mb-6">
            Enviamos los detalles a <span className="text-neutral-200">{email}</span>
          </p>

          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 mb-6 text-left">
            {filas.map(([etiqueta, valor], i) => (
              <div
                key={etiqueta}
                style={{ animationDelay: `${0.35 + i * 0.08}s` }}
                className={`anim-aparecer flex justify-between gap-4 py-2 ${
                  i < filas.length - 1 ? 'border-b border-neutral-800' : ''
                }`}
              >
                <span className="text-neutral-400">{etiqueta}</span>
                <span className="font-bold text-right">{valor}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href="/"
              className="presionable w-full py-4 rounded-xl bg-amber-400 text-neutral-950 font-bold uppercase tracking-wide hover:bg-amber-300"
            >
              Volver al inicio
            </Link>
            <a
              href={urlCalendario}
              target="_blank"
              rel="noopener noreferrer"
              className="presionable w-full py-3 rounded-xl border border-neutral-700 text-neutral-200 hover:border-amber-400 hover:text-amber-400"
            >
              Agregar a mi calendario
            </a>
            <button
              onClick={reiniciar}
              className="presionable w-full py-3 rounded-xl border border-neutral-700 text-neutral-200 hover:border-amber-400 hover:text-amber-400"
            >
              Agendar otra cita
            </button>
          </div>

          <p className="text-neutral-400 text-xs mt-6">
            ¿No podrás asistir?{' '}
            <a href={urlCancelar} className="text-red-400 underline hover:text-red-300">
              Cancelar mi cita
            </a>{' '}
            (hasta 30 minutos antes).
          </p>
        </div>
      </main>
    );
  }

  // Progreso: cada paso se marca al completarse
  const pasos = [
    { etiqueta: 'Barbero', hecho: !!barberoElegido },
    { etiqueta: 'Servicio', hecho: !!servicioElegido },
    { etiqueta: 'Día', hecho: !!diaElegido },
    { etiqueta: 'Hora', hecho: !!horaElegida },
    { etiqueta: 'Datos', hecho: false },
  ];
  const actual = pasos.findIndex((p) => !p.hecho);

  // Volver a un paso ya completado desde la barra de progreso
  function irAPaso(i: number) {
    [refBarbero, refServicio, refDia, refHora, refDatos][i].current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  return (
    <main className="bg-neutral-950 text-white">
      {/* Barra de progreso fija arriba */}
      <div className="sticky top-0 z-20 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur">
        <ol className="max-w-xl mx-auto px-4 py-3 flex items-center" aria-label="Progreso de la reserva">
          {pasos.map((p, i) => {
            const esActual = i === actual;
            return (
              <li key={p.etiqueta} className="flex items-center flex-1 last:flex-none">
                <button
                  onClick={() => p.hecho && irAPaso(i)}
                  disabled={!p.hecho}
                  aria-current={esActual ? 'step' : undefined}
                  className="flex flex-col items-center gap-1 min-w-11 disabled:cursor-default"
                >
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                      p.hecho
                        ? 'bg-amber-400 border-amber-400 text-neutral-950'
                        : esActual
                        ? 'border-amber-400 text-amber-400 scale-110'
                        : 'border-neutral-700 text-neutral-400'
                    }`}
                  >
                    {p.hecho ? <Palomita /> : i + 1}
                  </span>
                  <span
                    className={`text-[11px] leading-none transition-colors ${
                      esActual || p.hecho ? 'text-neutral-200' : 'text-neutral-400'
                    }`}
                  >
                    {p.etiqueta}
                  </span>
                </button>
                {i < pasos.length - 1 && (
                  <span className="flex-1 h-0.5 mx-1 mb-4 rounded bg-neutral-800 overflow-hidden">
                    <span
                      className={`block h-full bg-amber-400 origin-left transition-transform duration-500 ${
                        p.hecho ? 'scale-x-100' : 'scale-x-0'
                      }`}
                    />
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <div className={`max-w-xl mx-auto px-4 pt-6 ${barberoElegido && !horaElegida ? 'pb-32' : 'pb-10'}`}>
        <BotonVolver href="/">Volver al inicio</BotonVolver>
        <h1 className="font-[family-name:var(--font-oswald)] uppercase tracking-wide text-3xl font-bold text-amber-400 mt-5 mb-8 text-center">
          Reserva tu cita
        </h1>

        {/* PASO 1: barbero */}
        <section ref={refBarbero} className="anim-entrar scroll-mt-24 mb-8">
          <h2 className={estiloTitulo}>1. Elige tu barbero</h2>
          <div className="flex flex-col gap-3">
            {barbers.map((b) => (
              <Tarjeta key={b.id} activa={barberoElegido?.id === b.id} onClick={() => setBarberoElegido(b)}>
                <div className="flex items-center gap-4">
                  {b.foto_url ? (
                    <img src={b.foto_url} alt="" className="w-14 h-14 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-neutral-700 shrink-0" />
                  )}
                  <div>
                    <div className="font-bold">{b.nombre}</div>
                    {b.descripcion && <div className="text-sm text-neutral-400">{b.descripcion}</div>}
                  </div>
                </div>
              </Tarjeta>
            ))}
          </div>
        </section>

        {/* PASO 2: servicio */}
        {barberoElegido && (
          <section ref={refServicio} className="anim-entrar scroll-mt-24 mb-8">
            <h2 className={estiloTitulo}>2. Elige el servicio</h2>
            <div className="flex flex-col gap-3">
              {services.map((s) => (
                <Tarjeta key={s.id} activa={servicioElegido?.id === s.id} onClick={() => setServicioElegido(s)}>
                  <div className="font-bold">{s.nombre}</div>
                  {s.descripcion && <div className="text-sm text-neutral-400">{s.descripcion}</div>}
                  <div className="text-amber-400 mt-1">
                    ${s.precio.toLocaleString('es-CO')}
                    <span className="text-neutral-400"> · {s.duracion_min} min</span>
                  </div>
                </Tarjeta>
              ))}
            </div>
          </section>
        )}

        {/* PASO 3: día */}
        {servicioElegido && (
          <section ref={refDia} className="anim-entrar scroll-mt-24 mb-8">
            <h2 className={estiloTitulo}>3. Elige el día</h2>
            <div className="grid grid-cols-4 gap-2">
              {dias.map((d, i) => {
                const valor = aTextoFecha(d);
                const activo = diaElegido === valor;
                const rotulo =
                  i === 0
                    ? 'Hoy'
                    : i === 1
                    ? 'Mañana'
                    : d.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '');
                return (
                  <button
                    key={valor}
                    onClick={() => setDiaElegido(valor)}
                    aria-pressed={activo}
                    className={`presionable flex flex-col items-center py-3 rounded-xl border capitalize ${
                      activo
                        ? 'border-amber-400 bg-amber-400/10 text-amber-400'
                        : 'border-neutral-700 bg-neutral-900 text-neutral-200 hover:border-neutral-500'
                    }`}
                  >
                    <span className="text-xs text-neutral-400">{rotulo}</span>
                    <span className="text-2xl font-bold leading-tight">{d.getDate()}</span>
                    <span className="text-xs text-neutral-400">
                      {d.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '')}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* PASO 4: hora */}
        {diaElegido && (
          <section ref={refHora} className="anim-entrar scroll-mt-24 mb-8">
            <h2 className={estiloTitulo}>4. Elige la hora</h2>
            {cargandoHoras ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2" aria-busy="true" aria-label="Cargando horas">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-xl bg-neutral-800 animate-pulse" />
                ))}
              </div>
            ) : horasDisponibles.length === 0 ? (
              <div className="anim-aparecer p-4 rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-300">
                No hay horas disponibles este día. Prueba con otro día.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {horasDisponibles.map((hora, i) => (
                  <button
                    key={hora}
                    onClick={() => setHoraElegida(hora)}
                    aria-pressed={horaElegida === hora}
                    style={{ animationDelay: `${Math.min(i, 12) * 0.03}s` }}
                    className={`anim-entrar presionable h-12 rounded-xl border text-sm ${
                      horaElegida === hora
                        ? 'border-amber-400 bg-amber-400 text-neutral-950 font-bold'
                        : 'border-neutral-700 bg-neutral-900 text-neutral-100 hover:border-neutral-500'
                    }`}
                  >
                    {hora12(hora)}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* PASO 5: formulario */}
        {horaElegida && (
          <section ref={refDatos} className="anim-entrar scroll-mt-24 mb-8">
            <h2 className={estiloTitulo}>5. Tus datos</h2>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4">
              <p className="text-neutral-300">
                <strong className="text-white">{barberoElegido?.nombre}</strong> — {servicioElegido?.nombre} ($
                {servicioElegido?.precio.toLocaleString('es-CO')})
              </p>
              <p className="text-neutral-400 text-sm">
                {fechaBonita(diaElegido!)} a las {hora12(horaElegida!)}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm text-neutral-300">
                Nombre completo
                <input
                  autoComplete="name"
                  placeholder="Ej. Juan Pérez"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className={estiloInput}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-neutral-300">
                Teléfono
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="Ej. 314 853 2393"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className={estiloInput}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-neutral-300">
                Correo electrónico
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="tucorreo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={estiloInput}
                />
              </label>
            </div>

            {email.trim() !== '' && !emailValido(email) && (
              <p className="text-red-400 text-sm mt-2">El correo no parece válido.</p>
            )}
            {errorGuardado && (
              <p role="alert" className="anim-aparecer text-red-400 mt-2">
                {errorGuardado}
              </p>
            )}

            <button
              onClick={confirmarReserva}
              disabled={!formularioCompleto || guardando}
              className={`presionable mt-4 w-full py-4 rounded-xl font-bold uppercase tracking-wide inline-flex items-center justify-center gap-2 ${
                formularioCompleto && !guardando
                  ? 'bg-amber-400 text-neutral-950 hover:bg-amber-300 cursor-pointer'
                  : 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
              }`}
            >
              {guardando && (
                <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                  <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              )}
              {guardando ? 'Guardando...' : 'Confirmar reserva'}
            </button>
          </section>
        )}
      </div>

      {/* Resumen fijo abajo mientras eliges */}
      {barberoElegido && !horaElegida && (
        <div className="anim-subir fixed bottom-0 inset-x-0 z-20 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur">
          <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wide text-neutral-400">Tu cita</div>
              <div className="text-sm text-white truncate">
                {[
                  barberoElegido.nombre,
                  servicioElegido?.nombre,
                  diaElegido ? fechaCorta(diaElegido) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </div>
            {servicioElegido && (
              <div className="shrink-0 text-amber-400 font-bold">
                ${servicioElegido.precio.toLocaleString('es-CO')}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
