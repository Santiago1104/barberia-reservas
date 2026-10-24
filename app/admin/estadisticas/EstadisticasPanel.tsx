'use client';

import { useState } from 'react';
import type { CitaStat, BarberoOpcion } from './page';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

type Periodo = 'hoy' | 'semana' | 'mes';

function fechaLocal(fecha: string): Date {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(a, m - 1, d);
}

export default function EstadisticasPanel({
  citas,
  barberos,
}: {
  citas: CitaStat[];
  barberos: BarberoOpcion[];
}) {
  const [periodo, setPeriodo] = useState<Periodo>('semana');
  const [barberoFiltro, setBarberoFiltro] = useState<string>('todos');

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const inicio = new Date(hoy);
  if (periodo === 'semana') inicio.setDate(hoy.getDate() - 6);
  if (periodo === 'mes') inicio.setDate(hoy.getDate() - 29);

  // Filtrar por barbero primero
  const citasBarbero =
    barberoFiltro === 'todos'
      ? citas
      : citas.filter((c) => c.barber_id === barberoFiltro);

  // Luego por período
  const enPeriodo = citasBarbero.filter((c) => {
    const f = fechaLocal(c.fecha);
    return f >= inicio && f <= hoy;
  });

  const confirmadas = enPeriodo.filter((c) => c.estado === 'confirmada');
  const canceladas = enPeriodo.filter((c) => c.estado === 'cancelada');
  const total = confirmadas.length + canceladas.length;
  const porcentajeCancelacion = total > 0 ? Math.round((canceladas.length / total) * 100) : 0;
  const ingresos = confirmadas.reduce((suma, c) => suma + (c.services?.precio ?? 0), 0);

  const dias: { etiqueta: string; citas: number }[] = [];
  const numDias = periodo === 'hoy' ? 1 : periodo === 'semana' ? 7 : 30;
  for (let i = numDias - 1; i >= 0; i--) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() - i);
    const fechaStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const cuenta = confirmadas.filter((c) => c.fecha === fechaStr).length;
    dias.push({
      etiqueta: d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }),
      citas: cuenta,
    });
  }

  const periodos: { clave: Periodo; etiqueta: string }[] = [
    { clave: 'hoy', etiqueta: 'Hoy' },
    { clave: 'semana', etiqueta: 'Semana' },
    { clave: 'mes', etiqueta: 'Mes' },
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

      {/* Selector de período */}
      <div className="flex gap-2 mb-6">
        {periodos.map((p) => (
          <button
            key={p.clave}
            onClick={() => setPeriodo(p.clave)}
            className={`px-4 py-2 rounded-lg border text-sm transition ${
              periodo === p.clave
                ? 'border-amber-400 bg-amber-400 text-neutral-950 font-bold'
                : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
            }`}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="text-neutral-400 text-sm">Confirmadas</div>
          <div className="text-3xl font-bold text-amber-400">{confirmadas.length}</div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="text-neutral-400 text-sm">Canceladas</div>
          <div className="text-3xl font-bold text-red-400">{canceladas.length}</div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="text-neutral-400 text-sm">% Cancelación</div>
          <div className="text-3xl font-bold text-white">{porcentajeCancelacion}%</div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="text-neutral-400 text-sm">Ingresos estimados</div>
          <div className="text-2xl font-bold text-amber-400">${ingresos.toLocaleString('es-CO')}</div>
        </div>
      </div>

      {/* Gráfica */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
        <h2 className="font-[family-name:var(--font-oswald)] uppercase tracking-wide text-lg text-white mb-4">
          Citas por día
        </h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={dias}>
            <XAxis dataKey="etiqueta" stroke="#888" fontSize={12} />
            <YAxis stroke="#888" fontSize={12} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#fff' }}
              labelStyle={{ color: '#d4a437' }}
            />
            <Bar dataKey="citas" fill="#d4a437" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-neutral-500 text-xs mt-2">* Ingresos estimados según citas confirmadas, no caja real.</p>
      </div>
    </div>
  );
}