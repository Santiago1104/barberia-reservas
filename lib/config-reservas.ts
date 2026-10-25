// Reglas de negocio compartidas entre el formulario y las API routes

// Franja de horario y de bloqueo: bloques de 30 minutos
export const GRANULARIDAD_MIN = 30;

// Las horas de inicio que ve el cliente se ofrecen cada 15 minutos
export const PASO_INICIO_MIN = 15;

// Duración de un servicio: de 10 a 240 minutos, en pasos de 5 (ej. 30, 40, 45, 60)
export const DURACION_MIN = 10;
export const DURACION_MAX = 240;
export const DURACION_PASO = 5;

// Horario con el que se crea un barbero nuevo (lunes a sábado)
export const HORARIO_INICIAL = [
  { inicio: '09:00', fin: '12:00' },
  { inicio: '14:00', fin: '18:00' },
];
export const DIAS_INICIALES = [1, 2, 3, 4, 5, 6];

// Días hacia adelante que se pueden reservar (0 = solo hoy)
export const DIAS_ANTICIPACION = 3;

// Minutos mínimos antes de la cita para poder cancelar
export const MINUTOS_CANCELACION = 30;

// Días hacia adelante que un barbero puede bloquear franjas
export const DIAS_BLOQUEO = 60;

export const ZONA_HORARIA = 'America/Bogota';
