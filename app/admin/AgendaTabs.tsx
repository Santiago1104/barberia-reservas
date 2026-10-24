'use client';

import { useState } from 'react';
import type { Cita, BarberoOpcion } from './page';
import { hora12, fechaBonita } from '@/lib/formato';

type Vista = 'hoy' | 'proximas' | 'anteriores';

function fechaHoraDe(cita: Cita): Date {
  const [año, mes, dia] = cita.fecha.split('-').map(Number);
  const [h, m] = cita.hora.split(':').map(Number);
  return new Date(año, mes - 1, dia, h, m, 0, 0);
}

function esMismoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function AgendaTabs({
  citas,
  barberos,
}: {
  citas: Cita[];
  barberos: BarberoOpcion[];
}) {
  const [vista, setVista] = useState<Vista>('hoy');
  const [barberoFiltro, setBarberoFiltro] = useState<string>('todos');
  const ahora = new Date();

  // Filtrar por barbero antes de clasificar
  const citasFiltradas =
    barberoFiltro === 'todos'
      ? citas
      : citas.filter((c) => c.barber_id === barberoFiltro);

  const hoy: Cita[] = [];
  const proximas: Cita[] = [];
  const anteriores: Cita[] = [];

  for (const cita of citasFiltradas) {
    const cuando = fechaHoraDe(cita);
    if (cuando < ahora) {
      anteriores.push(cita);
    } else if (esMismoDia(cuando, ahora)) {
      hoy.push(cita);
    } else {
      proximas.push(cita);
    }
  }

  anteriores.reverse();

  const grupos = { hoy, proximas, anteriores };
  const citasMostradas = grupos[vista];

  const tabs: { clave: Vista; etiqueta: string; cantidad: number }[] = [
    { clave: 'hoy', etiqueta: 'Hoy', cantidad: hoy.length },
    { clave: 'proximas', etiqueta: 'Próximas', cantidad: proximas.length },
    { clave: 'anteriores', etiqueta: 'Anteriores', cantidad: anteriores.length },
  ];

  return (
    <div>
      {/* Filtro de barbero */}
      <div className="mb-5">
        <label className="text-neutral-400 text-sm block mb-1">Barbero:</label>
        <select
          value={barberoFiltro}
          onChange={(e) => setBarberoFiltro(e.target.value)}
          className="w-full p-3 rounded-xl bg-neutral-900 border border-neutral-700 text-white focus:border-amber-400 focus:outline-none"
        >
          <option value="todos">Todos los barberos</option>
          {barberos.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* Pestañas */}
      <div className="flex gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.clave}
            onClick={() => setVista(t.clave)}
            className={`px-4 py-2 rounded-lg border text-sm transition ${
              vista === t.clave
                ? 'border-amber-400 bg-amber-400 text-neutral-950 font-bold'
                : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
            }`}
          >
            {t.etiqueta} ({t.cantidad})
          </button>
        ))}
      </div>

      {citasMostradas.length === 0 ? (
        <p className="text-neutral-400">
          {vista === 'hoy'
            ? 'No tienes más citas hoy.'
            : vista === 'proximas'
            ? 'No tienes citas próximas.'
            : 'No hay citas anteriores.'}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {citasMostradas.map((cita) => (
            <div
              key={cita.id}
              className={`p-4 rounded-xl border border-neutral-800 bg-neutral-900 ${
                vista === 'anteriores' ? 'opacity-60' : ''
              }`}
            >
              <div className="font-bold text-amber-400">
                {fechaBonita(cita.fecha)} — {hora12(cita.hora)}
              </div>
              <div className="mt-1">Cliente: {cita.nombre_cliente}</div>
              <div className="text-neutral-300">Barbero: {cita.barbers?.nombre ?? '—'}</div>
              <div className="text-neutral-300">
                Servicio: {cita.services?.nombre ?? '—'}
                {cita.services?.precio
                  ? ` ($${cita.services.precio.toLocaleString('es-CO')})`
                  : ''}
              </div>
              <div className="text-neutral-500 text-sm mt-1">
                Tel: {cita.telefono_cliente} · {cita.email_cliente}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}