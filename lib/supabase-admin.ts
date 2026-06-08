import { createClient } from '@supabase/supabase-js';

// Cliente con privilegios de administrador (salta RLS).
// SOLO debe usarse en el servidor (API routes), NUNCA en el navegador.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);