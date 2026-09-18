import { describe, expect, it } from 'vitest';

import { createRepos } from './index';
import { createSessionStorage } from './storage';

/** Recorrido completo: rutina → sesión desde rutina → completar sets → PR → analytics. */
describe('data layer (integración KV)', () => {
  it('flujo rutina → sesión → PR → analytics', async () => {
    const repos = createRepos(createSessionStorage());

    const ex = await repos.exercises.create({
      name: 'Press banca',
      muscleGroup: 'chest',
      secondaryMuscles: [],
      equipment: 'barbell',
      mechanic: 'compound',
      instructions: null,
      isCustom: false,
      notes: null,
    });

    const routine = await repos.routines.create({ name: 'Push A' });
    await repos.routines.addExercise(routine.id, ex.id);

    const withEx = await repos.routines.getWithExercises(routine.id);
    expect(withEx?.exercises).toHaveLength(1);
    expect(withEx?.exercises[0].exercise.name).toBe('Press banca');

    // Arrancar sesión desde los targets de la rutina.
    const session = await repos.sessions.start({
      name: 'Push A',
      routineId: routine.id,
      fromRoutineExercises: withEx!.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        targetSets: e.targetSets,
        targetReps: e.targetReps,
        targetWeight: e.targetWeight ?? undefined,
        restSeconds: e.restSeconds,
        supersetGroup: e.supersetGroup,
      })),
    });

    const full = await repos.sessions.getFullSession(session.id);
    expect(full?.exercises).toHaveLength(1);
    const firstSet = full!.exercises[0].sets[0];
    expect(full!.exercises[0].sets).toHaveLength(3); // targetSets por defecto = 3

    // Completar un set pesado y terminar la sesión.
    await repos.sessions.completeSet(firstSet.id, 100, 5);
    await repos.sessions.finish(session.id);

    const done = await repos.sessions.byId(session.id);
    expect(done?.status).toBe('completed');
    expect(done?.totalVolume).toBe(500); // 100 kg * 5 reps

    // PR de 1RM calculado (Epley: 100 * (1 + 5/30) ≈ 116.67).
    const prs = await repos.analytics.personalRecords(ex.id);
    expect(prs).toHaveLength(1);
    expect(prs[0].value).toBeCloseTo(116.67, 1);

    // Analytics básicas.
    expect(await repos.analytics.currentStreak()).toBeGreaterThanOrEqual(1);
    const stats = await repos.analytics.exerciseStats(ex.id);
    expect(stats.totalSets).toBe(1);
    expect(stats.totalVolume).toBe(500);
  });
});
