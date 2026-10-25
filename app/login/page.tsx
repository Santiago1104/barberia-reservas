'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase-client';
import BotonVolver from '@/app/components/BotonVolver';

const estiloInput =
  'p-3 rounded-xl bg-neutral-950 border border-neutral-700 text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none transition-colors';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function iniciarSesion(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);

    const supabase = crearClienteNavegador();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

    if (error) {
      setCargando(false);
      setError('Correo o contraseña incorrectos.');
      return;
    }
    router.push('/admin');
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6 gap-5">
      <div className="max-w-sm w-full">
        <BotonVolver href="/">Volver al inicio</BotonVolver>
      </div>
      <div className="anim-entrar max-w-sm w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
        <h1 className="font-[family-name:var(--font-oswald)] uppercase tracking-wide text-2xl font-bold text-amber-400 mb-6 text-center">
          Acceso barbero
        </h1>
        <form onSubmit={iniciarSesion} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-neutral-300">
            Correo
            <input
              type="email"
              inputMode="email"
              autoComplete="username"
              required
              placeholder="tucorreo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={estiloInput}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-neutral-300">
            Contraseña
            <input
              type="password"
              autoComplete="current-password"
              required
              placeholder="Tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={estiloInput}
            />
          </label>
          {error && (
            <p role="alert" className="anim-aparecer text-red-400 text-sm">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={cargando}
            className="presionable mt-2 w-full py-4 rounded-xl bg-amber-400 text-neutral-950 font-bold uppercase tracking-wide hover:bg-amber-300 disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {cargando && (
              <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            )}
            {cargando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  );
}
