import { randomUUID } from 'expo-crypto';

/**
 * Generación de IDs únicos para filas, archivos y recordatorios.
 *
 * Usa `expo-crypto` en vez de `nanoid`: nanoid v5 exige el global
 * `crypto.getRandomValues()`, que **Hermes no tiene**, y por eso el seed tumbaba
 * el bootstrap en Expo Go (el error se veía como "Data layer no inicializado").
 *
 * Ventajas frente al polyfill global:
 * - `expo-crypto` es un módulo de Expo incluido en Expo Go.
 * - No muta globals, así que no hay trap de orden de imports: el problema que
 *   hace frágiles a `react-native-get-random-values`/`expo-standard-web-crypto`.
 * - Funciona igual en web e iOS (su implementación usa Web Crypto allí).
 */
export function newId(): string {
  return randomUUID();
}

/** Id corto para sufijos (nombres de archivo, identificadores de recordatorio). */
export function shortId(length = 6): string {
  return randomUUID().replace(/-/g, '').slice(0, length);
}
