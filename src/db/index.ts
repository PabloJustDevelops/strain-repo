import { createAnalyticsRepo, type AnalyticsRepo } from './analyticsRepo';
import { createExercisesRepo, type ExercisesRepo } from './exercisesRepo';
import { createRoutinesRepo, type RoutinesRepo } from './routinesRepo';
import { seedExercises } from './seed';
import { createSessionsRepo, type SessionsRepo } from './sessionsRepo';
import { getStorage } from './storage';
import type { Storage } from './storage';

/**
 * La seam completa del data layer Lynx. Misma superficie que la app anterior:
 * `createRepos` compone los cuatro repos sobre un `Storage`; `getRepos` es el
 * punto de acceso de los call sites. Persistencia KV (ver `storage.ts`).
 */
export interface Repos {
  exercises: ExercisesRepo;
  routines: RoutinesRepo;
  sessions: SessionsRepo;
  analytics: AnalyticsRepo;
}

export function createRepos(storage: Storage): Repos {
  return {
    exercises: createExercisesRepo(storage),
    routines: createRoutinesRepo(storage),
    sessions: createSessionsRepo(storage),
    analytics: createAnalyticsRepo(storage),
  };
}

let current: Repos | null = null;

/** Publica la capa de datos de producción (solo la llama el bootstrap). */
export function publishRepos(repos: Repos): void {
  current = repos;
}

/** Punto de acceso de los call sites. Lanza si se usa antes del bootstrap. */
export function getRepos(): Repos {
  if (!current) {
    throw new Error(
      'Data layer no inicializado. El árbol de pantallas se montó antes que el ' +
        'bootstrap, o algo llama a getRepos() durante el render: usalo en un efecto ' +
        'o en un handler, nunca en render.',
    );
  }
  return current;
}

let bootstrapping: Promise<Repos> | null = null;

/**
 * Composition root: compone los repos sobre el storage compartido, siembra el
 * catálogo y publica la capa de datos. Idempotente.
 *
 * La siembra corre ANTES de `publishRepos`: si se publicara primero, una pantalla
 * podría leer la biblioteca todavía vacía. Un fallo (de siembra incluido) no se
 * traga: se propaga con su causa y limpia el cache para poder reintentar.
 *
 * El primer `await getStorage()` abre la base durable del host; si el módulo
 * nativo no está, cae al respaldo de sesión (ver `storage.ts`).
 */
export function bootstrapDatabase(): Promise<Repos> {
  if (!bootstrapping) {
    bootstrapping = (async () => {
      const repos = createRepos(await getStorage());
      await seedExercises(repos.exercises);
      publishRepos(repos);
      return repos;
    })().catch((err) => {
      bootstrapping = null;
      throw err;
    });
  }
  return bootstrapping;
}

export type { FullSession, SessionTargetInput, SessionsRepo } from './sessionsRepo';
export type { ExercisesRepo } from './exercisesRepo';
export type { RoutinesRepo } from './routinesRepo';
export type { AnalyticsRepo } from './analyticsRepo';
export type { Storage } from './storage';
export { getStorage, setStorageForTesting } from './storage';
