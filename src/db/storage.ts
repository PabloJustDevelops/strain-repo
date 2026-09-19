import { createNativeStorage, type StorageModule } from './nativeStorage';

/**
 * Seam de persistencia para Lynx.
 *
 * Lynx NO trae SQLite out-of-the-box. La implementación de producción es el
 * módulo nativo SQLite del host (`specs/001`), adaptado en `nativeStorage.ts`.
 *
 * **No hay respaldo.** Si el módulo nativo falta fuera del modo preview, abrir
 * el almacenamiento **falla con su causa** (ticket 5): arrancar en memoria y
 * seguir como si tal cosa era el fallo silencioso que este ticket retira. El
 * almacén efímero se conserva solo como **modo preview** declarado, para los
 * targets que no pueden tener el puente nativo: Lynx for Web y Lynx Explorer
 * sobre el servidor de desarrollo. El reparto está documentado en
 * `docs/12-entorno-desarrollo-lynx.md`.
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

/**
 * Bandera de compilación que declara el **modo preview**.
 *
 * La fija `lynx.config.ts` por entorno: `true` en `web` (que nunca tiene el
 * módulo nativo) y en el build de desarrollo del target `lynx` —el que sirve
 * `bun run dev` al QR de Lynx Explorer—, y `false` en el bundle de producción
 * que embebe el APK del host. En el runner de tests la fija `vitest.config.mts`.
 *
 * Se consulta con `typeof` para que un build sin la bandera caiga en producción
 * (que falla ruidosamente) y nunca en preview por accidente.
 */
declare const __PREVIEW_STORAGE__: boolean;

/** `true` solo en un build de preview (Lynx for Web o el dev server). */
export function isPreviewStorage(): boolean {
  return typeof __PREVIEW_STORAGE__ !== 'undefined' && __PREVIEW_STORAGE__ === true;
}

/**
 * Los módulos nativos registrados por el host se alcanzan por el global
 * `NativeModules` (ver `host/android/README.md`): `NativeModules.StorageModule`.
 * No es `lynx.getJSModule`, que resuelve emisores de eventos.
 */
declare const NativeModules: Record<string, StorageModule | undefined> | undefined;

/**
 * Almacenamiento **efímero** del modo preview: un `Map` que se pierde al cerrar
 * la card. No es durable y no lo pretende; existe para que el bucle de preview
 * (navegador y Lynx Explorer por QR) pueda arrancar sin el módulo nativo.
 */
export function createPreviewStorage(): Storage {
  const memory = new Map<string, string>();

  return {
    async getItem(key) {
      return memory.get(key) ?? null;
    },
    async setItem(key, value) {
      memory.set(key, value);
    },
    async removeItem(key) {
      memory.delete(key);
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
  return NativeModules.StorageModule ?? null;
}

/** Arranque sin módulo nativo y fuera de preview: no hay dónde escribir. */
export class StorageUnavailableError extends Error {
  constructor() {
    super(
      'StorageModule no está registrado y este build no es de preview: la app ' +
        'nativa solo arranca con almacenamiento durable. El host lo registra en ' +
        'StrainApplication; para el bucle de preview, usa `bun run dev`.',
    );
    this.name = 'StorageUnavailableError';
  }
}

/**
 * Storage de producción: el adaptador durable sobre el módulo nativo. Si el
 * módulo no está, **lanza**; no hay camino a memoria. Un fallo al abrir la base
 * tampoco se traga: sube con su código y su mensaje.
 */
export async function createProductionStorage(module: StorageModule | null): Promise<Storage> {
  if (!module) throw new StorageUnavailableError();
  return createNativeStorage(module);
}

/**
 * Elige el storage del arranque. El módulo nativo **siempre gana**: cuando el
 * host lo registró, hasta un build de preview usa el almacén durable. El modo
 * preview solo entra donde no hay puente; fuera del modo preview, su ausencia es
 * un fallo de arranque, no un respaldo.
 */
export async function selectStorage(
  preview: boolean,
  module: StorageModule | null,
): Promise<Storage> {
  if (module) return createNativeStorage(module);
  if (preview) return createPreviewStorage();
  return createProductionStorage(module);
}

let injected: Storage | null = null;
let opening: Promise<Storage> | null = null;

/**
 * Storage compartido de la app (singleton perezoso). Se resuelve una vez.
 *
 * En modo preview avisa por consola de que el almacén es efímero: que el modo
 * sea declarado y **visible**, no un respaldo que pasa desapercibido (ticket 5).
 */
export function getStorage(): Promise<Storage> {
  if (injected) return Promise.resolve(injected);
  if (!opening) {
    const module = nativeModule();
    const preview = !module && isPreviewStorage();
    if (preview) {
      console.warn(
        '[strain] almacenamiento de PREVIEW: efímero, se pierde al cerrar. ' +
          'Los datos solo sirven para previsualizar (Lynx for Web o Lynx Explorer).',
      );
    }
    opening = selectStorage(preview, module).catch((err: unknown) => {
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
