import type { ActiveSessionView } from '@db/shapes';
import { heaviestSet, sessionTotals } from './metrics';

/**
 * El resumen de una sesión terminada, construido una sola vez.
 *
 * Lo consumen la pantalla de cierre (`workout/finish`) y la tarjeta compartible
 * (`WorkoutSummaryCard`), y la pantalla de cierre no puede leer la sesión activa
 * porque el store la limpia al finalizar: por eso el resumen se calcula antes y
 * se guarda en el store.
 *
 * Puro y sin data layer: los PRs entran como datos estructurales, así que el
 * cálculo se testea sin tocar la seam KV.
 */

/** PR mínimo que el resumen necesita. Estructural a propósito. */
export interface PrLike {
  exerciseId: string;
  value: number;
  achievedAt: Date;
}

export interface SummaryExercise {
  id: string;
  name: string;
  completedSets: number;
  totalSets: number;
  volume: number;
  /** Set completado más pesado del ejercicio, o `null` si no completó ninguno. */
  best: { weight: number; reps: number } | null;
}

export interface SummaryPr {
  exerciseId: string;
  exerciseName: string;
  value: number;
}

export interface WorkoutSummary {
  sessionId: string;
  name: string;
  startedAt: Date;
  endedAt: Date;
  durationSeconds: number;
  totalVolume: number;
  completedSets: number;
  totalSets: number;
  exercises: SummaryExercise[];
  prs: SummaryPr[];
}

/**
 * Los PRs que se batieron durante la sesión.
 *
 * `PersonalRecord` no guarda la sesión, así que la pertenencia se reconstruye por
 * ejercicio + ventana temporal: un PR logrado entre el arranque y el cierre es de
 * esta sesión. Los PRs vienen de `sessions.finish()`, que corre justo antes.
 */
export function prsAchievedIn(
  prs: readonly PrLike[],
  session: { startedAt: Date; endedAt: Date; exerciseIds: readonly string[] }
): PrLike[] {
  const ids = new Set(session.exerciseIds);

  return prs.filter(
    (pr) =>
      ids.has(pr.exerciseId) &&
      pr.achievedAt >= session.startedAt &&
      pr.achievedAt <= session.endedAt
  );
}

/** Los totales de un ejercicio y su mejor set, con los mismos agregados que el resto de la app. */
function summarizeExercise(exercise: ActiveSessionView['exercises'][number]): SummaryExercise {
  const totals = sessionTotals(exercise.sets);
  const best = heaviestSet(exercise.sets);

  return {
    id: exercise.id,
    name: exercise.name,
    completedSets: totals.completedSets,
    totalSets: exercise.sets.length,
    volume: totals.volume,
    best: best ? { weight: best.weight, reps: best.reps } : null,
  };
}

/** El resumen completo de la sesión activa en el momento de cerrarla. */
export function buildWorkoutSummary(
  session: ActiveSessionView,
  endedAt: Date,
  prs: readonly PrLike[] = []
): WorkoutSummary {
  const exercises = session.exercises.map(summarizeExercise);
  const totals = sessionTotals(session.exercises.flatMap((ex) => ex.sets));
  const names = new Map(session.exercises.map((ex) => [ex.exerciseId, ex.name]));

  const achieved = prsAchievedIn(prs, {
    startedAt: session.startedAt,
    endedAt,
    exerciseIds: session.exercises.map((ex) => ex.exerciseId),
  });

  return {
    sessionId: session.id,
    name: session.name,
    startedAt: session.startedAt,
    endedAt,
    durationSeconds: Math.max(0, Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000)),
    totalVolume: totals.volume,
    completedSets: totals.completedSets,
    totalSets: session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0),
    exercises,
    prs: achieved
      .map((pr) => ({
        exerciseId: pr.exerciseId,
        exerciseName: names.get(pr.exerciseId) ?? 'Ejercicio',
        value: pr.value,
      }))
      .sort((a, b) => b.value - a.value),
  };
}
