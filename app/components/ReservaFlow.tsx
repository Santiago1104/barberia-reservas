'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { hora12 } from '@/lib/formato';

type Barber = {
  id: string;
  nombre: string;
  descripcion: string | null;
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

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');

  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const [reservaHecha, setReservaHecha] = useState<{ cancelToken: string } | null>(null);

  const dias = generarDias();

  useEffect(() => {
    async function cargarHorasOcupadas() {
      if (!barberoElegido || !diaElegido) return;
      setCargandoHoras(true);
      setHoraElegida(null);

      try {
        const res = await fetch(
          `/api/disponibilidad?barber_id=${barberoElegido.id}&fecha=${diaElegido}`
        );
        const data = await res.json();
        setHorasOcupadas(data.horasOcupadas ?? []);
      } catch {
        setHorasOcupadas([]);
      }
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
          setErrorGuardado('Esa hora acaba de ser reservada por alguien más. Por favor elige otra.');
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
      <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center">
          <div className="text-amber-400 text-5xl mb-4">✓</div>
          <h1 className="font-[family-name:var(--font-oswald)] uppercase tracking-wide text-2xl font-bold text-amber-400 mb-4">
            ¡Reserva confirmada!
          </h1>
          <p className="text-neutral-300 mb-2">
            Tu cita con <strong className="text-white">{barberoElegido?.nombre}</strong> quedó agendada para el {diaElegido} a las {hora12(horaElegida!)}.
          </p>
          <p className="text-neutral-400 text-sm mb-6">Servicio: {servicioElegido?.nombre}</p>
          <p className="text-neutral-300 text-sm mb-2">Enviamos los detalles a tu correo. Si necesitas cancelar:</p>
          
            href={urlCancelar}
            className="text-amber-400 text-sm break-all hover:underline"
          <a>
            {urlCancelar}
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white py-10 px-4">
      <div className="max-w-xl mx-auto">
        <h1 className="font-[family-name:var(--font-oswald)] uppercase tracking-wide text-3xl font-bold text-amber-400 mb-8 text-center">
          Reserva tu cita
        </h1>

        {/* PASO 1: barbero */}
        <section className="mb-8">
          <h2 className="font-[family-name:var(--font-oswald)] uppercase tracking-wide text-lg text-white mb-3">
            1. Elige tu barbero
          </h2>
          <div className="flex flex-col gap-3">
            {barbers.map((b) => (
              <button
                key={b.id}
                onClick={() => setBarberoElegido(b)}
                className={`flex items-center gap-4 p-4 rounded-xl border text-left transition w-full ${
                  barberoElegido?.id === b.id
                    ? 'border-amber-400 bg-neutral-800'
                    : 'border-neutral-700 bg-neutral-900 hover:border-neutral-500'
                }`}
              >
                {b.foto_url ? (
                  <img src={b.foto_url} alt={b.nombre} className="w-14 h-14 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-neutral-700 shrink-0" />
                )}
                <div>
                  <div className="font-bold">{b.nombre}</div>
                  {b.descripcion && <div className="text-sm text-neutral-400">{b.descripcion}</div>}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* PASO 2: servicio */}
        {barberoElegido && (
          <section className="mb-8">
            <h2 className="font-[family-name:var(--font-oswald)] uppercase tracking-wide text-lg text-white mb-3">
              2. Elige el servicio
            </h2>
            <div className="flex flex-col gap-3">
              {services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setServicioElegido(s)}
                  className={`p-4 rounded-xl border text-left transition ${
                    servicioElegido?.id === s.id
                      ? 'border-amber-400 bg-neutral-800'
                      : 'border-neutral-700 bg-neutral-900 hover:border-neutral-500'
                  }`}
                >
                  <div className="font-bold">{s.nombre}</div>
                  {s.descripcion && <div className="text-sm text-neutral-400">{s.descripcion}</div>}
                  <div className="text-amber-400 mt-1">${s.precio.toLocaleString('es-CO')}</div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* PASO 3: día */}
        {servicioElegido && (
          <section className="mb-8">
            <h2 className="font-[family-name:var(--font-oswald)] uppercase tracking-wide text-lg text-white mb-3">
              3. Elige el día
            </h2>
            <div className="flex flex-wrap gap-3">
              {dias.map((d) => {
                const valor = aTextoFecha(d);
                return (
                  <button
                    key={valor}
                    onClick={() => setDiaElegido(valor)}
                    className={`px-5 py-4 rounded-xl border capitalize transition ${
                      diaElegido === valor
                        ? 'border-amber-400 bg-neutral-800'
                        : 'border-neutral-700 bg-neutral-900 hover:border-neutral-500'
                    }`}
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
          <section className="mb-8">
            <h2 className="font-[family-name:var(--font-oswald)] uppercase tracking-wide text-lg text-white mb-3">
              4. Elige la hora
            </h2>
            {cargandoHoras ? (
              <p className="text-neutral-400">Cargando horas disponibles...</p>
            ) : horasLibres.length === 0 ? (
              <p className="text-neutral-400">No hay horas disponibles este día. Prueba con otro.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {horasLibres.map((hora) => (
                  <button
                    key={hora}
                    onClick={() => setHoraElegida(hora)}
                    className={`px-5 py-3 rounded-xl border transition ${
                      horaElegida === hora
                        ? 'border-amber-400 bg-neutral-800'
                        : 'border-neutral-700 bg-neutral-900 hover:border-neutral-500'
                    }`}
                  >
                    {hora12(hora)}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* PASO 5: formulario */}
        {horaElegida && (
          <section className="mb-8">
            <h2 className="font-[family-name:var(--font-oswald)] uppercase tracking-wide text-lg text-white mb-3">
              5. Tus datos
            </h2>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4">
              <p className="text-neutral-300">
                <strong className="text-white">{barberoElegido?.nombre}</strong> — {servicioElegido?.nombre} (${servicioElegido?.precio.toLocaleString('es-CO')})
              </p>
              <p className="text-neutral-400 text-sm">{diaElegido} a las {hora12(horaElegida!)}</p>
            </div>

            <div className="flex flex-col gap-3">
              <input
                placeholder="Nombre completo"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="p-3 rounded-xl bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
              />
              <input
                placeholder="Teléfono"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="p-3 rounded-xl bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
              />
              <input
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="p-3 rounded-xl bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
              />
            </div>

            {email.trim() !== '' && !emailValido(email) && (
              <p className="text-red-400 text-sm mt-2">El correo no parece válido.</p>
            )}
            {errorGuardado && <p className="text-red-400 mt-2">{errorGuardado}</p>}

            <button
              onClick={confirmarReserva}
              disabled={!formularioCompleto || guardando}
              className={`mt-4 w-full py-4 rounded-xl font-bold uppercase tracking-wide transition ${
                formularioCompleto && !guardando
                  ? 'bg-amber-400 text-neutral-950 hover:bg-amber-300 cursor-pointer'
                  : 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
              }`}
            >
              {guardando ? 'Guardando...' : 'Confirmar reserva'}
            </button>
          </section>
        )}
      </div>
    </main>
  );
}