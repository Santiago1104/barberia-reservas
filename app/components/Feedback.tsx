'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

type Tipo = 'ok' | 'error';

export type OpcionesConfirmar = {
  titulo: string;
  mensaje?: string;
  confirmar?: string; // texto del botón principal
  cancelar?: string;
  peligro?: boolean; // botón en rojo (acciones destructivas)
};

type Contexto = {
  avisar: (texto: string, tipo?: Tipo) => void;
  confirmar: (opciones: OpcionesConfirmar) => Promise<boolean>;
};

const FeedbackContexto = createContext<Contexto | null>(null);

export function useFeedback(): Contexto {
  const ctx = useContext(FeedbackContexto);
  if (!ctx) throw new Error('useFeedback debe usarse dentro de FeedbackProvider');
  return ctx;
}

type Aviso = { id: number; texto: string; tipo: Tipo };
type Dialogo = { opciones: OpcionesConfirmar; resolver: (valor: boolean) => void };

// Avisos flotantes y ventanas de confirmación con el estilo de la marca,
// en lugar de los cuadros del navegador
export default function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);
  const siguienteId = useRef(0);

  const avisar = useCallback((texto: string, tipo: Tipo = 'ok') => {
    const id = ++siguienteId.current;
    setAvisos((a) => [...a, { id, texto, tipo }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), tipo === 'error' ? 6000 : 4000);
  }, []);

  const confirmar = useCallback(
    (opciones: OpcionesConfirmar) =>
      new Promise<boolean>((resolver) => setDialogo({ opciones, resolver })),
    []
  );

  const cerrar = useCallback(
    (valor: boolean) => {
      dialogo?.resolver(valor);
      setDialogo(null);
    },
    [dialogo]
  );

  return (
    <FeedbackContexto.Provider value={{ avisar, confirmar }}>
      {children}

      {/* Avisos flotantes */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 inset-x-0 z-50 flex flex-col items-center gap-2 px-4"
      >
        {avisos.map((a) => (
          <div
            key={a.id}
            role={a.tipo === 'error' ? 'alert' : 'status'}
            className={`anim-subir pointer-events-auto flex items-start gap-3 max-w-sm w-full rounded-xl border px-4 py-3 shadow-lg shadow-black/40 bg-neutral-900 ${
              a.tipo === 'error' ? 'border-red-500 text-red-100' : 'border-amber-400 text-white'
            }`}
          >
            <span
              className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                a.tipo === 'error' ? 'bg-red-500 text-white' : 'bg-amber-400 text-neutral-950'
              }`}
              aria-hidden="true"
            >
              {a.tipo === 'error' ? '!' : '✓'}
            </span>
            <span className="text-sm">{a.texto}</span>
          </div>
        ))}
      </div>

      {dialogo && <VentanaConfirmar dialogo={dialogo} cerrar={cerrar} />}
    </FeedbackContexto.Provider>
  );
}

function VentanaConfirmar({
  dialogo,
  cerrar,
}: {
  dialogo: Dialogo;
  cerrar: (valor: boolean) => void;
}) {
  const { titulo, mensaje, confirmar, cancelar, peligro } = dialogo.opciones;
  const refCancelar = useRef<HTMLButtonElement>(null);
  const refConfirmar = useRef<HTMLButtonElement>(null);

  // Foco al abrir, bloqueo del scroll, Esc para cancelar y foco que no se escapa de la ventana
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    refCancelar.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function alTeclear(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        cerrar(false);
      } else if (e.key === 'Tab') {
        const primero = refCancelar.current;
        const ultimo = refConfirmar.current;
        if (e.shiftKey && document.activeElement === primero) {
          e.preventDefault();
          ultimo?.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primero?.focus();
        }
      }
    }
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('keydown', alTeclear);
      document.body.style.overflow = overflow;
      anterior?.focus();
    };
  }, [cerrar]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div
        className="anim-aparecer absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => cerrar(false)}
        aria-hidden="true"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmar-titulo"
        aria-describedby={mensaje ? 'confirmar-mensaje' : undefined}
        className="anim-entrar relative w-full max-w-sm rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-2xl"
      >
        <h2
          id="confirmar-titulo"
          className="font-[family-name:var(--font-oswald)] uppercase tracking-wide text-xl font-bold text-white"
        >
          {titulo}
        </h2>
        {mensaje && (
          <p id="confirmar-mensaje" className="mt-3 text-sm text-neutral-300 whitespace-pre-line">
            {mensaje}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <button
            ref={refCancelar}
            onClick={() => cerrar(false)}
            className="presionable min-h-11 px-5 rounded-xl border border-neutral-700 text-neutral-200 hover:border-neutral-500"
          >
            {cancelar ?? 'Cancelar'}
          </button>
          <button
            ref={refConfirmar}
            onClick={() => cerrar(true)}
            className={`presionable min-h-11 px-5 rounded-xl font-bold ${
              peligro
                ? 'bg-red-600 text-white hover:bg-red-500'
                : 'bg-amber-400 text-neutral-950 hover:bg-amber-300'
            }`}
          >
            {confirmar ?? 'Aceptar'}
          </button>
        </div>
      </div>
    </div>
  );
}
