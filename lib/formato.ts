// Convierte "14:00" o "14:00:00" a "2:00 PM"
export function hora12(hora24: string): string {
  const [h, m] = hora24.split(':').map(Number);
  const periodo = h >= 12 ? 'PM' : 'AM';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12; // medianoche y mediodía
  const minutos = String(m).padStart(2, '0');
  return `${h12}:${minutos} ${periodo}`;
}
// Convierte "2026-06-09" a "9 de junio de 2026"
export function fechaBonita(fecha: string): string {
  const [año, mes, dia] = fecha.split('-').map(Number);
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  return `${dia} de ${meses[mes - 1]} de ${año}`;
}