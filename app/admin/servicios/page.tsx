'use client';

import { useState, useEffect } from 'react';
import { crearClienteNavegador } from '@/lib/supabase-client';
import Link from 'next/link';

type Servicio = {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  activo: boolean;
};

export default function ServiciosPage() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  const supabase = crearClienteNavegador();

  async function cargarServicios() {
    const { data } = await supabase
      .from('services')
      .select('id, nombre, descripcion, precio, activo')
      .eq('activo', true)
      .order('nombre');
    setServicios((data ?? []) as Servicio[]);
  }

  useEffect(() => {
    cargarServicios();
  }, []);

  async function crear() {
    if (nombre.trim() === '' || precio.trim() === '') {
      setError('Nombre y precio son obligatorios.');
      return;
    }
    setCargando(true);
    setError(null);

    const res = await fetch('/api/admin/servicios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, descripcion, precio }),
    });

    setCargando(false);
    if (!res.ok) {
      setError('No se pudo crear el servicio. Revisa el precio.');
      return;
    }
    setNombre('');
    setDescripcion('');
    setPrecio('');
    setMostrarForm(false);
    cargarServicios();
  }

  async function desactivar(id: string, nombreServicio: string) {
    const confirmado = window.confirm(
      `¿Seguro que quieres desactivar "${nombreServicio}"? Dejará de aparecer en las reservas.`
    );
    if (!confirmado) return;

    const res = await fetch('/api/admin/servicios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) cargarServicios();
  }

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 20, color: '#1F3864' }}>
      <Link href="/admin" style={{ color: '#1F3864' }}>
        ← Volver a la agenda
      </Link>
      <h1>Servicios</h1>

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
          + Nuevo servicio
        </button>
      )}

      {mostrarForm && (
      <>
      {/* Crear */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
        <input
          placeholder="Nombre del servicio"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          style={{ padding: 12, borderRadius: 8, border: '1px solid #ccc' }}
        />
        <input
          placeholder="Descripción (opcional)"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          style={{ padding: 12, borderRadius: 8, border: '1px solid #ccc' }}
        />
        <input
          placeholder="Precio (ej. 25000)"
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
          inputMode="numeric"
          style={{ padding: 12, borderRadius: 8, border: '1px solid #ccc' }}
        />
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
          {cargando ? 'Agregando...' : 'Agregar servicio'}
        </button>
      </div>
{error && <p style={{ color: '#c0392b' }}>{error}</p>}
      </>
      )}

      {/* Lista */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 24 }}>
        {servicios.length === 0 ? (
          <p>No hay servicios activos.</p>
        ) : (
          servicios.map((s) => (
            <div
              key={s.id}
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
              <div>
                <strong>{s.nombre}</strong>
                {s.descripcion && (
                  <div style={{ fontSize: 14, color: '#555' }}>{s.descripcion}</div>
                )}
                <div>${s.precio.toLocaleString('es-CO')}</div>
              </div>
              <button
                onClick={() => desactivar(s.id, s.nombre)}
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