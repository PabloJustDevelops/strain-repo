import { sessionTotals } from '@lib/metrics';

import type { Exercise, SessionExercise, Set as DbSet, WorkoutSession } from './schema';
import type { Equipment, MuscleGroup } from '@/types/domain';

/**
 * Las formas que ve la UI, y la **única** forma de llegar a ellas desde una fila.
 *
 * Qué es fila y qué es DTO está en `CONTEXT.md`. La regla que este module existe
 * para sostener: el mapeo no inventa nombres ni descarta campos declarados.
 */

/** Lo que ve la UI de un set: la fila, angostada. Mismos nombres, sin mapeo. */
export type SetView = Pick<
  DbSet,
  'id' | 'setIndex' | 'setType' | 'weight' | 'reps' | 'isCompleted' | 'rpe' | 'notes' | 'completedAt'
>;

/** Fila completa de sesión, tal como la devuelve `SessionsRepo.getFullSession`. */
export type FullSessionRow = {
  session: WorkoutSession;
  exercises: (SessionExercise & { exercise: Exercise; sets: DbSet[] })[];
};

/** Un ejercicio dentro de una sesión activa, con su ejercicio denormalizado. */
export interface SessionExerciseView {
  id: string;
  exerciseId: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  orderIndex: number;
  supersetGroup: string | null;
  notes: string | null;
  sets: SetView[];
  /**
   * Targets de la rutina, copiados al iniciar la sesión (ver D11).
   *
   * `null` = la sesión no vino de una rutina. `targetSets` es la intención del
   * plan, no `sets.length`: el conteo real de sets está en `sets`.
   */
  targetSets: number | null;
  targetReps: string | null;
  restSeconds: number | null;
}

/** Sesión activa completa para la UI. */
export interface ActiveSessionView {
  id: string;
  name: string;
  startedAt: Date;
  elapsedSeconds: number;
  exercises: SessionExerciseView[];
  totalVolume: number;
  totalSets: number;
  completedSets: number;
}

/** La forma que consumen el historial y la tarjeta compartible. */
export interface SessionExerciseSummary {
  id: string;
  name: string;
  sets: SetView[];
}

/**
 * Pasar de una sesión de la base a la UI del modo activo.
 *
 * `now` es parámetro para que el mapeo sea **puro**: sin él, `elapsedSeconds`
 * dependería del reloj y no se podría testear de forma determinista.
 */
export function toActiveSessionView(
  full: FullSessionRow,
  now: Date = new Date()
): ActiveSessionView {
  // Los totales salen de los sets que se están mapeando, no de la fila cacheada:
  // así lo que la UI muestra no puede discrepar de lo que renderiza.
  const totals = sessionTotals(full.exercises.flatMap((ex) => ex.sets));

  return {
    id: full.session.id,
    name: full.session.name,
    startedAt: full.session.startedAt,
    elapsedSeconds: Math.max(
      0,
      Math.floor((now.getTime() - full.session.startedAt.getTime()) / 1000)
    ),
    exercises: full.exercises.map((ex) => ({
      id: ex.id,
      exerciseId: ex.exerciseId,
      name: ex.exercise.name,
      muscleGroup: ex.exercise.muscleGroup as MuscleGroup,
      equipment: ex.exercise.equipment as Equipment,
      orderIndex: ex.orderIndex,
      supersetGroup: ex.supersetGroup,
      notes: ex.notes,
      targetSets: ex.targetSets,
      targetReps: ex.targetReps,
      restSeconds: ex.restSeconds,
      // Sin mapeo: la fila ya satisface `SetView`.
      sets: ex.sets,
    })),
    totalVolume: totals.volume,
    totalSets: totals.completedSets,
    completedSets: totals.completedSets,
  };
}

/**
 * La proyección que consumen el historial y la tarjeta compartible.
 *
 * Devuelve **los mismos sets** que `toActiveSessionView`, para que no vuelva a
 * existir una tercera forma del mismo concepto.
 */
export function toExerciseSummaries(full: FullSessionRow): SessionExerciseSummary[] {
  return full.exercises.map((ex) => ({
    id: ex.id,
    name: ex.exercise.name,
    sets: ex.sets,
  }));
}
