import { crearClienteServidor } from '@/lib/supabase-server';
import BotonSalir from './BotonSalir';

type CitaConRelaciones = {
  id: string;
  fecha: string;
  hora: string;
  nombre_cliente: string;
  telefono_cliente: string;
  email_cliente: string;
  estado: string;
  barbers: { nombre: string } | null;
  services: { nombre: string; precio: number } | null;
};

function aTextoFecha(d: Date): string {
  const año = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`;
}

export default async function AdminPage() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const hoy = aTextoFecha(new Date());

  // Traemos las citas confirmadas de hoy en adelante, con nombre del barbero y servicio
  const { data: citas } = await supabase
    .from('appointments')
    .select(
      'id, fecha, hora, nombre_cliente, telefono_cliente, email_cliente, estado, barbers(nombre), services(nombre, precio)'
    )
    .eq('estado', 'confirmada')
    .gte('fecha', hoy)
    .order('fecha', { ascending: true })
    .order('hora', { ascending: true });

  const listaCitas = (citas ?? []) as unknown as CitaConRelaciones[];

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: 20, color: '#1F3864' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Agenda</h1>
        <BotonSalir />
      </div>
      <p style={{ color: '#555' }}>Sesión: {user?.email}</p>

      {listaCitas.length === 0 ? (
        <p style={{ marginTop: 24 }}>No tienes citas próximas.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
          {listaCitas.map((cita) => (
            <div
              key={cita.id}
              style={{
                padding: 16,
                borderRadius: 8,
                border: '1px solid #ccc',
                background: '#fff',
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: 16 }}>
                {cita.fecha} — {cita.hora.slice(0, 5)}
              </div>
              <div style={{ marginTop: 6 }}>
                Cliente: {cita.nombre_cliente}
              </div>
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