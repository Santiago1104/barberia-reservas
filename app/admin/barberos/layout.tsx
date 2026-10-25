import { redirect } from 'next/navigation';
import { crearClienteServidor } from '@/lib/supabase-server';
import { esAdmin } from '@/lib/seguridad';

// Sección exclusiva del dueño
export default async function SeccionDuenioLayout({ children }: { children: React.ReactNode }) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!esAdmin(user)) redirect('/admin');
  return <>{children}</>;
}
