import { PASO_INICIO_MIN } from './config-reservas';
import { momentoCita } from './tiempo';

// Reglas de disponibilidad: las usan el formulario (vía API), el servidor al validar una
// reserva y el panel del barbero, para que todos calculen lo mismo.

// Tramo de trabajo ("09:00" a "12:00") y cada cuántos minutos se ofrece una hora de inicio
export type Rango = { inicio: string; fin: string; paso?: number };
export type CitaOcupada = { hora: string; duracion_min: number };
// Franja bloqueada por el barbero: empieza en `hora` y dura `duracion_min`
export type BloqueoOcupa = { hora: string; duracion_min: number };
// Franja del horario del día: las mismas horas que ve el cliente
export type Franja = { hora: string; duracion: number };

export function aMin(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

export function deMin(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

// Día de la semana de "2026-06-09" (0 = domingo), sin depender de la zona horaria
export function diaSemana(fecha: string): number {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
}

// Franjas del día: dentro de cada tramo, una cada `paso` minutos desde su inicio.
// Cada franja dura hasta la siguiente (la última puede quedar corta al llegar al fin del tramo).
export function franjasDelDia(rangos: Rango[]): Franja[] {
  const franjas = new Map<string, Franja>();
  for (const r of rangos) {
    const paso = r.paso ?? PASO_INICIO_MIN;
    for (let t = aMin(r.inicio); t < aMin(r.fin); t += paso) {
      franjas.set(deMin(t), { hora: deMin(t), duracion: Math.min(paso, aMin(r.fin) - t) });
    }
  }
  return [...franjas.values()].sort((a, b) => a.hora.localeCompare(b.hora));
}

// ¿La cita [hora, hora + duración) se cruza con la franja?
export function citaCubreFranja(cita: CitaOcupada, franja: Franja): boolean {
  const ini = aMin(cita.hora);
  const f = aMin(franja.hora);
  return ini < f + franja.duracion && ini + cita.duracion_min > f;
}

// Horas de inicio disponibles para un servicio de `duracion` minutos. Dentro de cada tramo
// salen cada `paso` minutos desde su inicio (15 si el tramo no define paso).
export function horasLibres(datos: {
  fecha: string;
  rangos: Rango[];
  duracion: number;
  citas: CitaOcupada[];
  bloqueos: BloqueoOcupa[];
  ahora?: number;
}): string[] {
  const { fecha, rangos, duracion, citas, bloqueos } = datos;
  const ahora = datos.ahora ?? Date.now();
  const libres = new Set<string>();

  for (const r of rangos) {
    for (let t = aMin(r.inicio); t + duracion <= aMin(r.fin); t += r.paso ?? PASO_INICIO_MIN) {
      const fin = t + duracion;
      const choca =
        citas.some((c) => aMin(c.hora) < fin && aMin(c.hora) + c.duracion_min > t) ||
        bloqueos.some((b) => aMin(b.hora) < fin && aMin(b.hora) + b.duracion_min > t);
      if (choca) continue;
      if (momentoCita(fecha, deMin(t)) <= ahora) continue; // esa hora ya pasó
      libres.add(deMin(t));
    }
  }
  return [...libres].sort();
}
