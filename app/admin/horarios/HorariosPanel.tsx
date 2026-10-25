'use client';

import { useState, useEffect } from 'react';
import { useFeedback } from '@/app/components/Feedback';
import { hora12 } from '@/lib/formato';

type Rango = { inicio: string; fin: string; paso: number };
type Semana = Record<string, Rango[]>;
type Barbero = { id: string; nombre: string; propio?: boolean };

// Lunes a domingo (el número es el día de la semana: 0 = domingo)
const DIAS = [
  { n: 1, nombre: 'Lunes' },
  { n: 2, nombre: 'Martes' },
  { n: 3, nombre: 'Miércoles' },
  { n: 4, nombre: 'Jueves' },
  { n: 5, nombre: 'Viernes' },
  { n: 6, nombre: 'Sábado' },
  { n: 0, nombre: 'Domingo' },
];

const ERRORES: Record<string, string> = {
  horario_invalido: 'Cada tramo debe terminar después de empezar (mínimo 10 minutos).',
  tramos_solapados: 'Hay tramos que se cruzan en un mismo día.',
  paso_invalido: 'El «cada ___ min» debe estar entre 5 y 240, de 5 en 5.',
};

// text-base (16 px) evita que el celular haga zoom al tocar el campo
const estiloCampo =
  'w-full min-h-11 px-3 rounded-lg bg-neutral-900 border border-neutral-700 text-base text-white focus:border-amber-400 focus:outline-none transition-colors';

