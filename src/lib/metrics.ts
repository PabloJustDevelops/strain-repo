import { sql, type AnyColumn, type SQL } from 'drizzle-orm';

/**
 * Métricas derivadas del entrenamiento (C1 del review de arquitectura).
 *
 * Una sola definición por fórmula, con dos consumidores que no pueden divergir:
 * las funciones puras (TS) y los fragmentos SQL. El test de equivalencia
 * (`metrics.test.ts`) corre ambos caminos sobre la misma tabla de casos, así que
 * tocar uno y no el otro rompe el test.
 *
 * Invariante: **todas las métricas de agregación cuentan sólo sets completados**.
 * `isCompleted` es obligatorio justamente para que no se pueda pasar una lista
 * sin filtrar.
 */

/** Lo mínimo que estas métricas necesitan de un set. */
export interface SetLike {
  weight: number;
  reps: number;
  isCompleted: boolean;
}

/**
 * 1RM estimado con la fórmula de Epley.
 *
 * `reps <= 0` no es un set: devuelve 0. `reps === 1` devuelve el propio peso,
 * porque Epley sobreestimaría ~3.3% en el único caso que la fórmula no modela.
 */
export function estimateOneRm(weight: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/**
 * El 1RM a mostrar mientras se edita un set: `null` cuando todavía no hay set
 * que estimar (`weight <= 0` o `reps <= 0`). El consumidor usa ese `null` para no
 * mostrar nada; no se sintetiza un 0.
 *
 * Reusa `estimateOneRm`, así el número en vivo no puede divergir del que deciden
 * los PRs y el histórico.
 */
export function oneRmPreview(weight: number, reps: number): number | null {
  if (weight <= 0 || reps <= 0) return null;
  return estimateOneRm(weight, reps);
}

/** Volumen de un set. */
export function setVolume(weight: number, reps: number): number {
  return weight * reps;
}

/** Totales de un conjunto de sets. */
export interface SessionTotals {
  volume: number;
  completedSets: number;
}

/** Totales de un conjunto de sets. Una sola definición del agregado. */
export function sessionTotals(sets: readonly SetLike[]): SessionTotals {
  let volume = 0;
  let completedSets = 0;
  for (const s of sets) {
    if (!s.isCompleted) continue;
    volume += s.weight * s.reps;
    completedSets++;
  }
  return { volume, completedSets };
}

/** El set completado con mayor 1RM estimado. En empate gana el primero. */
export function bestByOneRm<T extends SetLike>(sets: readonly T[]): T | null {
  let best: T | null = null;
  let bestOneRm = -1;
  for (const s of sets) {
    if (!s.isCompleted) continue;
    const oneRm = estimateOneRm(s.weight, s.reps);
    if (oneRm > bestOneRm) {
      bestOneRm = oneRm;
      best = s;
    }
  }
  return best;
}

/** El set completado más pesado. En empate gana el primero. */
export function heaviestSet<T extends SetLike>(sets: readonly T[]): T | null {
  let best: T | null = null;
  for (const s of sets) {
    if (!s.isCompleted) continue;
    if (best === null || s.weight > best.weight) best = s;
  }
  return best;
}

/** Los N ejercicios con más volumen en sets completados, ya ordenados desc. */
export function topByVolume<T extends { sets: readonly SetLike[] }>(
  exercises: readonly T[],
  limit: number,
): { exercise: T; volume: number }[] {
  return exercises
    .map((exercise) => ({ exercise, volume: sessionTotals(exercise.sets).volume }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, limit);
}

/**
 * La expresión de 1RM como fragmento SQL.
 *
 * Espeja `estimateOneRm` exacto, incluidos los bordes — de ahí el `CASE`. Es una
 * factory que recibe las columnas (en vez de referenciar el schema) para que
 * `src/lib/` no dependa de la base y el fragmento sirva para cualquier tabla con
 * `weight`/`reps`.
 */
export function oneRmSql(weight: AnyColumn, reps: AnyColumn): SQL<number> {
  return sql<number>`CASE WHEN ${reps} <= 0 THEN 0 WHEN ${reps} = 1 THEN ${weight} ELSE ${weight} * (1 + ${reps} / 30.0) END`;
}

/** La expresión de volumen como fragmento SQL. Espeja `setVolume`. */
export function setVolumeSql(weight: AnyColumn, reps: AnyColumn): SQL<number> {
  return sql<number>`${weight} * ${reps}`;
}
