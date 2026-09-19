import { createNativeStorage, type StorageModule } from './nativeStorage';

/**
 * Seam de persistencia para Lynx.
 *
 * Lynx NO trae SQLite out-of-the-box. La implementación de producción es el
 * módulo nativo SQLite del host (`specs/001`), adaptado en `nativeStorage.ts`.
 * El respaldo de sesión (`setSessionStorageItem`/`getSessionStorageItem`) se
 * conserva solo para donde no hay puente nativo: Lynx for Web y el runner de
 * tests.
 *
 * La seam es **asíncrona** porque el puente también lo es: los métodos de un
 * `LynxModule` contestan por callback y no se puede fingir lo contrario sin
 * bloquear el hilo de UI. Los repos ya devolvían promesas, así que el cambio es
 * mecánico y el tipo deja de mentir.
 */

export interface Storage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  /** Lista todas las claves con un prefijo (para consultas por tabla). */
  keys(prefix: string): Promise<string[]>;
}

/** Declaración mínima del objeto global `lynx` que expone el engine. */
interface LynxGlobal {
  getSessionStorageItem(key: string): string | null;
  setSessionStorageItem(key: string, value: string): void;
}

declare const lynx: LynxGlobal | undefined;

/**
 * Los módulos nativos registrados por el host se alcanzan por el global
 * `NativeModules` (ver `host/android/README.md`): `NativeModules.StorageModule`.
 * No es `lynx.getJSModule`, que resuelve emisores de eventos.
 */
declare const NativeModules: Record<string, StorageModule | undefined> | undefined;

/**
 * Storage en memoria + espejo en el session storage de Lynx cuando está
 * disponible. **No es durable**: se pierde al cerrar la card. Vive solo para el
 * runner de tests y el target web, donde no hay módulo nativo.
 */
export function createSessionStorage(): Storage {
  const memory = new Map<string, string>();

  const hasLynx = typeof lynx !== 'undefined';

  return {
    async getItem(key) {
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
    async setItem(key, value) {
      memory.set(key, value);
      if (hasLynx) {
        try {
          lynx!.setSessionStorageItem(key, value);
        } catch {
          /* el espejo es best-effort */
        }
      }
    },
    async removeItem(key) {
      memory.delete(key);
      if (hasLynx) {
        try {
          lynx!.setSessionStorageItem(key, '');
        } catch {
          /* noop */
        }
      }
    },
    async keys(prefix) {
      const out: string[] = [];
      for (const k of memory.keys()) {
        if (k.startsWith(prefix)) out.push(k);
      }
      return out;
    },
  };
}

/** Resuelve el módulo nativo registrado por el host; `null` si no hay puente. */
function nativeModule(): StorageModule | null {
  if (typeof NativeModules === 'undefined') return null;
  try {
    return NativeModules.StorageModule ?? null;
  } catch {
    // Sin host que lo registre (Lynx for Web): no es un fallo de durabilidad,
    // es una capacidad ausente, así que se cae al respaldo.
    return null;
  }
}

/**
 * Storage de producción: el adaptador durable cuando el host registró el módulo
 * nativo; el respaldo de sesión solo donde no hay puente. Un fallo al **abrir**
 * la base no cae al respaldo: se propaga, para que perder durabilidad no pase
 * inadvertido.
 */
async function createProductionStorage(): Promise<Storage> {
  const module = nativeModule();
  if (!module) return createSessionStorage();
  return createNativeStorage(module);
}

let injected: Storage | null = null;
let opening: Promise<Storage> | null = null;

/** Storage compartido de la app (singleton perezoso). */
export function getStorage(): Promise<Storage> {
  if (injected) return Promise.resolve(injected);
  if (!opening) {
    opening = createProductionStorage().catch((err: unknown) => {
      opening = null;
      throw err;
    });
  }
  return opening;
}

/** Para tests: inyecta un storage limpio (y `null` devuelve el de producción). */
export function setStorageForTesting(storage: Storage | null): void {
  injected = storage;
  if (!storage) opening = null;
}
