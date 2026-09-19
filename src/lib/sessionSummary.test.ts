import { describe, expect, it } from 'vitest';

import type { ActiveSessionView, SessionExerciseView, SetView } from '@db/shapes';

import { buildWorkoutSummary, prsAchievedIn, type PrLike } from './sessionSummary';

/**
 * El resumen de sesión.
 *
 * Los casos que importan: que sólo cuenten los sets completados (el invariante
 * de `@lib/metrics`), que la duración salga de las fechas y no de un campo
 * cacheado, y que los PRs se filtren por ejercicio y por ventana temporal.
 */

const START = new Date('2026-09-18T10:00:00.000Z');

function set(overrides: Partial<SetView> & { id: string }): SetView {
  return {
    setIndex: 1,
    setType: 'working',
    weight: 0,
    reps: 0,
    isCompleted: false,
    rpe: null,
    notes: null,
    completedAt: null,
    ...overrides,
  };
}

function exercise(
  overrides: Partial<SessionExerciseView> & { id: string; name: string; sets: SetView[] }
): SessionExerciseView {
  return {
    exerciseId: `ex-${overrides.id}`,
    muscleGroup: 'chest',
    equipment: 'barbell',
    orderIndex: 1,
    supersetGroup: null,
    notes: null,
    targetSets: 3,
    targetReps: '8-12',
    restSeconds: 90,
    ...overrides,
  };
}

function session(overrides: Partial<ActiveSessionView> = {}): ActiveSessionView {
  return {
    id: 'session-1',
    name: 'Push',
    startedAt: START,
    elapsedSeconds: 0,
    exercises: [],
    totalVolume: 0,
    totalSets: 0,
    completedSets: 0,
    ...overrides,
  };
}

describe('buildWorkoutSummary', () => {
  it('suma sólo los sets completados y cuenta todos los sets', () => {
    const summary = buildWorkoutSummary(
      session({
        exercises: [
          exercise({
            id: 'a',
            name: 'Press banca',
            sets: [
              set({ id: 'a1', weight: 100, reps: 5, isCompleted: true }),
              set({ id: 'a2', setIndex: 2, weight: 100, reps: 5 }),
            ],
          }),
          exercise({
            id: 'b',
            name: 'Aperturas',
            sets: [set({ id: 'b1', weight: 50, reps: 10, isCompleted: true })],
          }),
        ],
      }),
      new Date('2026-09-18T10:05:00.000Z')
    );

    expect(summary.totalVolume).toBe(1000);
    expect(summary.completedSets).toBe(2);
    expect(summary.totalSets).toBe(3);
    expect(summary.exercises[0]?.volume).toBe(500);
    expect(summary.exercises[0]?.completedSets).toBe(1);
    expect(summary.exercises[0]?.totalSets).toBe(2);
  });

  it('la duración sale de las fechas, no de `elapsedSeconds`', () => {
    const summary = buildWorkoutSummary(
      session({ elapsedSeconds: 12 }),
      new Date('2026-09-18T10:05:00.000Z')
    );

    expect(summary.durationSeconds).toBe(300);
  });

  it('el mejor set es el más pesado completado, y `null` si no completó ninguno', () => {
    const summary = buildWorkoutSummary(
      session({
        exercises: [
          exercise({
            id: 'a',
            name: 'Peso muerto',
            sets: [
              set({ id: 'a1', weight: 80, reps: 10, isCompleted: true }),
              set({ id: 'a2', setIndex: 2, weight: 100, reps: 1, isCompleted: true }),
            ],
          }),
          exercise({
            id: 'b',
            name: 'Remo',
            sets: [set({ id: 'b1', weight: 60, reps: 8 })],
          }),
        ],
      }),
      new Date('2026-09-18T10:01:00.000Z')
    );

    expect(summary.exercises[0]?.best).toEqual({ weight: 100, reps: 1 });
    expect(summary.exercises[1]?.best).toBeNull();
    expect(summary.exercises[1]?.volume).toBe(0);
  });

  it('una sesión vacía no inventa cifras', () => {
    const summary = buildWorkoutSummary(session(), new Date('2026-09-18T10:00:30.000Z'));

    expect(summary.totalVolume).toBe(0);
    expect(summary.completedSets).toBe(0);
    expect(summary.totalSets).toBe(0);
    expect(summary.exercises).toEqual([]);
    expect(summary.prs).toEqual([]);
    expect(summary.durationSeconds).toBe(30);
  });

  it('incluye sólo los PRs de la sesión, con el nombre del ejercicio, ordenados desc', () => {
    const records: PrLike[] = [
      { exerciseId: 'ex-a', value: 120, achievedAt: new Date('2026-09-18T10:04:00.000Z') },
      { exerciseId: 'ex-b', value: 90, achievedAt: new Date('2026-09-18T10:03:00.000Z') },
      // Otro ejercicio: no es de esta sesión.
      { exerciseId: 'ex-z', value: 999, achievedAt: new Date('2026-09-18T10:03:00.000Z') },
      // Mismo ejercicio pero de una sesión anterior.
      { exerciseId: 'ex-a', value: 130, achievedAt: new Date('2026-09-17T10:00:00.000Z') },
    ];

    const summary = buildWorkoutSummary(
      session({
        exercises: [
          exercise({ id: 'a', name: 'Press banca', sets: [] }),
          exercise({ id: 'b', name: 'Aperturas', sets: [] }),
        ],
      }),
      new Date('2026-09-18T10:05:00.000Z'),
      records
    );

    expect(summary.prs).toEqual([
      { exerciseId: 'ex-a', exerciseName: 'Press banca', value: 120 },
      { exerciseId: 'ex-b', exerciseName: 'Aperturas', value: 90 },
    ]);
  });
});

describe('prsAchievedIn', () => {
  const window = {
    startedAt: START,
    endedAt: new Date('2026-09-18T10:05:00.000Z'),
    exerciseIds: ['ex-a'],
  };

  it('incluye los extremos de la ventana y excluye lo demás', () => {
    const records: PrLike[] = [
      { exerciseId: 'ex-a', value: 1, achievedAt: START },
      { exerciseId: 'ex-a', value: 2, achievedAt: window.endedAt },
      { exerciseId: 'ex-a', value: 3, achievedAt: new Date(START.getTime() - 1) },
      { exerciseId: 'ex-a', value: 4, achievedAt: new Date(window.endedAt.getTime() + 1) },
      { exerciseId: 'ex-other', value: 5, achievedAt: START },
    ];

    expect(prsAchievedIn(records, window).map((pr) => pr.value)).toEqual([1, 2]);
  });
});
