/**
 * Aplica el array de migraciones a un SQLite de archivo. Uso CLI y CI.
 *
 * Ojo: NO es la DB del device — esa vive en el sandbox de la app. Este script
 * sirve para verificar que las migraciones aplican limpio sobre una DB vacía.
 *
 * Uso: pnpm db:migrate   (STRAIN_DB_PATH para cambiar el archivo)
 */

import { openFileDatabase } from '../src/db/testing/better-sqlite';

const DB_PATH = process.env.STRAIN_DB_PATH ?? 'strain.db';

try {
  const db = openFileDatabase(DB_PATH);
  const rows = db.raw.all<{ n: number }>('SELECT COUNT(*) as n FROM _migrations');
  console.log(`[strain] ${DB_PATH} al día: ${rows[0]?.n ?? 0} migración(es) aplicada(s).`);
  db.close();
} catch (err) {
  console.error('[strain] Error aplicando migraciones:', err);
  process.exit(1);
}
