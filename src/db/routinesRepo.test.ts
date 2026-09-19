import { describe, expect, it, vi } from 'vitest';

import { createExercisesRepo } from './exercisesRepo';
import { createRoutinesRepo } from './routinesRepo';
import { createPreviewStorage, setStorageForTesting } from './storage';

const exerciseInput = (name: string, muscleGroup = 'chest') => ({
  name,
  muscleGroup,
  secondaryMuscles: [],
  equipment: 'barbell',
  mechanic: 'compound',
  instructions: null,
  isCustom: false,
  notes: null,
});

/** Repos nuevos sobre un storage limpio, para que un test no vea al anterior. */
function setup() {
  const storage = createPreviewStorage();
  setStorageForTesting(storage);

  return {
    routines: createRoutinesRepo(storage),
    exercises: createExercisesRepo(storage),
  };
}

/** Crea una rutina y le agrega un ejercicio por nombre; devuelve los ids. */
async function routineWith(
  routines: ReturnType<typeof createRoutinesRepo>,
  exercises: ReturnType<typeof createExercisesRepo>,
  names: string[],
) {
  const routine = await routines.create({ name: 'Push A' });

  for (const name of names) {
    const exercise = await exercises.create(exerciseInput(name));
    await routines.addExercise(routine.id, exercise.id);
  }

  return routine;
}

describe('routinesRepo (storage KV Lynx)', () => {
  it('agrega ejercicios al final, con los targets por defecto', async () => {
    const { routines, exercises } = setup();
    const routine = await routineWith(routines, exercises, ['Press banca', 'Press inclinado']);

    const full = await routines.getWithExercises(routine.id);

    expect(full?.exercises.map((row) => row.exercise.name)).toEqual([
      'Press banca',
      'Press inclinado',
    ]);
    expect(full?.exercises.map((row) => row.orderIndex)).toEqual([1, 2]);
    expect(full?.exercises[0]).toMatchObject({
      targetSets: 3,
      targetReps: '8-12',
      restSeconds: 90,
      supersetGroup: null,
    });
  });

  it('reordenar persiste el orden pedido y renumera de 1 a n', async () => {
    const { routines, exercises } = setup();
    const routine = await routineWith(routines, exercises, ['A', 'B', 'C']);
    const before = await routines.getWithExercises(routine.id);
    const ids = before!.exercises.map((row) => row.id);

    await routines.reorderExercises(routine.id, [ids[2], ids[0], ids[1]]);

    const after = await routines.getWithExercises(routine.id);
    expect(after?.exercises.map((row) => row.id)).toEqual([ids[2], ids[0], ids[1]]);
    expect(after?.exercises.map((row) => row.orderIndex)).toEqual([1, 2, 3]);
  });

  it('reordenar ignora ids de otra rutina', async () => {
    const { routines, exercises } = setup();
    const routineA = await routineWith(routines, exercises, ['A', 'B']);
    const other = await routines.create({ name: 'Otra' });
    const stray = await exercises.create(exerciseInput('Z'));
    await routines.addExercise(other.id, stray.id);
    const strayRow = (await routines.getWithExercises(other.id))!.exercises[0];

    await routines.reorderExercises(routineA.id, [strayRow.id]);

    // La fila de la otra rutina no se toca.
    expect((await routines.getWithExercises(other.id))?.exercises[0].orderIndex).toBe(1);
    expect((await routines.getWithExercises(routineA.id))?.exercises).toHaveLength(2);
  });

  it('quita sólo el ejercicio pedido', async () => {
    const { routines, exercises } = setup();
    const routine = await routineWith(routines, exercises, ['A', 'B', 'C']);
    const rows = (await routines.getWithExercises(routine.id))!.exercises;

    await routines.removeExercise(rows[1].id);

    const after = await routines.getWithExercises(routine.id);
    expect(after?.exercises.map((row) => row.exercise.name)).toEqual(['A', 'C']);
  });

  it('crear, actualizar y tocar mueven updatedAt', async () => {
    vi.useFakeTimers();

    try {
      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      const { routines } = setup();
      const routine = await routines.create({ name: 'Push A' });

      expect(routine.createdAt.toISOString()).toBe('2024-01-01T00:00:00.000Z');

      vi.setSystemTime(new Date('2024-01-02T00:00:00.000Z'));
      await routines.update(routine.id, { name: 'Push B' });

      const updated = await routines.byId(routine.id);
      expect(updated?.name).toBe('Push B');
      expect(updated?.updatedAt.toISOString()).toBe('2024-01-02T00:00:00.000Z');

      vi.setSystemTime(new Date('2024-01-03T00:00:00.000Z'));
      await routines.touch(routine.id);

      expect((await routines.byId(routine.id))?.updatedAt.toISOString()).toBe(
        '2024-01-03T00:00:00.000Z',
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('list ordena por updatedAt descendente y omite las archivadas', async () => {
    vi.useFakeTimers();

    try {
      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      const { routines } = setup();
      const first = await routines.create({ name: 'Primera' });

      vi.setSystemTime(new Date('2024-01-02T00:00:00.000Z'));
      const second = await routines.create({ name: 'Segunda' });

      expect((await routines.list()).map((r) => r.name)).toEqual(['Segunda', 'Primera']);

      await routines.update(second.id, { isArchived: true });

      expect((await routines.list()).map((r) => r.name)).toEqual(['Primera']);
      expect((await routines.list(true)).map((r) => r.name)).toEqual(['Segunda', 'Primera']);
      expect(first.isArchived).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('clone copia rutina y ejercicios con ids nuevos', async () => {
    const { routines, exercises } = setup();
    const routine = await routineWith(routines, exercises, ['A', 'B']);

    const copy = await routines.clone(routine.id, 'Push A (copia)');
    const original = await routines.getWithExercises(routine.id);
    const cloned = await routines.getWithExercises(copy.id);

    expect(copy.id).not.toBe(routine.id);
    expect(cloned?.routine.name).toBe('Push A (copia)');
    expect(cloned?.exercises.map((row) => row.exercise.name)).toEqual(['A', 'B']);
    expect(cloned?.exercises.map((row) => row.id)).not.toEqual(
      original?.exercises.map((row) => row.id),
    );
  });
});
