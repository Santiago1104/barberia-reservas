import { supabase } from '@/lib/supabase';
import ReservaFlow from './components/ReservaFlow';

export default async function Home() {
  const { data: barbers } = await supabase
    .from('barbers')
    .select('*')
    .eq('activo', true);

const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('activo', true);
    
  return <ReservaFlow barbers={barbers ?? []} services={services ?? []} />;
}