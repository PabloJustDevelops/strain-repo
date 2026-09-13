import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { openInMemoryDatabase, type BetterSqliteStack } from '../db/testing/better-sqlite';
import { importStrongCsv } from './exportImport';
import type { Repos } from '@db';

/**
 * CSV mínimo con la forma del export de Strong.
 *
 * Incluye un campo entrecomillado con coma (`"Push, Day"`) para ejercitar el
 * parser, y duraciones/fechas históricas reales — que es justo lo que el import
 * perdía.
 */
const STRONG_CSV = [
  'Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE',
  '2026-03-10 18:30:00,"Push, Day",3600,Bench Press,1,60,10,,,,"primer dia",7',
  '2026-03-10 18:30:00,"Push, Day",3600,Bench Press,2,80,5,,,,,8',
  '2026-03-10 18:30:00,"Push, Day",3600,Bench Press,3,90,3,,,,,9',
  '2026-03-10 18:30:00,"Push, Day",3600,Overhead Press,1,40,10,,,,,7',
].join('\n');

const WORKOUT_START = new Date('2026-03-10T18:30:00');

describe('importStrongCsv', () => {
  let db: BetterSqliteStack;
  let repos: Repos;

  beforeEach(() => {
    db = openInMemoryDatabase();
    repos = db.repos;
  });

  afterEach(() => {
    db.close();
  });

  it('reconstruye sesión, ejercicios y sets cruzando sólo la seam de repos', async () => {
    const result = await importStrongCsv(STRONG_CSV, repos);

    expect(result).toEqual({ workouts: 1, sets: 4, exercises: 2, skipped: 0 });

    const [session] = await repos.sessions.list(10);
    expect(session.name).toBe('Push, Day');
    expect(session.status).toBe('completed');
    expect(session.totalSets).toBe(4);
    // 60×10 + 80×5 + 90×3 + 40×10
    expect(session.totalVolume).toBe(1670);

    const full = await repos.sessions.getFullSession(session.id);
    expect(full!.exercises.map((e) => e.exercise.name)).toEqual(['Bench Press', 'Overhead Press']);
    expect(full!.exercises.map((e) => e.orderIndex)).toEqual([1, 2]);

    const bench = full!.exercises[0];
    expect(bench.sets.map((s) => s.setIndex)).toEqual([1, 2, 3]);
    expect(bench.sets.map((s) => s.setType)).toEqual(['warmup', 'working', 'working']);
    expect(bench.sets.map((s) => s.weight)).toEqual([60, 80, 90]);
    expect(bench.sets.map((s) => s.reps)).toEqual([10, 5, 3]);
    expect(bench.sets.map((s) => s.rpe)).toEqual([7, 8, 9]);
    expect(bench.sets.every((s) => s.isCompleted)).toBe(true);
  });

  it('conserva la duración real de Strong (regresión del clobber)', async () => {
    await importStrongCsv(STRONG_CSV, repos);

    const [session] = await repos.sessions.list(10);
    // Antes: 0, porque `finish()` pisaba el endedAt forzado con `new Date()`.
    expect(session.startedAt.getTime()).toBe(WORKOUT_START.getTime());
    expect(session.durationSeconds).toBe(3600);
    expect(session.endedAt?.getTime()).toBe(WORKOUT_START.getTime() + 3600 * 1000);
  });

  it('conserva la fecha histórica de completado (regresión del clobber de completedAt)', async () => {
    await importStrongCsv(STRONG_CSV, repos);

    const [session] = await repos.sessions.list(10);
    const full = await repos.sessions.getFullSession(session.id);
    expect(full!.exercises[0].sets[0].completedAt?.getTime()).toBe(WORKOUT_START.getTime());
  });

  it('deja el PR del ejercicio con el 1RM y la fecha reales', async () => {
    await importStrongCsv(STRONG_CSV, repos);

    const bench = (await repos.exercises.list()).find((e) => e.name === 'Bench Press')!;
    const [pr] = await repos.analytics.personalRecords(bench.id);

    // El mejor de 60×10 (80), 80×5 (93.33) y 90×3 (99).
    expect(pr.value).toBeCloseTo(99, 6);
    expect(pr.achievedAt.getTime()).toBe(WORKOUT_START.getTime());
  });
});
