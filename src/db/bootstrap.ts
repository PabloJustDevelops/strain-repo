import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import * as schema from './schema';
import { runMigrations } from '@db/migrations';
import { seedExercises } from '@db/seed';
import { createRepos, type Repos } from './repos';
import { publishRepos } from './registry';
import type { RawSqlite } from './seam';

const DB_NAME = 'strain.db';

/** Adapter del handle crudo de expo-sqlite a la seam `RawSqlite`. */
export function rawFromExpoSqlite(sqlite: SQLiteDatabase): RawSqlite {
  return {
    exec(sql) {
      sqlite.execSync(sql);
    },
    all<T>(sql: string): T[] {
      return sqlite.getAllSync<T>(sql);
    },
  };
}

let bootstrapping: Promise<Repos> | null = null;

/**
 * Composition root de producción.
 *
 * Abre expo-sqlite, aplica los PRAGMAs, corre las migraciones, siembra el
 * catálogo y publica la capa de datos. Idempotente: llamarla dos veces devuelve
 * la misma promesa.
 *
 * En web abre con `openDatabaseAsync` para que el Worker de WASM SQLite esté
 * listo antes de los `execSync` (si no, el spin-loop síncrono da timeout).
 */
export async function bootstrapProductionDatabase(): Promise<Repos> {
  if (!bootstrapping) {
    bootstrapping = (async () => {
      const sqlite = await openDatabaseAsync(DB_NAME);

      sqlite.execSync('PRAGMA journal_mode = WAL;');
      sqlite.execSync('PRAGMA foreign_keys = ON;');
      sqlite.execSync('PRAGMA synchronous = NORMAL;');
      sqlite.execSync('PRAGMA temp_store = MEMORY;');

      const raw = rawFromExpoSqlite(sqlite);
      runMigrations(raw);

      const seam = drizzle(sqlite, { schema, logger: __DEV__ });
      const repos = createRepos(seam);
      await seedExercises(repos.exercises);

      publishRepos(repos);

      return repos;
    })().catch((err) => {
      // Un fallo de arranque no se traga: se propaga con su causa real. Además
      // se limpia el cache para poder reintentar desde la pantalla de error.
      bootstrapping = null;
      throw err;
    });
  }

  return bootstrapping;
}
