/**
 * Migra y siembra el catálogo base en un SQLite de archivo. Uso CLI y CI.
 *
 * Uso: pnpm db:seed   (STRAIN_DB_PATH para cambiar el archivo)
 */

import { seedExercises } from '../src/db/seed';
import { openFileDatabase } from '../src/db/testing/better-sqlite';

const DB_PATH = process.env.STRAIN_DB_PATH ?? 'strain.db';

(async () => {
  try {
    const db = openFileDatabase(DB_PATH);
    await seedExercises(db.repos.exercises);
    console.log(`[strain] Ejercicios en ${DB_PATH}: ${await db.repos.exercises.count()}`);
    db.close();
  } catch (err) {
    console.error('[strain] Error en seed:', err);
    process.exit(1);
  }
})();
