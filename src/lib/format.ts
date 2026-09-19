/**
 * Utilidades de cálculo y formato.
 *
 * Sin `Intl`: Lynx no implementa la API de internacionalización
 * (https://lynxjs.org/guide/inclusion/internationalization), así que `Intl`
 * es `undefined` en runtime y cualquier `new Intl.DateTimeFormat(...)` tira.
 * Las fechas se formatean a mano, con los mismos formatos que producía la
 * versión con `Intl` de la app Expo.
 */

const WEEKDAYS_ES = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

const MONTHS_ES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Formatea segundos como "MM:SS" o "HH:MM:SS". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  return h > 0 ? `${h}:${pad2(m)}:${pad2(sec)}` : `${pad2(m)}:${pad2(sec)}`;
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
  const weekday = WEEKDAYS_ES[date.getDay()];

  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${date.getDate()} ${MONTHS_ES[date.getMonth()]}`;
}

/** Formatea fecha como "18 jun 2026". */
export function formatDateLong(date: Date): string {
  return `${date.getDate()} ${MONTHS_ES[date.getMonth()]} ${date.getFullYear()}`;
}

/** Formatea fecha como "18/06/2026 14:30". */
export function formatDateTime(date: Date): string {
  const day = pad2(date.getDate());
  const month = pad2(date.getMonth() + 1);

  return `${day}/${month}/${date.getFullYear()} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
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

/** Clave de día local `YYYY-MM-DD`. Es la que usan los agregados diarios. */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Mes abreviado en español a partir del índice 0-11. */
export function shortMonth(monthIndex: number): string {
  return MONTHS_ES[monthIndex] ?? '';
}

/**
 * Número con separador de miles español (`.`), sin `Intl`.
 *
 * Reemplaza a `toLocaleString('es-ES')`, que en Lynx tira en runtime por la
 * misma razón que las fechas (la API de internacionalización no está
 * implementada). Los decimales se separan con coma, como en es-ES.
 */
export function formatNumber(value: number, decimals = 0): string {
  const rounded = decimals > 0 ? value.toFixed(decimals) : String(Math.round(value));
  const negative = rounded.startsWith('-');
  const [intPart = '0', decPart] = (negative ? rounded.slice(1) : rounded).split('.');

  let grouped = '';

  for (let i = 0; i < intPart.length; i++) {
    if (i > 0 && (intPart.length - i) % 3 === 0) grouped += '.';
    grouped += intPart[i];
  }

  const sign = negative ? '-' : '';

  return decPart ? `${sign}${grouped},${decPart}` : `${sign}${grouped}`;
}
