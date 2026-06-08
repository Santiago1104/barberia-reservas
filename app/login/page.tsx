'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function iniciarSesion() {
    setCargando(true);
    setError(null);

    const supabase = crearClienteNavegador();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setCargando(false);

    if (error) {
      setError('Correo o contraseña incorrectos.');
      return;
    }

    router.push('/admin');
    router.refresh();
  }

  return (
    <div style={{ maxWidth: 360, margin: '80px auto', padding: 20, color: '#1F3864' }}>
      <h1>Ingreso barbero</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
        <input
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: 12, borderRadius: 8, border: '1px solid #ccc' }}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: 12, borderRadius: 8, border: '1px solid #ccc' }}
        />
        {error && <p style={{ color: '#c0392b' }}>{error}</p>}
        <button
          onClick={iniciarSesion}
          disabled={cargando}
          style={{
            padding: '14px 24px',
            borderRadius: 8,
            border: 'none',
            background: '#1F3864',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 16,
          }}
        >
          {cargando ? 'Entrando...' : 'Entrar'}
        </button>
      </div>
    </div>
  );
}