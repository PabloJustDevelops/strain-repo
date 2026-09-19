import type { Storage } from './storage';

/**
 * Store clave-valor genérico por "tabla" sobre la seam `Storage`.
 *
 * Reemplaza la mecánica común de Drizzle (insert/select/update/delete por PK)
 * que los cuatro repos comparten. Lo relacional (joins, agregados) lo resuelve
 * cada repo en memoria a partir de estas primitivas.
 *
 * Los campos `Date` se serializan a ISO en el JSON y se rehidratan al leer,
 * porque `JSON.stringify` los convierte a string. `dateFields` declara cuáles.
 */
export interface KvStore<Row extends { id: string }> {
  all(): Row[];
  byId(id: string): Row | undefined;
  put(row: Row): void;
  remove(id: string): void;
  count(): number;
  clear(): void;
}

export function createKvStore<Row extends { id: string }>(
  storage: Storage,
  table: string,
  dateFields: readonly (keyof Row)[] = [],
): KvStore<Row> {
  const prefix = `${table}:`;
  const indexKey = `${table}:__index__`;

  function readIndex(): string[] {
    const raw = storage.getItem(indexKey);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  }

  function writeIndex(ids: string[]): void {
    storage.setItem(indexKey, JSON.stringify(ids));
  }

  function hydrate(raw: string): Row | undefined {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
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
    all() {
      const out: Row[] = [];
      for (const id of readIndex()) {
        const raw = storage.getItem(prefix + id);
        if (!raw) continue;
        const row = hydrate(raw);
        if (row) out.push(row);
      }
      return out;
    },

    byId(id) {
      const raw = storage.getItem(prefix + id);
      return raw ? hydrate(raw) : undefined;
    },

    put(row) {
      storage.setItem(prefix + row.id, JSON.stringify(row));
      const ids = readIndex();
      if (!ids.includes(row.id)) {
        ids.push(row.id);
        writeIndex(ids);
      }
    },

    remove(id) {
      storage.removeItem(prefix + id);
      writeIndex(readIndex().filter((x) => x !== id));
    },

    count() {
      return readIndex().length;
    },

    clear() {
      for (const id of readIndex()) storage.removeItem(prefix + id);
      writeIndex([]);
    },
  };
}
