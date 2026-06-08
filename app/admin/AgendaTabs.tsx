'use client';

import { useState } from 'react';
import type { Cita } from './page';
import { hora12 } from '@/lib/formato';

type Vista = 'hoy' | 'proximas' | 'anteriores';

// Convierte fecha "2026-06-09" + hora "10:00:00" en un objeto Date
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

export default function AgendaTabs({ citas }: { citas: Cita[] }) {
  const [vista, setVista] = useState<Vista>('hoy');
  const ahora = new Date();

  // Clasificar cada cita en uno de los tres grupos
  const hoy: Cita[] = [];
  const proximas: Cita[] = [];
  const anteriores: Cita[] = [];

  for (const cita of citas) {
    const cuando = fechaHoraDe(cita);

    if (cuando < ahora) {
      // ya pasó (incluye las de la mañana de hoy)
      anteriores.push(cita);
    } else if (esMismoDia(cuando, ahora)) {
      // es hoy y aún no llega su hora
      hoy.push(cita);
    } else {
      // día futuro
      proximas.push(cita);
    }
  }

  // Las anteriores se ven mejor de la más reciente a la más vieja
  anteriores.reverse();

  const grupos = { hoy, proximas, anteriores };
  const citasMostradas = grupos[vista];

  const tabs: { clave: Vista; etiqueta: string; cantidad: number }[] = [
    { clave: 'hoy', etiqueta: 'Hoy', cantidad: hoy.length },
    { clave: 'proximas', etiqueta: 'Próximas', cantidad: proximas.length },
    { clave: 'anteriores', etiqueta: 'Anteriores', cantidad: anteriores.length },
  ];

  return (
    <div style={{ marginTop: 24 }}>
      {/* Pestañas */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {tabs.map((t) => (
          <button
            key={t.clave}
            onClick={() => setVista(t.clave)}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid #1F3864',
              background: vista === t.clave ? '#1F3864' : '#fff',
              color: vista === t.clave ? '#fff' : '#1F3864',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            {t.etiqueta} ({t.cantidad})
          </button>
        ))}
      </div>

      {/* Lista */}
      {citasMostradas.length === 0 ? (
        <p>
          {vista === 'hoy'
            ? 'No tienes más citas hoy.'
            : vista === 'proximas'
            ? 'No tienes citas próximas.'
            : 'No hay citas anteriores.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {citasMostradas.map((cita) => (
            <div
              key={cita.id}
              style={{
                padding: 16,
                borderRadius: 8,
                border: '1px solid #ccc',
                background: '#fff',
                opacity: vista === 'anteriores' ? 0.7 : 1,
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: 16 }}>
                {cita.fecha} — {hora12(cita.hora)}
              </div>
              <div style={{ marginTop: 6 }}>Cliente: {cita.nombre_cliente}</div>
              <div>Barbero: {cita.barbers?.nombre ?? '—'}</div>
              <div>
                Servicio: {cita.services?.nombre ?? '—'}
                {cita.services?.precio
                  ? ` ($${cita.services.precio.toLocaleString('es-CO')})`
                  : ''}
              </div>
              <div style={{ color: '#555', fontSize: 14, marginTop: 6 }}>
                Tel: {cita.telefono_cliente} · {cita.email_cliente}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}