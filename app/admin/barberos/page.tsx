'use client';

import { useState, useEffect } from 'react';
import { crearClienteNavegador } from '@/lib/supabase-client';
import Link from 'next/link';

type Barbero = {
  id: string;
  nombre: string;
  descripcion: string | null;
  foto_url: string | null;
  activo: boolean;
};

export default function BarberosPage() {
  const [barberos, setBarberos] = useState<Barbero[]>([]);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  const supabase = crearClienteNavegador();

  async function cargarBarberos() {
    const { data } = await supabase
      .from('barbers')
      .select('id, nombre, descripcion, foto_url, activo')
      .eq('activo', true)
      .order('nombre');
    setBarberos((data ?? []) as Barbero[]);
  }

  useEffect(() => {
    cargarBarberos();
  }, []);

  async function crear() {
    if (nombre.trim() === '') {
      setError('El nombre es obligatorio.');
      return;
    }
    setCargando(true);
    setError(null);

    let foto_url: string | null = null;

    // 1. Si hay archivo, subirlo a Storage
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

      // 2. Obtener la URL pública
      const { data: urlData } = supabase.storage
        .from('barberos')
        .getPublicUrl(nombreArchivo);
      foto_url = urlData.publicUrl;
    }

    // 3. Crear el barbero (vía API route)
    const res = await fetch('/api/admin/barberos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, descripcion, foto_url }),
    });

    setCargando(false);
    if (!res.ok) {
      setError('No se pudo crear el barbero.');
      return;
    }
    setNombre('');
    setDescripcion('');
    setArchivo(null);
    setMostrarForm(false);
    cargarBarberos();
  }

  async function desactivar(id: string, nombreBarbero: string) {
    const confirmado = window.confirm(
      `¿Seguro que quieres desactivar a ${nombreBarbero}? Dejará de aparecer en las reservas.`
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
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 20, color: '#1F3864' }}>
      <Link href="/admin" style={{ color: '#1F3864' }}>
        ← Volver a la agenda
      </Link>
      <h1>Barberos</h1>

{!mostrarForm && (
        <button
          onClick={() => setMostrarForm(true)}
          style={{
            marginTop: 16,
            padding: '12px 20px',
            borderRadius: 8,
            border: '1px solid #1F3864',
            background: '#fff',
            color: '#1F3864',
            cursor: 'pointer',
          }}
        >
          + Nuevo barbero
        </button>
      )}

      {mostrarForm && (
      <>
      {/* Crear */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
        <input
          placeholder="Nombre del barbero"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          style={{ padding: 12, borderRadius: 8, border: '1px solid #ccc' }}
        />
        <textarea
          placeholder="Descripción (ej. Especialista en cortes clásicos)"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={2}
          style={{ padding: 12, borderRadius: 8, border: '1px solid #ccc', resize: 'vertical' }}
        />
        <label style={{ fontSize: 14, color: '#555' }}>
          Foto del barbero:
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            style={{ display: 'block', marginTop: 4 }}
          />
        </label>
        <button
          onClick={crear}
          disabled={cargando}
          style={{
            padding: '12px 20px',
            borderRadius: 8,
            border: 'none',
            background: '#1F3864',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          {cargando ? 'Guardando...' : 'Agregar barbero'}
        </button>
      </div>
{error && <p style={{ color: '#c0392b' }}>{error}</p>}
      </>
      )}

      {/* Lista */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 24 }}>
        {barberos.length === 0 ? (
          <p>No hay barberos activos.</p>
        ) : (
          barberos.map((b) => (
            <div
              key={b.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 14,
                borderRadius: 8,
                border: '1px solid #ccc',
                background: '#fff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {b.foto_url && (
                  <img
                    src={b.foto_url}
                    alt={b.nombre}
                    style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
                  />
                )}
                <div>
                  <strong>{b.nombre}</strong>
                  {b.descripcion && (
                    <div style={{ fontSize: 14, color: '#555' }}>{b.descripcion}</div>
                  )}
                </div>
              </div>
              <button
                onClick={() => desactivar(b.id, b.nombre)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1px solid #c0392b',
                  background: '#fff',
                  color: '#c0392b',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                Desactivar
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}