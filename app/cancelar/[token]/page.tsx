import { createClient } from '@supabase/supabase-js';
import CancelarCliente from './CancelarCliente';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function CancelarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const { data: cita } = await supabase
    .from('appointments')
    .select('fecha, hora, estado, nombre_cliente, barbers(nombre), services(nombre, precio)')
    .eq('cancel_token', token)
    .single();

  if (!cita) {
    return (
      <div style={{ maxWidth: 500, margin: '80px auto', padding: 20, color: '#1F3864' }}>
        <h1>Reserva no encontrada</h1>
        <p>Este enlace no corresponde a ninguna reserva.</p>
      </div>
    );
  }

  const barbero = (cita.barbers as { nombre: string } | null)?.nombre ?? '—';
  const servicio = (cita.services as { nombre: string } | null)?.nombre ?? '—';

  return (
    <CancelarCliente
      token={token}
      estado={cita.estado}
      fecha={cita.fecha}
      hora={cita.hora.slice(0, 5)}
      nombreCliente={cita.nombre_cliente}
      barbero={barbero}
      servicio={servicio}
    />
  );
}