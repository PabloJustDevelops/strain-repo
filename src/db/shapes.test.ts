import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { toActiveSessionView, toExerciseSummaries } from './shapes';
import { openInMemoryDatabase, type BetterSqliteStack } from './testing/better-sqlite';

/**
 * El mapeo fila → UI. Se corre contra filas reales del adapter in-memory, así el
 * fixture no puede desincronizarse del schema.
 */
describe('shapes', () => {
  let db: BetterSqliteStack;

  beforeEach(() => {
    db = openInMemoryDatabase();
  });

  afterEach(() => {
    db.close();
  });

  /** Una sesión con dos ejercicios (2 + 1 sets). */
  async function seed() {
    const bench = await db.repos.exercises.create({
      name: 'Bench Press',
      muscleGroup: 'chest',
      equipment: 'barbell',
      mechanic: 'compound',
      isCustom: false,
    });

    const row = await db.repos.exercises.create({
      name: 'Remo',
      muscleGroup: 'back',
      equipment: 'cable',
      mechanic: 'compound',
      isCustom: false,
    });

    const session = await db.repos.sessions.start({
      name: 'Push',
      fromRoutineExercises: [
        { exerciseId: bench.id, targetSets: 2, targetReps: '5', restSeconds: 120 },
        { exerciseId: row.id, targetSets: 1, targetReps: '8', restSeconds: 90 },
      ],
    });

    return (await db.repos.sessions.getFullSession(session.id))!;
  }

  async function reload(id: string) {
    return (await db.repos.sessions.getFullSession(id))!;
  }

  it('mapea la sesión con reloj inyectado', async () => {
    const full = await seed();

    const view = toActiveSessionView(full, new Date(full.session.startedAt.getTime() + 90_000));

    expect(view.elapsedSeconds).toBe(90);
    expect(view.name).toBe('Push');
    expect(view.exercises.map((e) => e.name)).toEqual(['Bench Press', 'Remo']);
    expect(view.exercises.map((e) => e.orderIndex)).toEqual([1, 2]);
    expect(view.exercises[0].muscleGroup).toBe('chest');
    expect(view.exercises[0].equipment).toBe('barbell');
    expect(view.totalSets).toBe(0);
  });

  it('clampa elapsedSeconds a cero si el reloj va atrás del inicio', async () => {
    const full = await seed();

    const view = toActiveSessionView(full, new Date(full.session.startedAt.getTime() - 60_000));

    expect(view.elapsedSeconds).toBe(0);
  });

  it('mapea supersetGroup (regresión: se declaraba y no se mapeaba)', async () => {
    const full = await seed();
    await db.repos.sessions.setSessionExerciseSuperset(full.exercises[0].id, 'A');

    const view = toActiveSessionView(await reload(full.session.id));

    // Antes: siempre undefined, así que la UI de supersets nunca se mostraba.
    expect(view.exercises[0].supersetGroup).toBe('A');
    expect(view.exercises[1].supersetGroup).toBeNull();
  });

  it('los sets conservan los nombres y campos de la fila', async () => {
    const full = await seed();
    await db.repos.sessions.completeSet(full.exercises[0].sets[0].id, 100, 5);

    const view = toActiveSessionView(await reload(full.session.id));
    const set = view.exercises[0].sets[0];

    expect(set.setType).toBe('warmup');            // el nombre de la columna, no `type`
    expect(set.isCompleted).toBe(true);
    expect(set.completedAt).toBeInstanceOf(Date);  // el campo que el DTO perdía
    expect(set.weight).toBe(100);
    expect(set.reps).toBe(5);
  });

  it('completedSets cuenta sólo los sets completados', async () => {
    const full = await seed();
    await db.repos.sessions.completeSet(full.exercises[0].sets[0].id, 100, 5);
    await db.repos.sessions.completeSet(full.exercises[0].sets[1].id, 100, 5);

    const view = toActiveSessionView(await reload(full.session.id));

    expect(view.completedSets).toBe(2);
    expect(view.totalSets).toBe(2);
    expect(view.totalVolume).toBe(1000); // 100×5 + 100×5
    expect(view.exercises[0].sets).toHaveLength(2);
  });

  it('mapea los targets de la rutina en vez de fabricarlos', async () => {
    const view = toActiveSessionView(await seed());

    // Antes el mapeo los descartaba: `restSeconds` era un 90 fijo, `targetReps`
    // un '-', y `targetSets` el conteo de sets. Ahora salen de la fila.
    expect(view.exercises.map((e) => e.restSeconds)).toEqual([120, 90]);
    expect(view.exercises.map((e) => e.targetReps)).toEqual(['5', '8']);
    expect(view.exercises.map((e) => e.targetSets)).toEqual([2, 1]);
  });

  it('toExerciseSummaries devuelve los mismos sets que la vista activa', async () => {
    const full = await seed();

    const view = toActiveSessionView(full);
    const summaries = toExerciseSummaries(full);

    expect(summaries.map((s) => s.name)).toEqual(view.exercises.map((e) => e.name));
    expect(summaries.map((s) => s.sets)).toEqual(view.exercises.map((e) => e.sets));
  });
});
