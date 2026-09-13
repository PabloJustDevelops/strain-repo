import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { openInMemoryDatabase, type BetterSqliteStack } from '@db/testing/better-sqlite';
import { useActiveWorkout } from './activeWorkoutStore';
import { usePreferences } from './preferencesStore';

/**
 * El descanso tiene un dueño único (el store) y su valor sale del target real de
 * la rutina. Es el camino que C6 movió desde la pantalla, así que se testea.
 *
 * No hay harness de stores en el repo (ver D8); este es el primero. Mockea
 * AsyncStorage (preferencesStore lo usa para persistir) y el locator `getRepos()`.
 * Los `vi.mock` se elevan solos, así que el orden en el archivo no importa.
 */
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
  },
}));

let db: BetterSqliteStack;

vi.mock('@db', () => ({
  getRepos: () => db.repos,
}));

describe('activeWorkoutStore · descanso', () => {
  beforeEach(() => {
    db = openInMemoryDatabase();
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

  async function makeExercise() {
    return db.repos.exercises.create({
      name: 'Press de banca',
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
});
