import { supabase } from '@/lib/supabase';

export default async function Home() {
  const { data: barbers } = await supabase.from('barbers').select('*');

  return (
    <main style={{ padding: 40 }}>
      <h1>Barberos</h1>
      <ul>
        {barbers?.map((b) => (
          <li key={b.id}>{b.nombre}</li>
        ))}
      </ul>
    </main>
  );
}