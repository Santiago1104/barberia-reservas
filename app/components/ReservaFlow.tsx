'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type Barber = {
  id: string;
  nombre: string;
  foto_url: string | null;
  activo: boolean;
};

type Service = {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
};

// Horario de atención fijo (slots de 1 hora)
const HORARIO = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

function generarDias(): Date[] {
  const dias: Date[] = [];
  for (let i = 0; i <= 3; i++) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    dias.push(d);
  }
  return dias;
}

function aTextoFecha(d: Date): string {
  const año = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`;
}

function aTextoBonito(d: Date): string {
  return d.toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export default function ReservaFlow({
  barbers,
  services,
}: {
  barbers: Barber[];
  services: Service[];
}) {
  const [barberoElegido, setBarberoElegido] = useState<Barber | null>(null);
  const [servicioElegido, setServicioElegido] = useState<Service | null>(null);
  const [diaElegido, setDiaElegido] = useState<string | null>(null);
  const [horaElegida, setHoraElegida] = useState<string | null>(null);
  const [horasOcupadas, setHorasOcupadas] = useState<string[]>([]);
  const [cargandoHoras, setCargandoHoras] = useState(false);

  const dias = generarDias();

  // Consulta las horas ya ocupadas cada vez que cambia el barbero o el día
  useEffect(() => {
    async function cargarHorasOcupadas() {
      if (!barberoElegido || !diaElegido) return;

      setCargandoHoras(true);
      setHoraElegida(null); // resetea la hora si cambia barbero/día

      const { data } = await supabase
        .from('appointments')
        .select('hora')
        .eq('barber_id', barberoElegido.id)
        .eq('fecha', diaElegido)
        .eq('estado', 'confirmada');

      // Las horas vienen como "09:00:00", las recortamos a "09:00"
      const ocupadas = (data ?? []).map((c) => c.hora.slice(0, 5));
      setHorasOcupadas(ocupadas);
      setCargandoHoras(false);
    }

    cargarHorasOcupadas();
  }, [barberoElegido, diaElegido]);

  // Calcula qué horas mostrar: las del horario, menos ocupadas, menos las que ya pasaron si es hoy
  const hoyTexto = aTextoFecha(new Date());
  const ahora = new Date();

  const horasLibres = HORARIO.filter((hora) => {
    if (horasOcupadas.includes(hora)) return false;

    // Si el día elegido es hoy, ocultar horas que ya pasaron
    if (diaElegido === hoyTexto) {
      const [h, m] = hora.split(':').map(Number);
      const horaSlot = new Date();
      horaSlot.setHours(h, m, 0, 0);
      if (horaSlot <= ahora) return false;
    }
    return true;
  });

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
      <h1>Reserva tu cita</h1>

      {/* PASO 1: elegir barbero */}
      <section>
        <h2>1. Elige tu barbero</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {barbers.map((b) => (
            <button
              key={b.id}
              onClick={() => setBarberoElegido(b)}
              style={{
                padding: '16px 24px',
                borderRadius: 8,
                border:
                  barberoElegido?.id === b.id
                    ? '2px solid #1F3864'
                    : '1px solid #ccc',
                background: barberoElegido?.id === b.id ? '#e8eef7' : '#fff',
                color: '#1F3864',
                cursor: 'pointer',
                fontSize: 16,
              }}
            >
              {b.nombre}
            </button>
          ))}
        </div>
      </section>

      {/* PASO 2: elegir servicio */}
      {barberoElegido && (
        <section style={{ marginTop: 24 }}>
          <h2>2. Elige el servicio</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => setServicioElegido(s)}
                style={{
                  padding: 16,
                  borderRadius: 8,
                  border:
                    servicioElegido?.id === s.id
                      ? '2px solid #1F3864'
                      : '1px solid #ccc',
                  background: servicioElegido?.id === s.id ? '#e8eef7' : '#fff',
                  color: '#1F3864',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <strong>{s.nombre}</strong>
                {s.descripcion && (
                  <div style={{ fontSize: 14, color: '#555' }}>{s.descripcion}</div>
                )}
                <div style={{ marginTop: 4 }}>
                  ${s.precio.toLocaleString('es-CO')}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* PASO 3: elegir día */}
      {servicioElegido && (
        <section style={{ marginTop: 24 }}>
          <h2>3. Elige el día</h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {dias.map((d) => {
              const valor = aTextoFecha(d);
              return (
                <button
                  key={valor}
                  onClick={() => setDiaElegido(valor)}
                  style={{
                    padding: '16px 20px',
                    borderRadius: 8,
                    border:
                      diaElegido === valor ? '2px solid #1F3864' : '1px solid #ccc',
                    background: diaElegido === valor ? '#e8eef7' : '#fff',
                    color: '#1F3864',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {aTextoBonito(d)}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* PASO 4: elegir hora */}
      {diaElegido && (
        <section style={{ marginTop: 24 }}>
          <h2>4. Elige la hora</h2>
          {cargandoHoras ? (
            <p>Cargando horas disponibles...</p>
          ) : horasLibres.length === 0 ? (
            <p>No hay horas disponibles este día. Prueba con otro.</p>
          ) : (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {horasLibres.map((hora) => (
                <button
                  key={hora}
                  onClick={() => setHoraElegida(hora)}
                  style={{
                    padding: '14px 20px',
                    borderRadius: 8,
                    border:
                      horaElegida === hora ? '2px solid #1F3864' : '1px solid #ccc',
                    background: horaElegida === hora ? '#e8eef7' : '#fff',
                    color: '#1F3864',
                    cursor: 'pointer',
                  }}
                >
                  {hora}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* PASO 5: resumen (siguiente: confirmar) */}
      {horaElegida && (
        <section style={{ marginTop: 24 }}>
          <h2>5. Confirma tu reserva</h2>
          <p>
            <strong>{barberoElegido?.nombre}</strong> — {servicioElegido?.nombre} (
            ${servicioElegido?.precio.toLocaleString('es-CO')})<br />
            {diaElegido} a las {horaElegida}
          </p>
          <p style={{ color: '#888' }}>(Aquí irá el formulario de datos, siguiente paso)</p>
        </section>
      )}
    </div>
  );
}