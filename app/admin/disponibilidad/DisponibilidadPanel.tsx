'use client';

import { useState, useEffect } from 'react';
import { hora12, fechaBonita } from '@/lib/formato';

type Franja = {
  hora: string;
  fin: string;
  estado: 'libre' | 'bloqueada' | 'reservada' | 'pasada';
  cliente?: string;
  inicio?: boolean;
};

type Barbero = { id: string; nombre: string };

const estilos: Record<Franja['estado'], string> = {
  libre: 'border-neutral-700 text-white hover:border-amber-400',
  bloqueada: 'border-red-500 bg-red-500/20 text-red-300',
  reservada: 'border-amber-400 bg-amber-400/10 text-amber-300',
  pasada: 'border-neutral-800 text-neutral-600 cursor-not-allowed',
};

export default function DisponibilidadPanel({
  barberos,
  hoy,
  maxFecha,
}: {
  barberos: Barbero[];
  hoy: string;
  maxFecha: string;
}) {
  const [barberoId, setBarberoId] = useState(barberos[0].id);
  const [fecha, setFecha] = useState(hoy);
  const [franjas, setFranjas] = useState<Franja[]>([]);
  const [cargadoPara, setCargadoPara] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clave = `${barberoId}|${fecha}|${version}`;
  const cargando = cargadoPara !== clave;
  const cargar = () => setVersion((v) => v + 1);

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/admin/bloqueos?barber_id=${barberoId}&fecha=${fecha}`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelado) return;
        setFranjas(res.ok ? data.franjas : []);
        setError(res.ok ? null : 'No se pudo cargar la disponibilidad.');
        setCargadoPara(`${barberoId}|${fecha}|${version}`);
      })
      .catch(() => {
        if (cancelado) return;
        setError('No se pudo conectar. Intenta de nuevo.');
        setCargadoPara(`${barberoId}|${fecha}|${version}`);
      });
    return () => {
      cancelado = true;
    };
  }, [barberoId, fecha, version]);

  async function bloquear(horas: string[], cancelarCitas = false) {
    setError(null);
    setMensaje(null);
    const res = await fetch('/api/admin/bloqueos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barber_id: barberoId, fecha, horas, cancelar_citas: cancelarCitas }),
    });
    const data = await res.json();

    if (res.status === 409 && data.error === 'hay_citas') {
      const lista = (data.citas as { hora: string; cliente: string }[])
        .map((c) => `• ${hora12(c.hora)} — ${c.cliente}`)
        .join('\n');
      const ok = window.confirm(
        `Hay citas reservadas en esas franjas:\n\n${lista}\n\nSi continúas, se cancelarán y se avisará a cada cliente por correo. ¿Continuar?`
      );
      if (ok) await bloquear(horas, true);
      return;
    }
    if (!res.ok) {
      setError('No se pudo bloquear. Intenta de nuevo.');
      return;
    }
    if (data.canceladas > 0) {
      setMensaje(`Bloqueado. Se canceló ${data.canceladas} cita(s) y se avisó a los clientes.`);
    }
    cargar();
  }

  async function desbloquear(horas: string[]) {
    setError(null);
    setMensaje(null);
    const res = await fetch('/api/admin/bloqueos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barber_id: barberoId, fecha, horas }),
    });
    if (!res.ok) setError('No se pudo desbloquear. Intenta de nuevo.');
    cargar();
  }

  function tocar(f: Franja) {
    if (f.estado === 'libre' || f.estado === 'reservada') bloquear([f.hora]);
    else if (f.estado === 'bloqueada') desbloquear([f.hora]);
  }

  const bloqueables = franjas
    .filter((f) => f.estado === 'libre' || f.estado === 'reservada')
    .map((f) => f.hora);
  const bloqueadas = franjas.filter((f) => f.estado === 'bloqueada').map((f) => f.hora);

  return (
    <div>
      {barberos.length > 1 && (
        <div className="mb-5">
          <label className="text-neutral-400 text-sm block mb-1">Barbero:</label>
          <select
            value={barberoId}
            onChange={(e) => setBarberoId(e.target.value)}
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

      <div className="mb-5">
        <label className="text-neutral-400 text-sm block mb-1">Día:</label>
        <input
          type="date"
          value={fecha}
          min={hoy}
          max={maxFecha}
          onChange={(e) => e.target.value && setFecha(e.target.value)}
          className="w-full p-3 rounded-xl bg-neutral-900 border border-neutral-700 text-white focus:border-amber-400 focus:outline-none"
        />
        <p className="text-neutral-500 text-xs mt-1">{fechaBonita(fecha)}</p>
      </div>

      <p className="text-neutral-500 text-xs mb-3">
        Estas son las mismas horas que ve el cliente. Toca una para bloquearla o liberarla.
      </p>
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => bloquear(bloqueables)}
          disabled={bloqueables.length === 0}
          className="text-sm px-4 py-2 rounded-lg border border-red-500 text-red-400 hover:bg-red-500 hover:text-white transition disabled:opacity-40"
        >
          Bloquear todo el día
        </button>
        <button
          onClick={() => desbloquear(bloqueadas)}
          disabled={bloqueadas.length === 0}
          className="text-sm px-4 py-2 rounded-lg border border-neutral-700 text-neutral-300 hover:border-amber-400 hover:text-amber-400 transition disabled:opacity-40"
        >
          Desbloquear todo el día
        </button>
      </div>

      {mensaje && <p className="text-amber-400 text-sm mb-3">{mensaje}</p>}
      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      {cargando ? (
        <p className="text-neutral-400">Cargando...</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {franjas.length === 0 && (
            <p className="col-span-3 text-neutral-400">
              Este día no hay horario de trabajo. Se define en «Horarios».
            </p>
          )}
          {franjas.map((f) => (
            <button
              key={f.hora}
              onClick={() => tocar(f)}
              disabled={f.estado === 'pasada'}
              className={`p-3 rounded-xl border text-left transition ${estilos[f.estado]}`}
            >
              <div className="font-bold">{hora12(f.hora)}</div>
              <div className="text-[11px] text-neutral-400">hasta {hora12(f.fin)}</div>
              <div className="text-xs mt-1">
                {f.estado === 'libre' && 'Libre'}
                {f.estado === 'bloqueada' && 'Bloqueada'}
                {f.estado === 'reservada' && (f.inicio ? `Cita: ${f.cliente}` : `↳ ${f.cliente}`)}
                {f.estado === 'pasada' && 'Ya pasó'}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
