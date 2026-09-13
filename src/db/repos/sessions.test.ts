import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { openInMemoryDatabase, type BetterSqliteStack } from '../testing/better-sqlite';
import type { Repos } from './index';

/**
 * El primer test que cruza la seam del data layer (ver D10).
 *
 * Corre contra SQLite in-memory con las migraciones reales, así que también
 * verifica el array de migraciones y el adapter `RawSqlite`.
 */
describe('SessionsRepo', () => {
  let db: BetterSqliteStack;
  let repos: Repos;

  beforeEach(() => {
    db = openInMemoryDatabase();
    repos = db.repos;
  });

  afterEach(() => {
    db.close();
  });

  async function makeExercise(name = 'Press de banca') {
    return repos.exercises.create({
      name,
      muscleGroup: 'chest',
      equipment: 'barbell',
      mechanic: 'compound',
      isCustom: false,
    });
  }

  it('start() siembra un set por target, con warmup primero', async () => {
    const exercise = await makeExercise();

    const session = await repos.sessions.start({
      name: 'Empuje',
      fromRoutineExercises: [
        { exerciseId: exercise.id, targetSets: 3, targetReps: '8-12', restSeconds: 120 },
      ],
    });

    const full = await repos.sessions.getFullSession(session.id);
    expect(full).not.toBeNull();
    expect(full!.exercises).toHaveLength(1);
    expect(full!.exercises[0].sets.map((s) => s.setIndex)).toEqual([1, 2, 3]);
    expect(full!.exercises[0].sets.map((s) => s.setType)).toEqual(['warmup', 'working', 'working']);
    expect(full!.session.status).toBe('active');
  });

  it('completeSet() recalcula totalVolume y totalSets de la sesión', async () => {
    const exercise = await makeExercise();
    const session = await repos.sessions.start({
      name: 'Empuje',
      fromRoutineExercises: [
        { exerciseId: exercise.id, targetSets: 2, targetReps: '5', restSeconds: 120 },
      ],
    });
    const [first, second] = (await repos.sessions.getFullSession(session.id))!.exercises[0].sets;

    await repos.sessions.completeSet(first.id, 100, 5);
    expect((await repos.sessions.byId(session.id))!.totalVolume).toBe(500);
    expect((await repos.sessions.byId(session.id))!.totalSets).toBe(1);

    await repos.sessions.completeSet(second.id, 100, 3);
    expect((await repos.sessions.byId(session.id))!.totalVolume).toBe(800);
    expect((await repos.sessions.byId(session.id))!.totalSets).toBe(2);
  });

  it('finish() escribe un PR de one_rm con la fórmula de Epley', async () => {
    const exercise = await makeExercise();
    const session = await repos.sessions.start({
      name: 'Empuje',
      fromRoutineExercises: [
        { exerciseId: exercise.id, targetSets: 1, targetReps: '5', restSeconds: 120 },
      ],
    });
    const [set] = (await repos.sessions.getFullSession(session.id))!.exercises[0].sets;
    await repos.sessions.completeSet(set.id, 100, 5);

    await repos.sessions.finish(session.id);

    const [pr] = await repos.analytics.personalRecords(exercise.id);
    expect(pr.recordType).toBe('one_rm');
    expect(pr.value).toBeCloseTo(100 * (1 + 5 / 30), 5);
    expect((await repos.sessions.byId(session.id))!.status).toBe('completed');
  });

  it('uncompleteSet() y deleteSet() mueven la fila como corresponde', async () => {
    const exercise = await makeExercise();
    const session = await repos.sessions.start({
      name: 'Empuje',
      fromRoutineExercises: [
        { exerciseId: exercise.id, targetSets: 2, targetReps: '5', restSeconds: 120 },
      ],
    });
    const [first, second] = (await repos.sessions.getFullSession(session.id))!.exercises[0].sets;

    await repos.sessions.completeSet(first.id, 100, 5);
    await repos.sessions.uncompleteSet(first.id);
    expect(
      (await repos.sessions.getFullSession(session.id))!.exercises[0].sets[0].isCompleted
    ).toBe(false);

    await repos.sessions.deleteSet(second.id);
    expect((await repos.sessions.getFullSession(session.id))!.exercises[0].sets).toHaveLength(1);
  });

  it('getFullSession() devuelve null si la sesión no existe', async () => {
    expect(await repos.sessions.getFullSession('no-existe')).toBeNull();
  });

  it('el adapter in-memory corre con foreign_keys ON, igual que producción', async () => {
    await expect(
      repos.sessions.start({
        name: 'FK',
        fromRoutineExercises: [
          { exerciseId: 'ejercicio-inexistente', targetSets: 1, targetReps: '5', restSeconds: 60 },
        ],
      })
    ).rejects.toThrow();
  });

  describe('addSessionExercise', () => {
    it('asigna orderIndex correlativo y devuelve la fila creada', async () => {
      const exercise = await makeExercise();
      const session = await repos.sessions.start({ name: 'Libre' });

      const first = await repos.sessions.addSessionExercise(session.id, exercise.id);
      const second = await repos.sessions.addSessionExercise(session.id, exercise.id);

      expect([first.orderIndex, second.orderIndex]).toEqual([1, 2]);
      const full = await repos.sessions.getFullSession(session.id);
      expect(full!.exercises.map((e) => e.id)).toEqual([first.id, second.id]);
    });

    it('respeta un orderIndex explícito', async () => {
      const exercise = await makeExercise();
      const session = await repos.sessions.start({ name: 'Libre' });

      const row = await repos.sessions.addSessionExercise(session.id, exercise.id, {
        orderIndex: 7,
      });
      expect(row.orderIndex).toBe(7);
    });
  });

  describe('finish', () => {
    it('deriva la duración del endedAt que se le pasa', async () => {
      const session = await repos.sessions.start({ name: 'Histórica' });
      const endedAt = new Date(session.startedAt.getTime() + 45 * 60 * 1000);

      await repos.sessions.finish(session.id, { endedAt });

      const after = await repos.sessions.byId(session.id);
      expect(after!.durationSeconds).toBe(45 * 60);
      expect(after!.endedAt?.getTime()).toBe(endedAt.getTime());
    });

    it('clampea la duración a cero si endedAt es anterior al inicio', async () => {
      const session = await repos.sessions.start({ name: 'Rara' });

      await repos.sessions.finish(session.id, {
        endedAt: new Date(session.startedAt.getTime() - 60_000),
      });

      expect((await repos.sessions.byId(session.id))!.durationSeconds).toBe(0);
    });
  });
});
