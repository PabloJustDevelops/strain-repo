import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import * as schema from '../schema';
import { runMigrations } from '../migrations';
import { createRepos, type Repos } from '../repos';
import type { RawSqlite, SqliteDb } from '../seam';

/**
 * El segundo adapter de la seam: better-sqlite3 sobre Node.
 *
 * Sólo los tests y los scripts importan este módulo. La app usa
 * `bootstrap.ts` (expo-sqlite). Es el adapter que hace testeable al data layer
 * sin un device.
 */
export interface BetterSqliteStack {
  repos: Repos;
  seam: SqliteDb;
  raw: RawSqlite;
  close(): void;
}

/** Adapter del handle crudo de better-sqlite3 a la seam `RawSqlite`. */
export function rawFromBetterSqlite(sqlite: Database.Database): RawSqlite {
  return {
    exec(sql) {
      sqlite.exec(sql);
    },
    all<T>(sql: string): T[] {
      return sqlite.prepare(sql).all() as T[];
    },
  };
}

function open(sqlite: Database.Database): BetterSqliteStack {
  // `foreign_keys = ON` replica producción: es el PRAGMA que cambia semántica, y
  // sin él los tests no verían violaciones de integridad que sí fallan en el
  // device. Los otros PRAGMAs de producción (WAL, synchronous, temp_store) son
  // knobs de rendimiento sin efecto observable en un test.
  sqlite.pragma('foreign_keys = ON');

  const raw = rawFromBetterSqlite(sqlite);
  runMigrations(raw);

  const seam: SqliteDb = drizzle(sqlite, { schema });

  return {
    repos: createRepos(seam),
    seam,
    raw,
    close: () => {
      sqlite.close();
    },
  };
}

/** SQLite in-memory con el schema real, ya migrado. Una instancia por test. */
export function openInMemoryDatabase(): BetterSqliteStack {
  return open(new Database(':memory:'));
}

/**
 * SQLite de archivo, ya migrado. Para scripts (CI y desarrollo).
 *
 * Ojo: no es la DB del device — esa vive en el sandbox de la app.
 */
export function openFileDatabase(path: string): BetterSqliteStack {
  return open(new Database(path));
}
