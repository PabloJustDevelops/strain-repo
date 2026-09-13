import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';

/**
 * Acceso al almacenamiento persistente, seguro en render estático (SSR).
 *
 * El render estático de la web corre en node, donde no existe `window` ni
 * `localStorage`. Los stores de Zustand y el cliente de Supabase leían
 * `AsyncStorage`/`localStorage` directamente, así que `pnpm build:web` moría con
 * `ReferenceError: localStorage is not defined` al evaluar los módulos.
 *
 * Estos adaptadores detectan el entorno y caen a un almacén en memoria cuando no
 * hay persistencia disponible, sin lanzar. En nativo y en el navegador el
 * comportamiento no cambia.
 */

/** Storage síncrono, compatible con `localStorage` y con Zustand. */
export interface SimpleStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Almacén en memoria. Es el fallback cuando no hay persistencia real: los datos
 * viven mientras dure el proceso y nunca lanzan.
 */
export function createMemoryStorage(): SimpleStorage {
  const data = new Map<string, string>();

  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

/**
 * El `localStorage` del navegador, o `null` si no existe (SSR en node) o si
 * acceder a él lanza. Devuelve `null` en vez de lanzar: es la detección que
 * habilita el fallback.
 */
export function getBrowserLocalStorage(): SimpleStorage | null {
  try {
    if (typeof window === 'undefined') return null;
    const storage = window.localStorage;

    return storage ?? null;
  } catch {
    return null;
  }
}

/**
 * El storage que consumen los stores de Zustand.
 *
 * - Sin `window` (render estático en node): memoria, para no romper el render.
 * - Con `window` (navegador y nativo, donde `AsyncStorage` es el backend real):
 *   `AsyncStorage`, que en web envuelve `localStorage`.
 */
export function createSafeAsyncStorage(): StateStorage {
  if (typeof window === 'undefined') return createMemoryStorage();

  return {
    getItem: (name) => AsyncStorage.getItem(name),
    setItem: (name, value) => AsyncStorage.setItem(name, value),
    removeItem: (name) => AsyncStorage.removeItem(name),
  };
}
