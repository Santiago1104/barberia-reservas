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

  // Datos del formulario
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');

  // Estado del guardado
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const [reservaHecha, setReservaHecha] = useState<{ cancelToken: string } | null>(null);

  const dias = generarDias();

  useEffect(() => {
    async function cargarHorasOcupadas() {
      if (!barberoElegido || !diaElegido) return;
      setCargandoHoras(true);
      setHoraElegida(null);

      const { data } = await supabase
        .from('appointments')
        .select('hora')
        .eq('barber_id', barberoElegido.id)
        .eq('fecha', diaElegido)
        .eq('estado', 'confirmada');

      const ocupadas = (data ?? []).map((c) => c.hora.slice(0, 5));
      setHorasOcupadas(ocupadas);
      setCargandoHoras(false);
    }
    cargarHorasOcupadas();
  }, [barberoElegido, diaElegido]);

  const hoyTexto = aTextoFecha(new Date());
  const ahora = new Date();

  const horasLibres = HORARIO.filter((hora) => {
    if (horasOcupadas.includes(hora)) return false;
    if (diaElegido === hoyTexto) {
      const [h, m] = hora.split(':').map(Number);
      const horaSlot = new Date();
      horaSlot.setHours(h, m, 0, 0);
      if (horaSlot <= ahora) return false;
    }
    return true;
  });

  // Validación simple de email
  function emailValido(correo: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
  }

  const formularioCompleto =
    nombre.trim() !== '' &&
    telefono.trim() !== '' &&
    email.trim() !== '' &&
    emailValido(email);

async function confirmarReserva() {
    if (!barberoElegido || !servicioElegido || !diaElegido || !horaElegida) return;

    setGuardando(true);
    setErrorGuardado(null);

    try {
      const res = await fetch('/api/reservas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barber_id: barberoElegido.id,
          service_id: servicioElegido.id,
          fecha: diaElegido,
          hora: horaElegida,
          nombre_cliente: nombre.trim(),
          telefono_cliente: telefono.trim(),
          email_cliente: email.trim(),
          barbero_nombre: barberoElegido.nombre,
          servicio_nombre: servicioElegido.nombre,
        }),
      });

      const resultado = await res.json();

      setGuardando(false);

      if (!res.ok) {
        if (resultado.error === 'slot_ocupado') {
          setErrorGuardado(
            'Esa hora acaba de ser reservada por alguien más. Por favor elige otra.'
          );
          setHorasOcupadas((prev) => [...prev, horaElegida]);
          setHoraElegida(null);
        } else {
          setErrorGuardado('Ocurrió un error al guardar. Intenta de nuevo.');
        }
        return;
      }

      setReservaHecha({ cancelToken: resultado.cancel_token });
    } catch {
      setGuardando(false);
      setErrorGuardado('No se pudo conectar. Revisa tu internet e intenta de nuevo.');
    }
  }

  // PANTALLA DE CONFIRMACIÓN
  if (reservaHecha) {
    const urlCancelar = `${window.location.origin}/cancelar/${reservaHecha.cancelToken}`;
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: 20, color: '#1F3864' }}>
        <h1>¡Reserva confirmada!</h1>
        <p>
          Tu cita con <strong>{barberoElegido?.nombre}</strong> quedó agendada para el{' '}
          {diaElegido} a las {horaElegida}.
        </p>
        <p>Servicio: {servicioElegido?.nombre}</p>
        <p style={{ marginTop: 16 }}>
          Si necesitas cancelar, usa este enlace:
        </p>
        <p>
          <a href={urlCancelar}>{urlCancelar}</a>
        </p>
        <p style={{ color: '#888', fontSize: 14 }}>
          (Pronto enviaremos esta confirmación a tu correo.)
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
      <h1>Reserva tu cita</h1>

      {/* PASO 1: barbero */}
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
                border: barberoElegido?.id === b.id ? '2px solid #1F3864' : '1px solid #ccc',
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

      {/* PASO 2: servicio */}
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
                  border: servicioElegido?.id === s.id ? '2px solid #1F3864' : '1px solid #ccc',
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
                <div style={{ marginTop: 4 }}>${s.precio.toLocaleString('es-CO')}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* PASO 3: día */}
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
                    border: diaElegido === valor ? '2px solid #1F3864' : '1px solid #ccc',
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

      {/* PASO 4: hora */}
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
                    border: horaElegida === hora ? '2px solid #1F3864' : '1px solid #ccc',
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

      {/* PASO 5: formulario y confirmar */}
      {horaElegida && (
        <section style={{ marginTop: 24, color: '#1F3864' }}>
          <h2>5. Tus datos</h2>
          <p>
            <strong>{barberoElegido?.nombre}</strong> — {servicioElegido?.nombre} ($
            {servicioElegido?.precio.toLocaleString('es-CO')})<br />
            {diaElegido} a las {horaElegida}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            <input
              placeholder="Nombre completo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              style={{ padding: 12, borderRadius: 8, border: '1px solid #ccc' }}
            />
            <input
              placeholder="Teléfono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              style={{ padding: 12, borderRadius: 8, border: '1px solid #ccc' }}
            />
            <input
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ padding: 12, borderRadius: 8, border: '1px solid #ccc' }}
            />
          </div>

          {email.trim() !== '' && !emailValido(email) && (
            <p style={{ color: '#c0392b', fontSize: 14 }}>
              El correo no parece válido.
            </p>
          )}

          {errorGuardado && (
            <p style={{ color: '#c0392b', marginTop: 8 }}>{errorGuardado}</p>
          )}

          <button
            onClick={confirmarReserva}
            disabled={!formularioCompleto || guardando}
            style={{
              marginTop: 16,
              padding: '14px 24px',
              borderRadius: 8,
              border: 'none',
              background: formularioCompleto && !guardando ? '#1F3864' : '#aaa',
              color: '#fff',
              cursor: formularioCompleto && !guardando ? 'pointer' : 'not-allowed',
              fontSize: 16,
            }}
          >
            {guardando ? 'Guardando...' : 'Confirmar reserva'}
          </button>
        </section>
      )}
    </div>
  );
}