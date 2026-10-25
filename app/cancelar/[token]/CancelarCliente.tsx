'use client';

import { useState } from 'react';
import Link from 'next/link';
import FeedbackProvider, { useFeedback } from '@/app/components/Feedback';
import { MINUTOS_CANCELACION, WHATSAPP_NEGOCIO } from '@/lib/config-reservas';

type Props = {
  token: string;
  estado: string;
  fecha: string;
  hora: string;
  nombreCliente: string;
  barbero: string;
  servicio: string;
  fueraDePlazo: boolean;
};

const ERRORES: Record<string, string> = {
  error_cancelar: 'Ocurrió un error al cancelar. Intenta de nuevo.',
  error_conexion: 'No se pudo conectar. Revisa tu internet e intenta de nuevo.',
  demasiados_intentos: 'Demasiados intentos. Espera unos minutos e intenta de nuevo.',
  no_encontrada: 'No encontramos esta reserva.',
};

const estiloTitulo =
  'font-[family-name:var(--font-oswald)] uppercase tracking-wide text-2xl font-bold text-amber-400';

// Los avisos y la ventana de confirmación necesitan su proveedor en esta página pública
export default function CancelarCliente(props: Props) {
  return (
    <FeedbackProvider>
      <Contenido {...props} />
    </FeedbackProvider>
  );
}

function Contenido({
  token,
  estado,
  fecha,
  hora,
  nombreCliente,
  barbero,
  servicio,
  fueraDePlazo,
}: Props) {
  const { confirmar } = useFeedback();
  const [cancelando, setCancelando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(
    estado === 'cancelada' ? 'ya_cancelada' : null
  );

  const filas: [string, string][] = [
    ['Barbero', barbero],
    ['Servicio', servicio],
    ['Fecha', fecha],
    ['Hora', hora],
  ];

  const enlaceWhatsApp =
    `https://wa.me/${WHATSAPP_NEGOCIO}?text=` +
    encodeURIComponent(`Hola, soy ${nombreCliente}. Necesito cambiar mi cita del ${fecha} a las ${hora}.`);

  async function cancelar() {
    const seguro = await confirmar({
      titulo: '¿Cancelar tu cita?',
      mensaje: `${barbero} · ${servicio}\n${fecha} a las ${hora}`,
      confirmar: 'Sí, cancelar',
      cancelar: 'No, mantenerla',
      peligro: true,
    });
    if (!seguro) return;

    setCancelando(true);
    try {
      const res = await fetch('/api/cancelar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      setCancelando(false);
      setResultado(res.ok ? 'ok' : data.error ?? 'error_cancelar');
    } catch {
      setCancelando(false);
      setResultado('error_conexion');
    }
  }

  // Cancelada ahora o antes
  if (resultado === 'ok' || resultado === 'ya_cancelada') {
    const reciente = resultado === 'ok';
    return (
      <Pantalla>
        <svg viewBox="0 0 52 52" className="w-20 h-20 mx-auto mb-4" aria-hidden="true">
          <circle cx="26" cy="26" r="24" fill={reciente ? '#fbbf24' : '#404040'} className="anim-pop" />
          <path
            d="M15 27l8 8 14-16"
            fill="none"
            stroke={reciente ? '#0a0a0a' : '#a3a3a3'}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="anim-trazo"
          />
        </svg>
        <h1 className={`${estiloTitulo} mb-2`}>{reciente ? 'Cita cancelada' : 'Esta cita ya estaba cancelada'}</h1>
        <p className="text-neutral-300 mb-6">
          {reciente
            ? 'Tu cita fue cancelada correctamente y te enviamos la confirmación por correo.'
            : 'No necesitas hacer nada más.'}{' '}
          Cuando quieras, puedes agendar una nueva.
        </p>
        <Acciones />
      </Pantalla>
    );
  }

  // Fuera del plazo para cancelar por aquí
  if (fueraDePlazo || resultado === 'fuera_de_plazo') {
    return (
      <Pantalla>
        <h1 className={`${estiloTitulo} mb-2`}>Ya no se puede cancelar aquí</h1>
        <p className="text-neutral-300 mb-5">
          Las citas se cancelan hasta {MINUTOS_CANCELACION} minutos antes de la hora. Si necesitas
          cambiarla, escríbenos y lo resolvemos.
        </p>
        <Resumen nombre={nombreCliente} filas={filas} />
        <div className="flex flex-col gap-3">
          <a
            href={enlaceWhatsApp}
            target="_blank"
            rel="noopener noreferrer"
            className="presionable w-full py-4 rounded-xl bg-amber-400 text-neutral-950 font-bold uppercase tracking-wide hover:bg-amber-300"
          >
            Escribir por WhatsApp
          </a>
          <Link
            href="/"
            className="presionable w-full py-3 rounded-xl border border-neutral-700 text-neutral-200 hover:border-amber-400 hover:text-amber-400"
          >
            Ir al inicio
          </Link>
        </div>
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <h1 className={`${estiloTitulo} mb-2`}>Cancelar reserva</h1>
      <p className="text-neutral-300 mb-5">¿Quieres cancelar esta cita?</p>
      <Resumen nombre={nombreCliente} filas={filas} />

      {resultado && ERRORES[resultado] && (
        <p role="alert" className="anim-aparecer text-red-400 text-sm mb-4">
          {ERRORES[resultado]}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <button
          onClick={cancelar}
          disabled={cancelando}
          className="presionable w-full py-4 rounded-xl bg-red-600 text-white font-bold uppercase tracking-wide hover:bg-red-500 disabled:opacity-60 inline-flex items-center justify-center gap-2"
        >
          {cancelando && (
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
              <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          )}
          {cancelando ? 'Cancelando...' : 'Cancelar mi cita'}
        </button>
        <Link
          href="/"
          className="presionable w-full py-3 rounded-xl border border-neutral-700 text-neutral-200 hover:border-amber-400 hover:text-amber-400"
        >
          No, mantener mi cita
        </Link>
      </div>
      <p className="text-neutral-400 text-xs mt-5">
        Puedes cancelar hasta {MINUTOS_CANCELACION} minutos antes de la hora.
      </p>
    </Pantalla>
  );
}

function Pantalla({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
      <div className="anim-entrar max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center">
        {children}
      </div>
    </main>
  );
}

function Resumen({ nombre, filas }: { nombre: string; filas: [string, string][] }) {
  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 mb-6 text-left">
      <p className="text-neutral-300 text-sm mb-2">Hola {nombre}, esta es tu cita:</p>
      {filas.map(([etiqueta, valor], i) => (
        <div
          key={etiqueta}
          className={`flex justify-between gap-4 py-2 ${
            i < filas.length - 1 ? 'border-b border-neutral-800' : ''
          }`}
        >
          <span className="text-neutral-400">{etiqueta}</span>
          <span className="font-bold text-right">{valor}</span>
        </div>
      ))}
    </div>
  );
}

function Acciones() {
  return (
    <div className="flex flex-col gap-3">
      <Link
        href="/reservas"
        className="presionable w-full py-4 rounded-xl bg-amber-400 text-neutral-950 font-bold uppercase tracking-wide hover:bg-amber-300"
      >
        Agendar una nueva cita
      </Link>
      <Link
        href="/"
        className="presionable w-full py-3 rounded-xl border border-neutral-700 text-neutral-200 hover:border-amber-400 hover:text-amber-400"
      >
        Ir al inicio
      </Link>
    </div>
  );
}