// Interruptor "Trabaja / Día libre"
function Interruptor({
  activo,
  onChange,
  etiqueta,
}: {
  activo: boolean;
  onChange: (valor: boolean) => void;
  etiqueta: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={etiqueta}
      onClick={() => onChange(!activo)}
      className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors ${
        activo ? 'bg-amber-400' : 'bg-neutral-700'
      }`}
    >
      <span
        className={`inline-block h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${
          activo ? 'translate-x-7' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// "9:00 a. m. - 1:00 p. m. · 3:20 p. m. - 6:20 p. m."
function resumen(rangos: Rango[]): string {
  return rangos.map((r) => `${hora12(r.inicio)} - ${hora12(r.fin)}`).join('  ·  ');
}

export default function HorariosPanel({ barberos }: { barberos: Barbero[] }) {
  const { avisar, confirmar } = useFeedback();
  const [barberoId, setBarberoId] = useState(
    () => (barberos.find((b) => b.propio) ?? barberos[0]).id
  );
  const [semana, setSemana] = useState<Semana | null>(null);
  const [cambios, setCambios] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/admin/horarios?barber_id=${barberoId}`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelado) return;
        if (res.ok) {
          setSemana(data.dias);
          setCambios(false);
        } else {
          setError('No se pudo cargar el horario.');
        }
      })
      .catch(() => !cancelado && setError('No se pudo conectar. Intenta de nuevo.'));
    return () => {
      cancelado = true;
    };
  }, [barberoId]);

  async function cambiarBarbero(id: string) {
    if (cambios) {
      const descartar = await confirmar({
        titulo: 'Cambios sin guardar',
        mensaje: 'Si cambias de barbero, se pierden los cambios que no has guardado.',
        confirmar: 'Descartar cambios',
        peligro: true,
      });
      if (!descartar) return;
    }
    setSemana(null);
    setError(null);
    setBarberoId(id);
  }

  function actualizarDia(dia: number, rangos: Rango[]) {
    setSemana((s) => (s ? { ...s, [String(dia)]: rangos } : s));
    setCambios(true);
  }

  async function guardar() {
    if (!semana) return;
    setGuardando(true);
    try {
      const res = await fetch('/api/admin/horarios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barber_id: barberoId, dias: semana }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        avisar(ERRORES[data.error] ?? 'No se pudo guardar el horario. Intenta de nuevo.', 'error');
      } else {
        avisar('Horario guardado.');
        setCambios(false);
      }
    } catch {
      avisar('No se pudo conectar. Intenta de nuevo.', 'error');
    }
    setGuardando(false);
  }

  return (
    <div>
      {barberos.length > 1 && (
        <div className="mb-5">
          <label htmlFor="horarios-barbero" className="text-neutral-400 text-sm block mb-1">
            Barbero:
          </label>
          <select
            id="horarios-barbero"
            value={barberoId}
            onChange={(e) => cambiarBarbero(e.target.value)}
            className="w-full min-h-12 px-3 rounded-xl bg-neutral-900 border border-neutral-700 text-base text-white focus:border-amber-400 focus:outline-none"
          >
            {barberos.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nombre}
                {b.propio ? ' (tú)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {!semana ? (
        error ? (
          <p role="alert" className="text-red-400">
            {error}
          </p>
        ) : (
          <div className="flex flex-col gap-3" aria-busy="true" aria-label="Cargando horario">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-neutral-900 animate-pulse" />
            ))}
          </div>
        )
      ) : (
        <div className="flex flex-col gap-3">
          {DIAS.map(({ n, nombre }) => {
            const rangos = semana[String(n)] ?? [];
            const abre = rangos.length > 0;
            return (
              <section
                key={n}
                aria-label={nombre}
                className={`rounded-xl border p-4 transition-colors ${
                  abre ? 'border-neutral-700 bg-neutral-900' : 'border-neutral-800 bg-neutral-900/60'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold">{nombre}</h3>
                    <p className={`text-xs mt-0.5 ${abre ? 'text-amber-400' : 'text-neutral-400'}`}>
                      {abre ? resumen(rangos) : 'Día libre'}
                    </p>
                  </div>
                  <Interruptor
                    activo={abre}
                    etiqueta={`${nombre}: trabaja este día`}
                    onChange={(valor) =>
                      actualizarDia(n, valor ? [{ inicio: '09:00', fin: '18:00', paso: 15 }] : [])
                    }
                  />
                </div>

                {abre && (
                  <div className="mt-4 flex flex-col gap-3">
                    {rangos.map((r, i) => (
                      <div key={i} className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs uppercase tracking-wide text-neutral-400">
                            Tramo {i + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => actualizarDia(n, rangos.filter((_, j) => j !== i))}
                            aria-label={`Quitar el tramo ${i + 1} de ${nombre}`}
                            className="presionable min-h-9 px-3 rounded-lg text-sm text-red-400 hover:bg-red-500/10"
                          >
                            Quitar
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <label className="flex flex-col gap-1 text-sm text-neutral-300">
                            Desde
                            <input
                              type="time"
                              step={300}
                              value={r.inicio}
                              aria-label={`${nombre}: inicio del tramo ${i + 1}`}
                              onChange={(e) =>
                                e.target.value &&
                                actualizarDia(
                                  n,
                                  rangos.map((x, j) => (j === i ? { ...x, inicio: e.target.value } : x))
                                )
                              }
                              className={estiloCampo}
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-sm text-neutral-300">
                            Hasta
                            <input
                              type="time"
                              step={300}
                              value={r.fin}
                              aria-label={`${nombre}: fin del tramo ${i + 1}`}
                              onChange={(e) =>
                                e.target.value &&
                                actualizarDia(
                                  n,
                                  rangos.map((x, j) => (j === i ? { ...x, fin: e.target.value } : x))
                                )
                              }
                              className={estiloCampo}
                            />
                          </label>
                        </div>

                        <label className="mt-3 flex items-center gap-2 text-sm text-neutral-300">
                          Una hora de inicio cada
                          <input
                            type="number"
                            inputMode="numeric"
                            min={5}
                            max={240}
                            step={5}
                            value={r.paso}
                            aria-label={`${nombre}: cada cuántos minutos, tramo ${i + 1}`}
                            onChange={(e) =>
                              actualizarDia(
                                n,
                                rangos.map((x, j) =>
                                  j === i ? { ...x, paso: Number(e.target.value) } : x
                                )
                              )
                            }
                            className={`${estiloCampo} !w-20 text-center`}
                          />
                          min
                        </label>
                      </div>
                    ))}

                    {rangos.length < 3 && (
                      <button
                        type="button"
                        onClick={() =>
                          actualizarDia(n, [
                            ...rangos,
                            { inicio: '14:00', fin: '18:00', paso: rangos[rangos.length - 1]?.paso ?? 15 },
                          ])
                        }
                        className="presionable w-full min-h-11 rounded-xl border border-dashed border-neutral-600 text-sm text-amber-400 hover:border-amber-400"
                      >
                        + Agregar tramo (ej. tarde)
                      </button>
                    )}
                  </div>
                )}
              </section>
            );
          })}

          {/* Barra de guardado que acompaña al hacer scroll */}
          <div className="sticky bottom-3 z-10 mt-2 flex items-center gap-3 rounded-2xl border border-neutral-700 bg-neutral-900/95 p-3 shadow-lg shadow-black/40 backdrop-blur">
            <span className={`text-sm ${cambios ? 'text-amber-400' : 'text-neutral-400'}`}>
              {cambios ? '● Cambios sin guardar' : 'Todo guardado'}
            </span>
            <button
              onClick={guardar}
              disabled={!cambios || guardando}
              className="presionable ml-auto min-h-11 px-6 rounded-xl bg-amber-400 font-bold uppercase tracking-wide text-neutral-950 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
