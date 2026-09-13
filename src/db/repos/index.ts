import type { SqliteDb } from '../seam';

import { createAnalyticsRepo, type AnalyticsRepo } from './analytics';
import { createExercisesRepo, type ExercisesRepo } from './exercises';
import { createRoutinesRepo, type RoutinesRepo } from './routines';
import { createSessionsRepo, type SessionsRepo } from './sessions';

/**
 * La seam completa del data layer.
 *
 * Composición pura: `createRepos` no abre ni cierra ninguna conexión, sólo liga
 * los cuatro repos a la que recibe. Los tests la llaman una vez por test.
 */
export interface Repos {
  exercises: ExercisesRepo;
  routines: RoutinesRepo;
  sessions: SessionsRepo;
  analytics: AnalyticsRepo;
}

export function createRepos(db: SqliteDb): Repos {
  return {
    exercises: createExercisesRepo(db),
    routines: createRoutinesRepo(db),
    sessions: createSessionsRepo(db),
    analytics: createAnalyticsRepo(db),
  };
}

export type { AnalyticsRepo } from './analytics';
export type { ExercisesRepo } from './exercises';
export type { RoutinesRepo } from './routines';
export type { FullSession, SessionTargetInput, SessionsRepo } from './sessions';
