import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type * as schema from './schema';

/**
 * La interface que recibe cada repo factory (ver D10 en `docs/07-decisions.md`).
 *
 * Un solo alias alcanza a los dos adapters: `expo-sqlite` en producción y
 * `better-sqlite3` en tests y scripts. Ambos extienden
 * `BaseSQLiteDatabase<'sync', TRunResult, TSchema>` y difieren sólo en
 * `TRunResult`, que ningún repo lee — por eso `unknown` los cubre sin cast.
 */
export type SqliteDb = BaseSQLiteDatabase<'sync', unknown, typeof schema>;

/**
 * Lo mínimo que las migraciones necesitan del handle crudo de SQLite.
 *
 * Existe porque las APIs crudas de los dos drivers son estructuralmente
 * distintas: expo-sqlite expone `execSync`/`getAllSync`, better-sqlite3 expone
 * `exec`/`prepare().all()`. Dos adapters justifican la seam.
 */
export interface RawSqlite {
  exec(sql: string): void;
  all<T>(sql: string): T[];
}
