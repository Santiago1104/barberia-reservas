import { crearClienteServidor } from '@/lib/supabase-server';
import BotonSalir from './BotonSalir';
import AgendaTabs from './AgendaTabs';

export type Cita = {
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

export default async function AdminPage() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: citas } = await supabase
    .from('appointments')
    .select(
      'id, fecha, hora, nombre_cliente, telefono_cliente, email_cliente, estado, barbers(nombre), services(nombre, precio)'
    )
    .eq('estado', 'confirmada')
    .order('fecha', { ascending: true })
    .order('hora', { ascending: true });

  const listaCitas = (citas ?? []) as unknown as Cita[];

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: 20, color: '#1F3864' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Agenda</h1>
        <BotonSalir />
      </div>
      <p style={{ color: '#555' }}>Sesión: {user?.email}</p>
      <div style={{ display: 'flex', gap: 12, margin: '12px 0' }}>
        <a href="/admin/barberos" style={{ color: '#1F3864' }}>
          Gestionar barberos
        </a>
        <a href="/admin/servicios" style={{ color: '#1F3864' }}>
          Gestionar servicios
        </a>
      </div>

      <AgendaTabs citas={listaCitas} />
    </div>
  );
}