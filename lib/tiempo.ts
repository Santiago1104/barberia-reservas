import { ZONA_HORARIA } from './config-reservas';

// Colombia es UTC-5 todo el año (sin horario de verano).
const OFFSET_HORAS = 5;

// Fecha de hoy en Colombia como "2026-06-09", sin depender de la zona del servidor
export function hoyColombia(offsetDias = 0): string {
  const ahora = new Date(Date.now() + offsetDias * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora);
}

// Milisegundos UTC del momento de la cita, interpretada en hora de Colombia
export function momentoCita(fecha: string, hora: string): number {
  const [a, mes, d] = fecha.split('-').map(Number);
  const [h, m] = hora.split(':').map(Number);
  return Date.UTC(a, mes - 1, d, h + OFFSET_HORAS, m, 0, 0);
}
