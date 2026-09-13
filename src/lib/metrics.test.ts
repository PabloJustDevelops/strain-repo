import { describe, expect, it } from 'vitest';

import { openInMemoryDatabase } from '../db/testing/better-sqlite';
import {
  bestByOneRm,
  estimateOneRm,
  heaviestSet,
  oneRmPreview,
  sessionTotals,
  setVolume,
  topByVolume,
  type SetLike,
} from './metrics';

const set = (weight: number, reps: number, isCompleted = true): SetLike => ({
  weight,
  reps,
  isCompleted,
});

async function makeExercise(repos: ReturnType<typeof openInMemoryDatabase>['repos'], name: string) {
  return repos.exercises.create({
    name,
    muscleGroup: 'chest',
    equipment: 'barbell',
    mechanic: 'compound',
    isCustom: true,
  });
}

describe('estimateOneRm', () => {
  it('respeta los bordes de la definición', () => {
    expect(estimateOneRm(100, 0)).toBe(0);
    expect(estimateOneRm(100, -5)).toBe(0);
    expect(estimateOneRm(100, 1)).toBe(100);
    expect(estimateOneRm(100, 5)).toBeCloseTo(116.6667, 3);
    expect(estimateOneRm(100, 30)).toBeCloseTo(200, 6);
    expect(estimateOneRm(0, 5)).toBe(0);
  });
});

describe('oneRmPreview', () => {
  it('devuelve null cuando no hay nada que estimar', () => {
    expect(oneRmPreview(0, 5)).toBeNull();
    expect(oneRmPreview(100, 0)).toBeNull();
    expect(oneRmPreview(100, -3)).toBeNull();
  });

  it('con 1 rep devuelve el propio peso, no la sobreestimación de Epley', () => {
    expect(oneRmPreview(120, 1)).toBe(120);
  });

  it('para el resto usa la misma definición que estimateOneRm', () => {
    expect(oneRmPreview(100, 5)).toBeCloseTo(estimateOneRm(100, 5), 10);
    expect(oneRmPreview(100, 5)).toBeCloseTo(116.6667, 3);
    expect(oneRmPreview(90, 10)).toBeCloseTo(120, 6);
  });
});

describe('setVolume', () => {
  it('multiplica peso por reps', () => {
    expect(setVolume(100, 5)).toBe(500);
    expect(setVolume(0, 5)).toBe(0);
  });
});

describe('sessionTotals', () => {
  it('cuenta sólo los sets completados', () => {
    expect(sessionTotals([set(100, 5), set(50, 10), set(999, 999, false)])).toEqual({
      volume: 1000,
      completedSets: 2,
    });
  });

  it('devuelve cero sin sets completados', () => {
    expect(sessionTotals([set(100, 5, false)])).toEqual({ volume: 0, completedSets: 0 });
    expect(sessionTotals([])).toEqual({ volume: 0, completedSets: 0 });
  });
});

describe('bestByOneRm', () => {
  it('elige el mayor 1RM, no el mayor peso', () => {
    // 100×5 → 116.7 ; 90×10 → 120. Gana el de 90 kg.
    expect(bestByOneRm([set(100, 5), set(90, 10)])?.weight).toBe(90);
  });

  it('en empate gana el primero', () => {
    const first = set(100, 5);
    const second = set(100, 5);
    expect(bestByOneRm([first, second])).toBe(first);
  });

  it('ignora los sets sin completar y devuelve null si no hay', () => {
    expect(bestByOneRm([set(200, 5, false)])).toBeNull();
    expect(bestByOneRm([])).toBeNull();
  });
});

describe('heaviestSet', () => {
  it('elige el mayor peso y en empate el primero', () => {
    const heavy = set(120, 1);
    expect(heaviestSet([set(100, 10), heavy, set(120, 1)])).toBe(heavy);
  });

  it('ignora los sets sin completar', () => {
    expect(heaviestSet([set(200, 5, false), set(100, 5)])?.weight).toBe(100);
    expect(heaviestSet([set(200, 5, false)])).toBeNull();
  });
});

describe('topByVolume', () => {
  it('ordena por volumen completado y respeta el límite', () => {
    const a = { name: 'A', sets: [set(100, 5)] };   // 500
    const b = { name: 'B', sets: [set(100, 20)] };  // 2000
    const c = { name: 'C', sets: [set(0, 0)] };     // 0

    const top = topByVolume([a, b, c], 2);
    expect(top.map((t) => t.exercise.name)).toEqual(['B', 'A']);
    expect(top[0].volume).toBe(2000);
  });
});

/**
 * El contrato de Q9: el módulo expone cada fórmula como función TS y como
 * fragmento SQL, y este test corre los DOS caminos sobre la misma tabla de casos.
 * Si alguien toca una versión y no la otra, esto se pone rojo.
 */
describe('equivalencia TS ↔ SQL', () => {
  const CASES = [
    [100, 0],
    [100, 1],
    [100, 5],
    [100, 30],
    [0, 5],
  ] as const;

  it('el 1RM que escribe finish (TS) coincide con el que calcula analytics (SQL)', async () => {
    const db = openInMemoryDatabase();
    try {
      for (const [weight, reps] of CASES) {
        const exercise = await makeExercise(db.repos, `oneRm-${weight}-${reps}`);
        const session = await db.repos.sessions.start({
          name: `caso-${weight}-${reps}`,
          fromRoutineExercises: [
            { exerciseId: exercise.id, targetSets: 1, targetReps: '1', restSeconds: 60 },
          ],
        });
        const [target] = (await db.repos.sessions.getFullSession(session.id))!.exercises[0].sets;
        await db.repos.sessions.completeSet(target.id, weight, reps);
        await db.repos.sessions.finish(session.id);

        const [pr] = await db.repos.analytics.personalRecords(exercise.id);
        const [timeline] = await db.repos.analytics.exerciseTimeline(exercise.id, 3650);
        const expected = estimateOneRm(weight, reps);

        expect(pr.value).toBeCloseTo(expected, 6);
        expect(timeline.bestOneRm).toBeCloseTo(expected, 6);
      }
    } finally {
      db.close();
    }
  });

  it('el volumen que arma el store (TS) coincide con el total que escribe el repo (SQL)', async () => {
    const db = openInMemoryDatabase();
    try {
      const exercise = await makeExercise(db.repos, 'volumen');
      const session = await db.repos.sessions.start({
        name: 'volumen',
        fromRoutineExercises: [
          { exerciseId: exercise.id, targetSets: 3, targetReps: '5', restSeconds: 60 },
        ],
      });
      const [first, second] = (await db.repos.sessions.getFullSession(session.id))!.exercises[0].sets;

      await db.repos.sessions.completeSet(first.id, 100, 5);
      await db.repos.sessions.completeSet(second.id, 80, 3);
      // El tercer set queda sin completar a propósito.

      const full = await db.repos.sessions.getFullSession(session.id);
      const totals = sessionTotals(full!.exercises[0].sets);

      expect(totals).toEqual({ volume: 740, completedSets: 2 });
      expect(full!.session.totalVolume).toBe(totals.volume);
      expect(full!.session.totalSets).toBe(totals.completedSets);
    } finally {
      db.close();
    }
  });
});
