'use client';

import { useState, useEffect } from 'react';
import { crearClienteNavegador } from '@/lib/supabase-client';
import BotonVolver from '@/app/components/BotonVolver';

type Servicio = {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  duracion_min: number;
  activo: boolean;
};

export default function ServiciosPage() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [duracion, setDuracion] = useState('60');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const supabase = crearClienteNavegador();

  async function cargarServicios() {
    const { data } = await supabase
      .from('services')
      .select('id, nombre, descripcion, precio, duracion_min, activo')
      .eq('activo', true)
      .order('nombre');
    setServicios((data ?? []) as Servicio[]);
  }

  useEffect(() => {
    crearClienteNavegador()
      .from('services')
      .select('id, nombre, descripcion, precio, duracion_min, activo')
      .eq('activo', true)
      .order('nombre')
      .then(({ data }) => setServicios((data ?? []) as Servicio[]));
  }, []);

  function abrirNuevo() {
    setEditandoId(null);
    setNombre('');
    setDescripcion('');
    setPrecio('');
    setDuracion('60');
    setError(null);
    setMostrarForm(true);
  }

  function abrirEdicion(s: Servicio) {
    setEditandoId(s.id);
    setNombre(s.nombre);
    setDescripcion(s.descripcion ?? '');
    setPrecio(String(s.precio));
    setDuracion(String(s.duracion_min));
    setError(null);
    setMostrarForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function guardar() {
    if (nombre.trim() === '' || precio.trim() === '') {
      setError('Nombre y precio son obligatorios.');
      return;
    }
    const min = Number(duracion);
    if (!Number.isInteger(min) || min < 10 || min > 240 || min % 5 !== 0) {
      setError('La duración debe estar entre 10 y 240 minutos, de 5 en 5.');
      return;
    }
    setCargando(true);
    setError(null);

    const res = await fetch('/api/admin/servicios', {
      method: editandoId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editandoId, nombre, descripcion, precio, duracion_min: Number(duracion) }),
    });

    setCargando(false);
    if (!res.ok) {
      setError(
        editandoId
          ? 'No se pudo guardar el cambio. Revisa el precio.'
          : 'No se pudo crear el servicio. Revisa el precio.'
      );
      return;
    }
    setNombre('');
    setDescripcion('');
    setPrecio('');
    setDuracion('60');
    setEditandoId(null);
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
    <main className="py-8 px-4">
      <div className="max-w-xl mx-auto">
        <BotonVolver href="/admin">Volver a la agenda</BotonVolver>
        <h1 className="font-[family-name:var(--font-oswald)] uppercase tracking-wide text-3xl font-bold text-amber-400 mt-5 mb-6">
          Servicios
        </h1>

        {!mostrarForm && (
          <button
            onClick={abrirNuevo}
            className="mb-6 px-5 py-3 rounded-xl border border-amber-400 text-amber-400 font-bold hover:bg-amber-400 hover:text-neutral-950 transition"
          >
            + Nuevo servicio
          </button>
        )}

        {mostrarForm && (
          <div className="flex flex-col gap-3 mb-6 bg-neutral-900 border border-neutral-800 rounded-xl p-4">
            {editandoId && <p className="font-bold text-amber-400">Editando servicio</p>}
            <input
              placeholder="Nombre del servicio"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="p-3 rounded-xl bg-neutral-950 border border-neutral-700 text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
            />
            <input
              placeholder="Descripción (opcional)"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="p-3 rounded-xl bg-neutral-950 border border-neutral-700 text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
            />
            <input
              placeholder="Precio (ej. 25000)"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              inputMode="numeric"
              className="p-3 rounded-xl bg-neutral-950 border border-neutral-700 text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
            />
            <label className="text-sm text-neutral-400">
              Duración en minutos (de 10 a 240, de 5 en 5):
              <input
                type="number"
                min={10}
                max={240}
                step={5}
                value={duracion}
                onChange={(e) => setDuracion(e.target.value)}
                className="mt-1 w-full p-3 rounded-xl bg-neutral-950 border border-neutral-700 text-white focus:border-amber-400 focus:outline-none"
              />
            </label>
            <div className="flex gap-2">
              <button
                onClick={guardar}
                disabled={cargando}
                className="flex-1 py-3 rounded-xl bg-amber-400 text-neutral-950 font-bold hover:bg-amber-300 transition disabled:opacity-60"
              >
                {cargando ? 'Guardando...' : editandoId ? 'Guardar cambios' : 'Agregar servicio'}
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
          {servicios.length === 0 ? (
            <p className="text-neutral-400">No hay servicios activos.</p>
          ) : (
            servicios.map((s) => (
              <div
                key={s.id}
                className="flex justify-between items-center p-4 rounded-xl border border-neutral-800 bg-neutral-900"
              >
                <div>
                  <div className="font-bold">{s.nombre}</div>
                  {s.descripcion && <div className="text-sm text-neutral-400">{s.descripcion}</div>}
                  <div className="text-amber-400">
                    ${s.precio.toLocaleString('es-CO')}
                    <span className="text-neutral-500"> · {s.duracion_min} min</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => abrirEdicion(s)}
                    className="text-sm px-3 py-2 rounded-lg border border-neutral-700 text-neutral-300 hover:border-amber-400 hover:text-amber-400 transition"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => desactivar(s.id, s.nombre)}
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