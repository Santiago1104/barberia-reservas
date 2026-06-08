'use client';

import { useState } from 'react';

export default function CancelarCliente({
  token,
  estado,
  fecha,
  hora,
  nombreCliente,
  barbero,
  servicio,
}: {
  token: string;
  estado: string;
  fecha: string;
  hora: string;
  nombreCliente: string;
  barbero: string;
  servicio: string;
}) {
  const [cancelando, setCancelando] = useState(false);
  const [resultado, setResultado] = useState<'ok' | string | null>(
    estado === 'cancelada' ? 'ya_cancelada' : null
  );

  async function cancelar() {
    setCancelando(true);
    try {
      const res = await fetch('/api/cancelar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      setCancelando(false);
      setResultado(res.ok ? 'ok' : data.error);
    } catch {
      setCancelando(false);
      setResultado('error_conexion');
    }
  }

  // Ya cancelada (antes o ahora)
  if (resultado === 'ok' || resultado === 'ya_cancelada') {
    return (
      <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center">
          <h1 className="font-[family-name:var(--font-oswald)] uppercase tracking-wide text-2xl font-bold text-amber-400 mb-4">
            Reserva cancelada
          </h1>
          <p className="text-neutral-300">
            {resultado === 'ok'
              ? 'Tu cita fue cancelada correctamente.'
              : 'Esta cita ya estaba cancelada.'}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
        <h1 className="font-[family-name:var(--font-oswald)] uppercase tracking-wide text-2xl font-bold text-amber-400 mb-6 text-center">
          Cancelar reserva
        </h1>

        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 mb-6">
          <p className="text-neutral-300 mb-2">Hola {nombreCliente}, esta es tu cita:</p>
          <p className="text-white font-bold">{barbero} — {servicio}</p>
          <p className="text-neutral-400 text-sm">{fecha} a las {hora}</p>
        </div>

        {resultado === 'fuera_de_plazo' && (
          <p className="text-red-400 text-sm mb-4">
            Ya no es posible cancelar (debe hacerse al menos 30 minutos antes). Por favor comunícate con la barbería.
          </p>
        )}
        {(resultado === 'error_cancelar' || resultado === 'error_conexion') && (
          <p className="text-red-400 text-sm mb-4">Ocurrió un error. Intenta de nuevo.</p>
        )}

        <button
          onClick={cancelar}
          disabled={cancelando}
          className="w-full py-4 rounded-xl bg-red-600 text-white font-bold uppercase tracking-wide hover:bg-red-500 transition disabled:opacity-60"
        >
          {cancelando ? 'Cancelando...' : 'Sí, cancelar mi cita'}
        </button>
      </div>
    </main>
  );
}