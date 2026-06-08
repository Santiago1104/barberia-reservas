import { crearClienteServidor } from '@/lib/supabase-server';
import BotonSalir from './BotonSalir';

export default async function AdminPage() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 20, color: '#1F3864' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Panel del barbero</h1>
        <BotonSalir />
      </div>
      <p>Sesión iniciada como: {user?.email}</p>
      <p style={{ color: '#888' }}>(Aquí irá la agenda de citas, siguiente paso)</p>
    </div>
  );
}