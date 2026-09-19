import type { Storage } from './storage';

/**
 * Adaptador durable de la seam `Storage` sobre el módulo nativo SQLite del host
 * (ticket 2 de `specs/001`).
 *
 * **Por qué asíncrono.** Los métodos de un `LynxModule` no devuelven: contestan
 * por callback, una única vez, con el envelope `{ ok: true, data }` o
 * `{ ok: false, error }`. `invoke` convierte esa llamada en una Promise y, ante
 * un error, **rechaza con el código y el mensaje del módulo**: ninguna escritura
 * fallida se traga, para que perder durabilidad se vea.
 *
 * **Formato.** Una única tabla `kv` (`key` primaria, `value` con el JSON que ya
 * guardaba cada entidad). `keys(prefix)` se resuelve con `LIKE ?` sobre la clave,
 * que recorre el índice de la primaria al ser un patrón de prefijo literal; una
 * columna de prefijo aparte habría que derivarla y mantenerla en cada escritura
 * sin ganar nada.
 *
 * **Migración.** El almacén anterior (memoria + session storage) no era durable,
 * así que no hay datos que traer: esta tabla nace vacía y el catálogo se vuelve a
 * sembrar. Ver `host/android/README.md`.
 */

/** Fila que devuelve `query`: una entrada por columna. */
export type NativeRow = Record<string, unknown>;

/** Envelope de respuesta del módulo (ver `host/android/README.md`). */
export type NativeResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

/** Callback de un `@LynxMethod`: se invoca exactamente una vez. */
export type NativeCallback<T> = (response: NativeResponse<T>) => void;

/** Valor de un parámetro `?` en una sentencia parametrizada. */
export type NativeParam = string | number | null;

/** Operación de `transaction`. */
export interface NativeSqlOperation {
  sql: string;
  params: NativeParam[];
}

/** Superficie del `StorageModule` del host, tal como la declara su README. */
export interface StorageModule {
  open(dbName: string, callback: NativeCallback<null>): void;
  close(callback: NativeCallback<null>): void;
  execute(sql: string, params: NativeParam[] | null, callback: NativeCallback<number>): void;
  query(sql: string, params: NativeParam[] | null, callback: NativeCallback<NativeRow[]>): void;
  transaction(operations: NativeSqlOperation[], callback: NativeCallback<number[]>): void;
}

/** Error del módulo nativo, con su código estable (`SQLITE_FULL`, `DB_NOT_OPEN`…). */
export class NativeStorageError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'NativeStorageError';
    this.code = code;
  }
}

const CREATE_TABLE =
  'CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)';
const SELECT_VALUE = 'SELECT value FROM kv WHERE key = ? LIMIT 1';
const SELECT_KEYS = "SELECT key FROM kv WHERE key LIKE ? ESCAPE '\\'";
const UPSERT_VALUE = 'INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)';
const DELETE_KEY = 'DELETE FROM kv WHERE key = ?';

/** Convierte una llamada con callback en una Promise, propagando el error nativo. */
function invoke<T>(call: (callback: NativeCallback<T>) => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    call((response) => {
      if (response.ok) resolve(response.data);
      else reject(new NativeStorageError(response.error.code, response.error.message));
    });
  });
}

/** Escapa los metacaracteres de `LIKE` y cierra el patrón con `%`. */
function likePrefix(prefix: string): string {
  return `${prefix.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
}

/**
 * Abre (o crea) la base, asegura la tabla clave-valor y devuelve la seam lista
 * para usar. Si abrir falla, el error se propaga: no hay estado "sin abrir".
 */
export async function createNativeStorage(
  module: StorageModule,
  dbName = 'strain.db',
): Promise<Storage> {
  await invoke((callback) => module.open(dbName, callback));
  await invoke((callback) => module.execute(CREATE_TABLE, null, callback));

  return {
    async getItem(key) {
      const rows = await invoke<NativeRow[]>((callback) =>
        module.query(SELECT_VALUE, [key], callback),
      );
      const value = rows[0]?.value;
      return typeof value === 'string' ? value : null;
    },

    async setItem(key, value) {
      await invoke((callback) => module.execute(UPSERT_VALUE, [key, value], callback));
    },

    async removeItem(key) {
      await invoke((callback) => module.execute(DELETE_KEY, [key], callback));
    },

    async keys(prefix) {
      const rows = await invoke<NativeRow[]>((callback) =>
        module.query(SELECT_KEYS, [likePrefix(prefix)], callback),
      );
      return rows
        .map((row) => row.key)
        .filter((key): key is string => typeof key === 'string');
    },
  };
}
