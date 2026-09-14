import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { openInMemoryDatabase, type BetterSqliteStack } from '../testing/better-sqlite';

/**
 * Estas consultas agrupaban por el ALIAS del SELECT (`week`, `day`, `month`,
 * `date`) y SQLite fallaba al prepararlas ("no such column: week"). El test las
 * corre contra la base en memoria para que no vuelva a colarse.
 */

let db: BetterSqliteStack;

beforeEach(() => {
  db = openInMemoryDatabase();
});

afterEach(() => {
  db.close();
});

/** Lunes (UTC, 12:00) de la semana de `date`. */
function mondayOf(date: Date): Date {
  const x = new Date(date);
  const diff = (x.getUTCDay() + 6) % 7;
  x.setUTCDate(x.getUTCDate() - diff);
  x.setUTCHours(12, 0, 0, 0);

  return x;
}

function addDays(date: Date, days: number): Date {
  const x = new Date(date);
  x.setUTCDate(x.getUTCDate() + days);

  return x;
}

async function makeExercise(name: string) {
  return db.repos.exercises.create({
    name,
    muscleGroup: 'chest',
    equipment: 'barbell',
    mechanic: 'compound',
    isCustom: false,
  });
}

/** Sesión completada con un set, para que `finish` calcule su volumen. */
async function loggedSession(startedAt: Date, weight: number, reps: number) {
  const exercise = await makeExercise(`Ex-${startedAt.getTime()}-${weight}`);

  const session = await db.repos.sessions.start({
    name: 'Semana',
    startedAt,
    fromRoutineExercises: [
      { exerciseId: exercise.id, targetSets: 1, targetReps: '5', restSeconds: 60 },
    ],
  });

  const [set] = (await db.repos.sessions.getFullSession(session.id))!.exercises[0].sets;
  await db.repos.sessions.completeSet(set.id, weight, reps);
  await db.repos.sessions.finish(session.id);

  return { sessionId: session.id, exerciseId: exercise.id };
}

/** Igual pero sin `finish`: queda `active` y no debe contar. */
async function activeSession(startedAt: Date, weight: number, reps: number) {
  const exercise = await makeExercise(`Activa-${startedAt.getTime()}`);

  const session = await db.repos.sessions.start({
    name: 'Activa',
    startedAt,
    fromRoutineExercises: [
      { exerciseId: exercise.id, targetSets: 1, targetReps: '5', restSeconds: 60 },
    ],
  });

  const [set] = (await db.repos.sessions.getFullSession(session.id))!.exercises[0].sets;
  await db.repos.sessions.completeSet(set.id, weight, reps);
}

describe('analytics · volumePerWeek', () => {
  it('agrupa por semana y suma varias sesiones de la misma', async () => {
    const monday = mondayOf(new Date());
    await loggedSession(monday, 100, 5); // 500
    await loggedSession(addDays(monday, 2), 60, 10); // 600, misma semana
    await loggedSession(addDays(monday, 7), 80, 5); // 400, semana siguiente

    const rows = await db.repos.analytics.volumePerWeek(5200);

    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.volume).sort((a, b) => a - b)).toEqual([400, 1100]);
    expect(rows.every((r) => /^\d{4}-\d{2}$/.test(r.weekStart))).toBe(true);
    expect(new Set(rows.map((r) => r.weekStart)).size).toBe(2);
  });

  it('ignora las sesiones sin completar', async () => {
    const monday = mondayOf(new Date());
    await loggedSession(monday, 100, 5);
    await activeSession(addDays(monday, 1), 999, 5);

    const rows = await db.repos.analytics.volumePerWeek(5200);

    expect(rows).toHaveLength(1);
    expect(rows[0].volume).toBe(500);
  });

  it('excluye lo anterior a la ventana pedida', async () => {
    const monday = mondayOf(new Date());
    await loggedSession(monday, 100, 5);
    await loggedSession(addDays(monday, -70), 999, 5);

    const rows = await db.repos.analytics.volumePerWeek(4);

    expect(rows).toHaveLength(1);
    expect(rows[0].volume).toBe(500);
  });
});

describe('analytics · otras agrupaciones por expresión', () => {
  it('dailyVolume agrupa por día sin usar el alias', async () => {
    const monday = mondayOf(new Date());
    await loggedSession(monday, 100, 5);

    const rows = await db.repos.analytics.dailyVolume(5200);

    expect(rows.some((r) => r.volume === 500 && r.date.length === 10)).toBe(true);
  });

  it('currentStreak no lanza y devuelve un número', async () => {
    const monday = mondayOf(new Date());
    await loggedSession(monday, 100, 5);

    const streak = await db.repos.analytics.currentStreak();

    expect(Number.isInteger(streak)).toBe(true);
    expect(streak).toBeGreaterThanOrEqual(0);
  });

  it('monthlyBest agrupa por mes sin usar el alias', async () => {
    const monday = mondayOf(new Date());
    const { exerciseId } = await loggedSession(monday, 100, 5);

    const rows = await db.repos.analytics.monthlyBest(exerciseId, 5200);

    expect(rows).toHaveLength(1);
    expect(rows[0].month).toMatch(/^\d{4}-\d{2}$/);
    expect(rows[0].bestWeight).toBe(100);
  });
});
