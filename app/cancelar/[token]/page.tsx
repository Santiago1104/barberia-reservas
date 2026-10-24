import { supabaseAdmin } from '@/lib/supabase-admin';
import CancelarCliente from './CancelarCliente';
import { hora12, fechaBonita } from '@/lib/formato';
import { REGEX_ID } from '@/lib/seguridad';


const supabase = supabaseAdmin;
export const dynamic = 'force-dynamic';

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
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center">
          <h1 className="font-[family-name:var(--font-oswald)] uppercase tracking-wide text-2xl font-bold text-amber-400 mb-4">
            Reserva no encontrada
          </h1>
          <p className="text-neutral-300">Este enlace no corresponde a ninguna reserva.</p>
        </div>
      </main>
    );
  }

const barbero =
    (cita.barbers as unknown as { nombre: string } | null)?.nombre ?? '—';
  const servicio =
    (cita.services as unknown as { nombre: string } | null)?.nombre ?? '—';

  return (
    <CancelarCliente
      token={token}
      estado={cita.estado}
      fecha={fechaBonita(cita.fecha)}
      hora={hora12(cita.hora)}
      nombreCliente={cita.nombre_cliente}
      barbero={barbero}
      servicio={servicio}
    />
  );
}