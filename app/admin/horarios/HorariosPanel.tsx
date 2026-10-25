'use client';

import { useState, useEffect } from 'react';

type Rango = { inicio: string; fin: string; paso: number };
type Semana = Record<string, Rango[]>;
type Barbero = { id: string; nombre: string };

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

const estiloSelect =
  'p-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white focus:border-amber-400 focus:outline-none';

export default function HorariosPanel({ barberos }: { barberos: Barbero[] }) {
  const [barberoId, setBarberoId] = useState(barberos[0].id);
  const [semana, setSemana] = useState<Semana | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/admin/horarios?barber_id=${barberoId}`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelado) return;
        if (res.ok) setSemana(data.dias);
        else setError('No se pudo cargar el horario.');
      })
      .catch(() => !cancelado && setError('No se pudo conectar. Intenta de nuevo.'));
    return () => {
      cancelado = true;
    };
  }, [barberoId]);

  function cambiarBarbero(id: string) {
    setSemana(null);
    setError(null);
    setMensaje(null);
    setBarberoId(id);
  }

  function actualizarDia(dia: number, rangos: Rango[]) {
    setSemana((s) => (s ? { ...s, [String(dia)]: rangos } : s));
    setMensaje(null);
  }

  async function guardar() {
    if (!semana) return;
    setGuardando(true);
    setError(null);
    setMensaje(null);
    try {
      const res = await fetch('/api/admin/horarios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barber_id: barberoId, dias: semana }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(ERRORES[data.error] ?? 'No se pudo guardar el horario. Intenta de nuevo.');
      } else {
        setMensaje('Horario guardado.');
      }
    } catch {
      setError('No se pudo conectar. Intenta de nuevo.');
    }
    setGuardando(false);
  }

  return (
    <div>
      {barberos.length > 1 && (
        <div className="mb-5">
          <label className="text-neutral-400 text-sm block mb-1">Barbero:</label>
          <select
            value={barberoId}
            onChange={(e) => cambiarBarbero(e.target.value)}
            className="w-full p-3 rounded-xl bg-neutral-900 border border-neutral-700 text-white focus:border-amber-400 focus:outline-none"
          >
            {barberos.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      {!semana ? (
        <p className="text-neutral-400">{error ?? 'Cargando...'}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {DIAS.map(({ n, nombre }) => {
            const rangos = semana[String(n)] ?? [];
            const abre = rangos.length > 0;
            return (
              <div key={n} className="p-4 rounded-xl border border-neutral-800 bg-neutral-900">
                <div className="flex items-center justify-between">
                  <span className="font-bold">{nombre}</span>
                  <label className="flex items-center gap-2 text-sm text-neutral-300">
                    <input
                      type="checkbox"
                      checked={abre}
                      onChange={(e) =>
                        actualizarDia(n, e.target.checked ? [{ inicio: '09:00', fin: '18:00', paso: 15 }] : [])
                      }
                    />
                    {abre ? 'Trabaja' : 'Día libre'}
                  </label>
                </div>

                {abre && (
                  <div className="mt-3 flex flex-col gap-2">
                    {rangos.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 flex-wrap">
                        <input
                          type="time"
                          step={300}
                          value={r.inicio}
                          onChange={(e) =>
                            e.target.value &&
                            actualizarDia(
                              n,
                              rangos.map((x, j) => (j === i ? { ...x, inicio: e.target.value } : x))
                            )
                          }
                          className={estiloSelect}
                        />
                        <span className="text-neutral-500">a</span>
                        <input
                          type="time"
                          step={300}
                          value={r.fin}
                          onChange={(e) =>
                            e.target.value &&
                            actualizarDia(
                              n,
                              rangos.map((x, j) => (j === i ? { ...x, fin: e.target.value } : x))
                            )
                          }
                          className={estiloSelect}
                        />
                        <label className="flex items-center gap-1 text-sm text-neutral-400">
                          cada
                          <input
                            type="number"
                            min={5}
                            max={240}
                            step={5}
                            value={r.paso}
                            onChange={(e) =>
                              actualizarDia(
                                n,
                                rangos.map((x, j) =>
                                  j === i ? { ...x, paso: Number(e.target.value) } : x
                                )
                              )
                            }
                            className={`${estiloSelect} w-20`}
                          />
                          min
                        </label>
                        <button
                          onClick={() => actualizarDia(n, rangos.filter((_, j) => j !== i))}
                          className="text-sm text-red-400 hover:text-red-300 transition"
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                    {rangos.length < 3 && (
                      <button
                        onClick={() => actualizarDia(n, [...rangos, { inicio: '14:00', fin: '18:00', paso: rangos[rangos.length - 1]?.paso ?? 15 }])}
                        className="self-start text-sm text-amber-400 hover:text-amber-300 transition"
                      >
                        + Agregar tramo (ej. tarde)
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {mensaje && <p className="text-amber-400 text-sm">{mensaje}</p>}
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            onClick={guardar}
            disabled={guardando}
            className="w-full py-4 rounded-xl bg-amber-400 text-neutral-950 font-bold uppercase tracking-wide hover:bg-amber-300 transition disabled:opacity-60"
          >
            {guardando ? 'Guardando...' : 'Guardar horario'}
          </button>
        </div>
      )}
    </div>
  );
}
