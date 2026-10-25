'use client';

import { useState } from 'react';
import { useFeedback } from '@/app/components/Feedback';

const ERRORES: Record<string, string> = {
  clave_actual_incorrecta: 'La contraseña actual no es correcta.',
  clave_debil: 'La nueva contraseña debe tener al menos 10 caracteres, con letras y números.',
  clave_igual: 'La nueva contraseña debe ser distinta de la actual.',
  demasiados_intentos: 'Demasiados intentos. Espera unos minutos e intenta de nuevo.',
};

const estiloInput =
  'p-3 rounded-xl bg-neutral-950 border border-neutral-700 text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none';

export default function CambiarClaveForm() {
  const { avisar } = useFeedback();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setError(null);
    if (nueva !== repetir) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch('/api/cuenta/clave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actual, nueva }),
      });
      const data = await res.json().catch(() => ({}));
      setGuardando(false);
      if (!res.ok) {
        setError(ERRORES[data.error] ?? 'No se pudo cambiar la contraseña. Intenta de nuevo.');
        return;
      }
      setActual('');
      setNueva('');
      setRepetir('');
      avisar('Contraseña actualizada.');
    } catch {
      setGuardando(false);
      setError('No se pudo conectar. Intenta de nuevo.');
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        type="password"
        autoComplete="current-password"
        placeholder="Contraseña actual"
        value={actual}
        onChange={(e) => setActual(e.target.value)}
        className={estiloInput}
      />
      <input
        type="password"
        autoComplete="new-password"
        placeholder="Nueva contraseña (mín. 10, con letras y números)"
        value={nueva}
        onChange={(e) => setNueva(e.target.value)}
        className={estiloInput}
      />
      <input
        type="password"
        autoComplete="new-password"
        placeholder="Repite la nueva contraseña"
        value={repetir}
        onChange={(e) => setRepetir(e.target.value)}
        className={estiloInput}
      />
      {error && (
        <p role="alert" className="text-red-400 text-sm">
          {error}
        </p>
      )}
      <button
        onClick={guardar}
        disabled={guardando || !actual || !nueva || !repetir}
        className="mt-2 w-full py-4 rounded-xl bg-amber-400 text-neutral-950 font-bold uppercase tracking-wide hover:bg-amber-300 transition disabled:opacity-60"
      >
        {guardando ? 'Guardando...' : 'Guardar contraseña'}
      </button>
    </div>
  );
}
