// Reglas de negocio compartidas entre el formulario y las API routes
export const HORARIO = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

// Días hacia adelante que se pueden reservar (0 = solo hoy)
export const DIAS_ANTICIPACION = 3;

// Minutos mínimos antes de la cita para poder cancelar
export const MINUTOS_CANCELACION = 30;

export const ZONA_HORARIA = 'America/Bogota';

// Días hacia adelante que un barbero puede bloquear franjas
export const DIAS_BLOQUEO = 60;
