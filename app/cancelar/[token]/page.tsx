import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase-admin';
import CancelarCliente from './CancelarCliente';
import { hora12, fechaBonita } from '@/lib/formato';
import { REGEX_ID } from '@/lib/seguridad';
import { MINUTOS_CANCELACION } from '@/lib/config-reservas';
import { momentoCita } from '@/lib/tiempo';

export const metadata = { title: 'Cancelar cita' };

const supabase = supabaseAdmin;
export const dynamic = 'force-dynamic';

// Ya no se puede cancelar por aquí si faltan menos minutos que el plazo (hora de Colombia)
function estaFueraDePlazo(fecha: string, hora: string): boolean {
  return Date.now() > momentoCita(fecha, hora) - MINUTOS_CANCELACION * 60 * 1000;
}

export default async function CancelarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const { data: cita } = !REGEX_ID.test(token)
    ? { data: null }
    : await supabase
        .from('appointments')
        .select('fecha, hora, estado, nombre_cliente, barbers(nombre), services(nombre, precio)')
        .eq('cancel_token', token)
        .single();

  if (!cita) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
        <div className="anim-entrar max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center">
          <div
            aria-hidden="true"
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-800 text-3xl text-amber-400"
          >
            ?
          </div>
          <h1 className="font-[family-name:var(--font-oswald)] uppercase tracking-wide text-2xl font-bold text-amber-400 mb-2">
            Reserva no encontrada
          </h1>
          <p className="text-neutral-300 mb-6">
            Este enlace no corresponde a ninguna reserva. Revisa que lo hayas copiado completo desde
            tu correo.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/reservas"
              className="presionable w-full py-4 rounded-xl bg-amber-400 text-neutral-950 font-bold uppercase tracking-wide hover:bg-amber-300"
            >
              Agendar una cita
            </Link>
            <Link
              href="/"
              className="presionable w-full py-3 rounded-xl border border-neutral-700 text-neutral-200 hover:border-amber-400 hover:text-amber-400"
            >
              Ir al inicio
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const barbero = (cita.barbers as unknown as { nombre: string } | null)?.nombre ?? '—';
  const servicio = (cita.services as unknown as { nombre: string } | null)?.nombre ?? '—';

  const fueraDePlazo = estaFueraDePlazo(cita.fecha, cita.hora);

  return (
    <CancelarCliente
      token={token}
      estado={cita.estado}
      fecha={fechaBonita(cita.fecha)}
      hora={hora12(cita.hora)}
      nombreCliente={cita.nombre_cliente}
      barbero={barbero}
      servicio={servicio}
      fueraDePlazo={fueraDePlazo}
    />
  );
}
