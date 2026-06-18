import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import * as schema from './schema';

/**
 * Cliente SQLite de Strain.
 *
 * Características clave:
 * - Singleton: una sola conexión por ciclo de vida de la app.
 * - Habilita WAL para mejor rendimiento en lecturas concurrentes.
 * - Activa foreign_keys (en SQLite están off por defecto).
 * - Usa Drizzle para queries 100% type-safe.
 *
 * Uso:
 *   import { db } from '@db/client';
 *   const rows = await db.select().from(schema.exercises);
 */

const DB_NAME = 'strain.db';

// Conexión única reutilizable entre invocaciones de Fast Refresh
let cachedDb: ReturnType<typeof drizzle<typeof schema>> | null = null;
let cachedRawDb: SQLiteDatabase | null = null;

/** Abre la BD SQLite y devuelve una conexión Drizzle inicializada. */
export function getDatabase() {
  if (cachedDb) return cachedDb;

  const sqlite = openDatabaseSync(DB_NAME);

  // PRAGMAs recomendados para apps móviles con mucha escritura
  sqlite.execSync('PRAGMA journal_mode = WAL;');
  sqlite.execSync('PRAGMA foreign_keys = ON;');
  sqlite.execSync('PRAGMA synchronous = NORMAL;');
  sqlite.execSync('PRAGMA temp_store = MEMORY;');

  cachedRawDb = sqlite;
  cachedDb = drizzle(sqlite, { schema, logger: __DEV__ });
  return cachedDb;
}

export const db = getDatabase();

/** Acceso al cliente SQLite nativo para migraciones o PRAGMAs avanzados. */
export function getRawDb() {
  if (!cachedRawDb) getDatabase();
  return cachedRawDb!;
}

export { schema };
