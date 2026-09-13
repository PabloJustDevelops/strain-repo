/**
 * Utilidades de cálculo y formato.
 */

/** Formatea segundos como "MM:SS" o "HH:MM:SS". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

/** Formatea un peso respetando la unidad. */
export function formatWeight(weight: number, units: 'kg' | 'lb'): string {
  return `${weight % 1 === 0 ? weight.toFixed(0) : weight.toFixed(1)} ${units}`;
}

/** Convierte kg a lb. */
export function kgToLb(kg: number): number {
  return kg * 2.2046226218;
}

/** Convierte lb a kg. */
export function lbToKg(lb: number): number {
  return lb / 2.2046226218;
}

/** Formatea fecha como "Lun 18 jun". */
export function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
}

/** Formatea fecha como "18 jun 2026". */
export function formatDateLong(date: Date): string {
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

/** Formatea fecha como "18/06/2026 14:30". */
export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** Diferencia en días entre dos fechas (date1 - date2). */
export function diffDays(date1: Date, date2: Date): number {
  const ms = date1.getTime() - date2.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/** Inicio del día. */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
