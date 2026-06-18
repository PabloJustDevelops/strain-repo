/**
 * Script para aplicar migraciones manualmente (uso CLI).
 * Equivalente a invocar db:migrate en package.json.
 *
 * Uso: npx tsx scripts/migrate.ts
 */

import { runMigrations } from '../src/db/migrations';

console.log('[strain] Aplicando migraciones...');
try {
  runMigrations();
  console.log('[strain] Migraciones aplicadas con éxito.');
} catch (err) {
  console.error('[strain] Error aplicando migraciones:', err);
  process.exit(1);
}
