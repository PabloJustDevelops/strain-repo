/**
 * Script para poblar la BD con ejercicios predefinidos.
 * Uso: npx tsx scripts/seed.ts
 */

import { runMigrations } from '../src/db/migrations';
import { seedExercises } from '../src/db/seed';
import { Repos } from '../src/db/repositories';

(async () => {
  try {
    console.log('[strain] Aplicando migraciones...');
    runMigrations();

    console.log('[strain] Sembrando ejercicios...');
    await seedExercises();

    const list = await Repos.exercises.list();
    console.log(`[strain] Total de ejercicios en BD: ${list.length}`);
  } catch (err) {
    console.error('[strain] Error en seed:', err);
    process.exit(1);
  }
})();
