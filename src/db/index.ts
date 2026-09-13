/**
 * Superficie pública del data layer: `getRepos()`.
 *
 * `createRepos()` es la seam para tests y scripts; `publishRepos()` no se expone,
 * así que el camino de escritura del registro queda fuera de la interface.
 */
export { getRepos } from './registry';

export type { Repos } from './repos';

export type { FullSession, SessionTargetInput, SessionsRepo } from './repos';

export type { RawSqlite, SqliteDb } from './seam';
