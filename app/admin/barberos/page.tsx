'use client';

import { useState, useEffect } from 'react';
import { crearClienteNavegador } from '@/lib/supabase-client';
import Link from 'next/link';

type Barbero = {
  id: string;
  nombre: string;
  descripcion: string | null;
  foto_url: string | null;
  email: string | null;
};

type ClaveEntregada = { nombre: string; email: string; clave: string };

const ERRORES: Record<string, string> = {
  email_repetido: 'Ya existe un barbero con ese correo.',
  email_requerido: 'El correo del barbero es obligatorio y debe ser válido.',
  error_crear_cuenta: 'No se pudo crear la cuenta de acceso. Intenta de nuevo.',
};

export default function BarberosPage() {
  const [barberos, setBarberos] = useState<Barbero[]>([]);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [email, setEmail] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [claveEntregada, setClaveEntregada] = useState<ClaveEntregada | null>(null);
  const [copiado, setCopiado] = useState(false);

  const supabase = crearClienteNavegador();

  async function cargarBarberos() {
    const res = await fetch('/api/admin/barberos');
    if (!res.ok) return;
    const data = await res.json();
    setBarberos(data.barberos as Barbero[]);
  }

  useEffect(() => {
    fetch('/api/admin/barberos')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setBarberos(data.barberos as Barbero[]));
  }, []);

  async function crear() {
    if (nombre.trim() === '') {
      setError('El nombre es obligatorio.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setError('El correo del barbero es obligatorio y debe ser válido.');
      return;
    }
    setCargando(true);
    setError(null);

    let foto_url: string | null = null;

    if (archivo) {
      const nombreArchivo = `${Date.now()}-${archivo.name.replace(/\s/g, '_')}`;
      const { error: errSubida } = await supabase.storage
        .from('barberos')
        .upload(nombreArchivo, archivo);

      if (errSubida) {
        setCargando(false);
        setError('No se pudo subir la foto. Intenta de nuevo.');
        return;
      }

      const { data: urlData } = supabase.storage
        .from('barberos')
        .getPublicUrl(nombreArchivo);
      foto_url = urlData.publicUrl;
    }

    const res = await fetch('/api/admin/barberos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, descripcion, foto_url, email }),
    });
    const data = await res.json().catch(() => ({}));

    setCargando(false);
    if (!res.ok) {
      setError(ERRORES[data.error] ?? 'No se pudo crear el barbero.');
      return;
    }
    if (data.claveTemporal) {
      setClaveEntregada({ nombre: nombre.trim(), email: email.trim().toLowerCase(), clave: data.claveTemporal });
      setCopiado(false);
    }
    setNombre('');
    setDescripcion('');
    setEmail('');
    setArchivo(null);
    setMostrarForm(false);
    cargarBarberos();
  }

  async function restablecerClave(b: Barbero) {
    const confirmado = window.confirm(
      `Se generará una contraseña temporal nueva para ${b.nombre}. La anterior dejará de funcionar. ¿Continuar?`
    );
    if (!confirmado) return;

    setError(null);
    const res = await fetch('/api/admin/barberos/clave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: b.id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(
        data.error === 'es_duenio'
          ? 'La contraseña del dueño la cambia él mismo desde Supabase.'
          : 'No se pudo restablecer la contraseña.'
      );
      return;
    }
    setClaveEntregada({ nombre: b.nombre, email: b.email ?? '', clave: data.claveTemporal });
    setCopiado(false);
  }

  async function desactivar(id: string, nombreBarbero: string) {
    const confirmado = window.confirm(
      `¿Seguro que quieres desactivar a ${nombreBarbero}? Dejará de aparecer en las reservas y su acceso al panel se bloqueará.`
    );
    if (!confirmado) return;

    const res = await fetch('/api/admin/barberos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) cargarBarberos();
  }

  async function copiarClave() {
    if (!claveEntregada) return;
    try {
      await navigator.clipboard.writeText(claveEntregada.clave);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white py-10 px-4">
      <div className="max-w-xl mx-auto">
        <Link href="/admin" className="text-neutral-400 hover:text-amber-400 transition text-sm">
          ← Volver a la agenda
        </Link>
        <h1 className="font-[family-name:var(--font-oswald)] uppercase tracking-wide text-3xl font-bold text-amber-400 mt-2 mb-6">
          Barberos
        </h1>

        {claveEntregada && (
          <div className="mb-6 bg-neutral-900 border border-amber-400 rounded-xl p-4">
            <p className="font-bold text-amber-400 mb-1">Acceso de {claveEntregada.nombre}</p>
            <p className="text-sm text-neutral-300">Correo: {claveEntregada.email}</p>
            <p className="text-sm text-neutral-300 mb-2">Contraseña temporal:</p>
            <div className="flex gap-2 items-center">
              <code className="flex-1 p-3 rounded-lg bg-neutral-950 border border-neutral-700 text-amber-300 select-all">
                {claveEntregada.clave}
              </code>
              <button
                onClick={copiarClave}
                className="px-4 py-3 rounded-lg border border-neutral-700 text-neutral-200 hover:border-amber-400 transition"
              >
                {copiado ? 'Copiada' : 'Copiar'}
              </button>
            </div>
            <p className="text-xs text-red-400 mt-2">
              Se muestra solo ahora. Entrégasela al barbero; no se puede volver a ver (solo restablecer).
            </p>
            <button
              onClick={() => setClaveEntregada(null)}
              className="mt-3 text-sm text-neutral-400 hover:text-white transition"
            >
              Ya la entregué, cerrar
            </button>
          </div>
        )}

        {!mostrarForm && (
          <button
            onClick={() => setMostrarForm(true)}
            className="mb-6 px-5 py-3 rounded-xl border border-amber-400 text-amber-400 font-bold hover:bg-amber-400 hover:text-neutral-950 transition"
          >
            + Nuevo barbero
          </button>
        )}

        {mostrarForm && (
          <div className="flex flex-col gap-3 mb-6 bg-neutral-900 border border-neutral-800 rounded-xl p-4">
            <input
              placeholder="Nombre del barbero"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="p-3 rounded-xl bg-neutral-950 border border-neutral-700 text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
            />
            <textarea
              placeholder="Descripción (ej. Especialista en cortes clásicos)"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              className="p-3 rounded-xl bg-neutral-950 border border-neutral-700 text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none resize-y"
            />
            <input
              type="email"
              placeholder="Correo del barbero (obligatorio: login y avisos de reservas)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="p-3 rounded-xl bg-neutral-950 border border-neutral-700 text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
            />
            <p className="text-xs text-neutral-500">
              Se creará su cuenta de acceso con una contraseña temporal que verás una sola vez.
            </p>
            <label className="text-sm text-neutral-400">
              Foto del barbero:
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                className="block mt-1 text-neutral-300"
              />
            </label>
            <div className="flex gap-2">
              <button
                onClick={crear}
                disabled={cargando}
                className="flex-1 py-3 rounded-xl bg-amber-400 text-neutral-950 font-bold hover:bg-amber-300 transition disabled:opacity-60"
              >
                {cargando ? 'Guardando...' : 'Agregar barbero'}
              </button>
              <button
                onClick={() => setMostrarForm(false)}
                className="px-4 py-3 rounded-xl border border-neutral-700 text-neutral-300 hover:border-neutral-500 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
        {error && <p className="text-red-400 mb-4">{error}</p>}

        <div className="flex flex-col gap-3">
          {barberos.length === 0 ? (
            <p className="text-neutral-400">No hay barberos activos.</p>
          ) : (
            barberos.map((b) => (
              <div
                key={b.id}
                className="flex justify-between items-center gap-3 p-4 rounded-xl border border-neutral-800 bg-neutral-900"
              >
                <div className="flex items-center gap-4 min-w-0">
                  {b.foto_url ? (
                    <img src={b.foto_url} alt={b.nombre} className="w-12 h-12 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-neutral-700 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="font-bold">{b.nombre}</div>
                    {b.descripcion && <div className="text-sm text-neutral-400">{b.descripcion}</div>}
                    {b.email ? (
                      <div className="text-xs text-neutral-500 truncate">{b.email}</div>
                    ) : (
                      <div className="text-xs text-red-400">Sin correo: no recibirá avisos ni podrá entrar</div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  {b.email && (
                    <button
                      onClick={() => restablecerClave(b)}
                      className="text-sm px-3 py-2 rounded-lg border border-neutral-700 text-neutral-300 hover:border-amber-400 hover:text-amber-400 transition"
                    >
                      Restablecer clave
                    </button>
                  )}
                  <button
                    onClick={() => desactivar(b.id, b.nombre)}
                    className="text-sm px-3 py-2 rounded-lg border border-red-500 text-red-400 hover:bg-red-500 hover:text-white transition"
                  >
                    Desactivar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
