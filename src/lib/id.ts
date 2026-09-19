/**
 * Generación de IDs únicos para filas, archivos y recordatorios.
 *
 * Versión Lynx: el runtime PrimJS no garantiza `crypto.getRandomValues()`
 * (mismo problema que Hermes en Expo), así que usamos un generador UUID v4
 * propio basado en `Math.random()`. Suficiente para claves locales offline;
 * no es criptográficamente seguro, pero aquí solo se usa para unicidad.
 *
 * Cuando haya un native module de crypto en Lynx, se puede cambiar la
 * implementación sin tocar a los consumidores (misma firma).
 */
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function newId(): string {
  return uuidv4();
}

/** Id corto para sufijos (nombres de archivo, identificadores de recordatorio). */
export function shortId(length = 6): string {
  return uuidv4().replace(/-/g, '').slice(0, length);
}