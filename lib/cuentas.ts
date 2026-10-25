import { supabaseAdmin } from './supabase-admin';

// Busca un usuario de Supabase Auth por correo (la barbería es pequeña: una página basta)
export async function buscarUsuarioPorEmail(email: string) {
  const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  return data?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

// Bloquea el acceso (~100 años) o lo restablece
export async function fijarBloqueoUsuario(userId: string, bloqueado: boolean) {
  return supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: bloqueado ? '876000h' : 'none',
  });
}
