/**
 * Seam de persistencia para Lynx.
 *
 * Lynx NO trae SQLite out-of-the-box. Las opciones reales son:
 *   - `lynx.getJSModule('...')` con un Native Module propio (SQLite en Kotlin/Swift).
 *   - El storage de sesión global (`setSessionStorageItem`/`getSessionStorageItem`),
 *     pensado para compartir datos entre cards, no como base de datos durable.
 *
 * Esta interfaz aísla esa decisión: el resto de la app solo conoce `Storage`.
 * La implementación por defecto usa el storage de sesión + un respaldo en memoria,
 * suficiente para la Fase 1 (base + lógica). Cuando exista el native module de
 * SQLite, se añade un `createSqliteStorage()` sin tocar a los consumidores.
 */

export interface Storage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  /** Lista todas las claves con un prefijo (para consultas por tabla). */
  keys(prefix: string): string[];
}

/** Declaración mínima del objeto global `lynx` que expone el engine. */
interface LynxGlobal {
  getSessionStorageItem(key: string): string | null;
  setSessionStorageItem(key: string, value: string): void;
}

declare const lynx: LynxGlobal | undefined;

/**
 * Storage en memoria + espejo en el session storage de Lynx cuando está
 * disponible. La memoria garantiza que la app funcione en tests y en el primer
 * render; el espejo deja los datos accesibles entre recargas de la card.
 */
export function createSessionStorage(): Storage {
  const memory = new Map<string, string>();

  const hasLynx = typeof lynx !== 'undefined';

  return {
    getItem(key) {
      if (memory.has(key)) return memory.get(key) ?? null;
      if (hasLynx) {
        try {
          return lynx!.getSessionStorageItem(key);
        } catch {
          return null;
        }
      }
      return null;
    },
    setItem(key, value) {
      memory.set(key, value);
      if (hasLynx) {
        try {
          lynx!.setSessionStorageItem(key, value);
        } catch {
          /* el espejo es best-effort */
        }
      }
    },
    removeItem(key) {
      memory.delete(key);
      if (hasLynx) {
        try {
          lynx!.setSessionStorageItem(key, '');
        } catch {
          /* noop */
        }
      }
    },
    keys(prefix) {
      const out: string[] = [];
      for (const k of memory.keys()) {
        if (k.startsWith(prefix)) out.push(k);
      }
      return out;
    },
  };
}

let shared: Storage | null = null;

/** Storage compartido de la app (singleton perezoso). */
export function getStorage(): Storage {
  if (!shared) shared = createSessionStorage();
  return shared;
}

/** Para tests: permite inyectar un storage limpio. */
export function setStorageForTesting(storage: Storage | null): void {
  shared = storage;
}
