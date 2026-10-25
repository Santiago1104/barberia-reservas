'use client';

import { useState, useEffect } from 'react';
import { crearClienteNavegador } from '@/lib/supabase-client';
import BotonVolver from '@/app/components/BotonVolver';

type Barbero = {
  id: string;
  nombre: string;
  descripcion: string | null;
  foto_url: string | null;
  email: string | null;
};

const ERRORES: Record<string, string> = {
  email_repetido: 'Ya existe un barbero con ese correo.',
  email_requerido: 'El correo del barbero es obligatorio y debe ser válido.',
  clave_debil: 'La contraseña debe tener al menos 10 caracteres, con letras y números.',
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
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [clave, setClave] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);
  const [restableciendo, setRestableciendo] = useState<Barbero | null>(null);
  const [claveNueva, setClaveNueva] = useState('');

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

  function abrirNuevo() {
    setEditandoId(null);
    setNombre('');
    setDescripcion('');
    setEmail('');
    setClave('');
    setArchivo(null);
    setError(null);
    setAviso(null);
    setMostrarForm(true);
  }

  function abrirEdicion(b: Barbero) {
    setEditandoId(b.id);
    setNombre(b.nombre);
    setDescripcion(b.descripcion ?? '');
    setArchivo(null);
    setError(null);
    setAviso(null);
    setMostrarForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function guardar() {
    if (nombre.trim() === '') {
      setError('El nombre es obligatorio.');
      return;
    }
    if (!editandoId && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setError('El correo del barbero es obligatorio y debe ser válido.');
      return;
    }
    if (!editandoId && (clave.length < 10 || !/[A-Za-z]/.test(clave) || !/\d/.test(clave))) {
      setError(ERRORES.clave_debil);
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
      method: editandoId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editandoId, nombre, descripcion, foto_url, email, clave }),
    });
    const data = await res.json().catch(() => ({}));

    setCargando(false);
    if (!res.ok) {
      setError(ERRORES[data.error] ?? 'No se pudo guardar el barbero.');
      return;
    }
    setAviso(
      editandoId
        ? 'Cambios guardados.'
        : `Barbero creado. Puede entrar con ${email.trim().toLowerCase()} y la contraseña que definiste.`
    );
    setEditandoId(null);
    setNombre('');
    setDescripcion('');
    setEmail('');
    setClave('');
    setArchivo(null);
    setMostrarForm(false);
    cargarBarberos();
  }

  async function guardarClaveNueva() {
    if (!restableciendo) return;
    setError(null);
    const res = await fetch('/api/admin/barberos/clave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: restableciendo.id, clave: claveNueva }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(
        data.error === 'es_duenio'
          ? 'El dueño cambia su contraseña desde «Mi cuenta».'
          : ERRORES[data.error] ?? 'No se pudo cambiar la contraseña.'
      );
      return;
    }
    setAviso(`Contraseña de ${restableciendo.nombre} actualizada.`);
    setRestableciendo(null);
    setClaveNueva('');
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

  return (
    <main className="py-8 px-4">
      <div className="max-w-xl mx-auto">
        <BotonVolver href="/admin">Volver a la agenda</BotonVolver>
        <h1 className="font-[family-name:var(--font-oswald)] uppercase tracking-wide text-3xl font-bold text-amber-400 mt-5 mb-6">
          Barberos
        </h1>

        {aviso && <p className="mb-4 text-amber-400 text-sm">{aviso}</p>}

        {restableciendo && (
          <div className="mb-6 flex flex-col gap-3 bg-neutral-900 border border-amber-400 rounded-xl p-4">
            <p className="font-bold text-amber-400">Nueva contraseña para {restableciendo.nombre}</p>
            <input
              type="text"
              autoComplete="off"
              placeholder="Mín. 10 caracteres, con letras y números"
              value={claveNueva}
              onChange={(e) => setClaveNueva(e.target.value)}
              className="p-3 rounded-xl bg-neutral-950 border border-neutral-700 text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={guardarClaveNueva}
                className="flex-1 py-3 rounded-xl bg-amber-400 text-neutral-950 font-bold hover:bg-amber-300 transition"
              >
                Guardar contraseña
              </button>
              <button
                onClick={() => {
                  setRestableciendo(null);
                  setClaveNueva('');
                }}
                className="px-4 py-3 rounded-xl border border-neutral-700 text-neutral-300 hover:border-neutral-500 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {!mostrarForm && (
          <button
            onClick={abrirNuevo}
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
            {editandoId ? (
              <p className="text-xs text-neutral-500">
                El correo no se puede cambiar. Si quiere otra contraseña, usa «Cambiar clave».
              </p>
            ) : (
              <>
            <input
              type="email"
              placeholder="Correo del barbero (obligatorio: login y avisos de reservas)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="p-3 rounded-xl bg-neutral-950 border border-neutral-700 text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
            />
            <input
              type="text"
              autoComplete="off"
              placeholder="Contraseña del barbero (mín. 10, con letras y números)"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              className="p-3 rounded-xl bg-neutral-950 border border-neutral-700 text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
            />
            <p className="text-xs text-neutral-500">
              Con este correo y contraseña el barbero podrá entrar. Después puede cambiarla desde «Mi cuenta».
            </p>
              </>
            )}
            <label className="text-sm text-neutral-400">
              {editandoId ? 'Nueva foto (opcional):' : 'Foto del barbero:'}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                className="block mt-1 text-neutral-300"
              />
            </label>
            <div className="flex gap-2">
              <button
                onClick={guardar}
                disabled={cargando}
                className="flex-1 py-3 rounded-xl bg-amber-400 text-neutral-950 font-bold hover:bg-amber-300 transition disabled:opacity-60"
              >
                {cargando ? 'Guardando...' : editandoId ? 'Guardar cambios' : 'Agregar barbero'}
              </button>
              <button
                onClick={() => {
                  setMostrarForm(false);
                  setEditandoId(null);
                }}
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
                  <button
                    onClick={() => abrirEdicion(b)}
                    className="text-sm px-3 py-2 rounded-lg border border-neutral-700 text-neutral-300 hover:border-amber-400 hover:text-amber-400 transition"
                  >
                    Editar
                  </button>
                  {b.email && (
                    <button
                      onClick={() => {
                        setRestableciendo(b);
                        setClaveNueva('');
                        setAviso(null);
                      }}
                      className="text-sm px-3 py-2 rounded-lg border border-neutral-700 text-neutral-300 hover:border-amber-400 hover:text-amber-400 transition"
                    >
                      Cambiar clave
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
