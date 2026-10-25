import { supabaseAdmin } from './supabase-admin';
import { diaSemana, type Rango, type CitaOcupada } from './disponibilidad';

export type DiaCargado = {
  rangos: Rango[];
  citas: (CitaOcupada & { nombre_cliente: string })[];
  bloqueos: string[];
};

// Datos de un día para un barbero: su horario, citas confirmadas y franjas bloqueadas.
// Devuelve null si alguna consulta falla.
export async function cargarDia(barberId: string, fecha: string): Promise<DiaCargado | null> {
  const [horarios, citas, bloqueos] = await Promise.all([
    supabaseAdmin
      .from('horarios')
      .select('hora_inicio, hora_fin, paso_min')
      .eq('barber_id', barberId)
      .eq('dia_semana', diaSemana(fecha)),
    supabaseAdmin
      .from('appointments')
      .select('hora, duracion_min, nombre_cliente')
      .eq('barber_id', barberId)
      .eq('fecha', fecha)
      .eq('estado', 'confirmada'),
    supabaseAdmin.from('bloqueos').select('hora').eq('barber_id', barberId).eq('fecha', fecha),
  ]);
  if (horarios.error || citas.error || bloqueos.error) {
    console.error('Error al cargar el día:', horarios.error ?? citas.error ?? bloqueos.error);
    return null;
  }

  return {
    rangos: (horarios.data ?? [])
      .map((h) => ({
        inicio: h.hora_inicio.slice(0, 5),
        fin: h.hora_fin.slice(0, 5),
        paso: h.paso_min ?? 15,
      }))
      .sort((a, b) => a.inicio.localeCompare(b.inicio)),
    citas: (citas.data ?? []).map((c) => ({
      hora: c.hora.slice(0, 5),
      duracion_min: c.duracion_min ?? 60,
      nombre_cliente: c.nombre_cliente,
    })),
    bloqueos: (bloqueos.data ?? []).map((b) => b.hora.slice(0, 5)),
  };
}
