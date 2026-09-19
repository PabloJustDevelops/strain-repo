import type { Storage } from './storage';

/**
 * Store clave-valor genérico por "tabla" sobre la seam `Storage`.
 *
 * Reemplaza la mecánica común de Drizzle (insert/select/update/delete por PK)
 * que los cuatro repos comparten. Lo relacional (joins, agregados) lo resuelve
 * cada repo en memoria a partir de estas primitivas.
 *
 * El listado sale de `storage.keys(prefix)`, que el adaptador nativo resuelve con
 * una consulta; por eso no hace falta mantener un índice aparte (la versión
 * anterior guardaba `__index__` con una lectura-modificación por escritura, que
 * además era racy).
 *
 * Los campos `Date` se serializan a ISO en el JSON y se rehidratan al leer,
 * porque `JSON.stringify` los convierte a string. `dateFields` declara cuáles.
 */
export interface KvStore<Row extends { id: string }> {
  all(): Promise<Row[]>;
  byId(id: string): Promise<Row | undefined>;
  put(row: Row): Promise<void>;
  remove(id: string): Promise<void>;
  count(): Promise<number>;
  clear(): Promise<void>;
}

export function createKvStore<Row extends { id: string }>(
  storage: Storage,
  table: string,
  dateFields: readonly (keyof Row)[] = [],
): KvStore<Row> {
  const prefix = `${table}:`;

  function hydrate(raw: string): Row | undefined {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      // Descarta filas corruptas o restos del `__index__` del almacén anterior.
      if (typeof parsed.id !== 'string') return undefined;
      for (const field of dateFields) {
        const key = field as string;
        const value = parsed[key];
        if (typeof value === 'string') parsed[key] = new Date(value);
      }
      return parsed as Row;
    } catch {
      return undefined;
    }
  }

  return {
    async all() {
      const out: Row[] = [];
      for (const key of await storage.keys(prefix)) {
        const raw = await storage.getItem(key);
        if (!raw) continue;
        const row = hydrate(raw);
        if (row) out.push(row);
      }
      return out;
    },

    async byId(id) {
      const raw = await storage.getItem(prefix + id);
      return raw ? hydrate(raw) : undefined;
    },

    async put(row) {
      await storage.setItem(prefix + row.id, JSON.stringify(row));
    },

    async remove(id) {
      await storage.removeItem(prefix + id);
    },

    async count() {
      return (await storage.keys(prefix)).length;
    },

    async clear() {
      for (const key of await storage.keys(prefix)) await storage.removeItem(key);
    },
  };
}
