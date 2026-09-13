import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { openInMemoryDatabase, type BetterSqliteStack } from '@db/testing/better-sqlite';
import { publishRepos } from '@db/registry';
import { useActiveWorkout } from './activeWorkoutStore';
import { usePreferences } from './preferencesStore';

/**
 * El descanso tiene un dueño único (el store) y su valor sale del target real de
 * la rutina. Es el camino que C6 movió desde la pantalla, así que se testea.
 *
 * No se mockea ningún módulo: se publica el data layer real (better-sqlite en
 * memoria) en el registry —la seam de D10— y en Node el storage cae a memoria.
 */
let db: BetterSqliteStack;

describe('activeWorkoutStore · descanso', () => {
  beforeEach(() => {
    db = openInMemoryDatabase();
    publishRepos(db.repos);
    useActiveWorkout.setState({
      session: null,
      isLoading: false,
      restRemaining: 0,
      isResting: false,
      restStartedAt: null,
    });
  });

  afterEach(() => {
    db.close();
  });

  async function makeExercise(name = 'Press de banca') {
    return db.repos.exercises.create({
      name,
      muscleGroup: 'chest',
      equipment: 'barbell',
      mechanic: 'compound',
      isCustom: false,
    });
  }

  it('arranca el descanso con el restSeconds de la rutina', async () => {
    const exercise = await makeExercise();

    const session = await db.repos.sessions.start({
      name: 'Empuje',
      fromRoutineExercises: [
        { exerciseId: exercise.id, targetSets: 2, targetReps: '5', restSeconds: 120 },
      ],
    });

    const [firstSet] = (await db.repos.sessions.getFullSession(session.id))!.exercises[0].sets;

    await useActiveWorkout.getState().loadActive();
    await useActiveWorkout.getState().completeSet(firstSet.id, 100, 5);

    expect(useActiveWorkout.getState().isResting).toBe(true);
    expect(useActiveWorkout.getState().restRemaining).toBe(120);
  });

  it('cae al default del usuario si la sesión no vino de una rutina', async () => {
    usePreferences.setState({ defaultRestSeconds: 75 });
    const exercise = await makeExercise();
    const session = await db.repos.sessions.start({ name: 'Libre' });
    const row = await db.repos.sessions.addSessionExercise(session.id, exercise.id);
    const set = await db.repos.sessions.addSet(row.id);

    await useActiveWorkout.getState().loadActive();
    await useActiveWorkout.getState().completeSet(set.id, 100, 5);

    // 75 y no 90: lee la preferencia, no una constante.
    expect(useActiveWorkout.getState().isResting).toBe(true);
    expect(useActiveWorkout.getState().restRemaining).toBe(75);
  });

  it('en un superset, descansa al cerrar la ronda y no en el primer ejercicio', async () => {
    const press = await makeExercise();
    const remo = await makeExercise('Remo');

    const session = await db.repos.sessions.start({
      name: 'Empuje',
      fromRoutineExercises: [
        { exerciseId: press.id, targetSets: 2, targetReps: '5', restSeconds: 90, supersetGroup: 'A' },
        { exerciseId: remo.id, targetSets: 2, targetReps: '8', restSeconds: 120, supersetGroup: 'A' },
      ],
    });

    const { exercises } = (await db.repos.sessions.getFullSession(session.id))!;
    const [pressSet] = exercises[0].sets;
    const [remoSet] = exercises[1].sets;

    await useActiveWorkout.getState().loadActive();

    // A1 no cierra la ronda: B todavía tiene sets pendientes.
    await useActiveWorkout.getState().completeSet(pressSet.id, 100, 5);
    expect(useActiveWorkout.getState().isResting).toBe(false);

    // B1 sí la cierra, y el descanso es el de B (120), no el de A (90).
    await useActiveWorkout.getState().completeSet(remoSet.id, 60, 8);
    expect(useActiveWorkout.getState().isResting).toBe(true);
    expect(useActiveWorkout.getState().restRemaining).toBe(120);
  });
});
