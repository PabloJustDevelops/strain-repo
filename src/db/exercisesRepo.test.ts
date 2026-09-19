import { beforeEach, describe, expect, it } from 'vitest';

import { createExercisesRepo } from './exercisesRepo';
import { createPreviewStorage, setStorageForTesting } from './storage';

const base = {
  name: 'Press banca', muscleGroup: 'chest', secondaryMuscles: ['triceps'],
  equipment: 'barbell', mechanic: 'compound', instructions: null,
  isCustom: false, notes: null,
};

function freshRepo() {
  const storage = createPreviewStorage();
  setStorageForTesting(storage);
  return createExercisesRepo(storage);
}

describe('exercisesRepo (storage KV Lynx)', () => {
  beforeEach(() => { freshRepo(); });

  it('crea y recupera por id', async () => {
    const repo = freshRepo();
    const created = await repo.create(base);
    expect(created.id).toBeTruthy();
    expect(await repo.byId(created.id)).toMatchObject({ name: 'Press banca' });
  });

  it('lista ordenado por nombre y cuenta', async () => {
    const repo = freshRepo();
    await repo.create({ ...base, name: 'Sentadilla' });
    await repo.create({ ...base, name: 'Dominadas' });
    expect((await repo.list()).map((e) => e.name)).toEqual(['Dominadas', 'Sentadilla']);
    expect(await repo.count()).toBe(2);
  });

  it('filtra por grupo muscular y busca por texto', async () => {
    const repo = freshRepo();
    await repo.create({ ...base, name: 'Press banca', muscleGroup: 'chest' });
    await repo.create({ ...base, name: 'Peso muerto', muscleGroup: 'back' });
    expect((await repo.byMuscleGroup('back')).map((e) => e.name)).toEqual(['Peso muerto']);
    expect((await repo.search('press')).map((e) => e.name)).toEqual(['Press banca']);
  });

  it('actualiza y borra', async () => {
    const repo = freshRepo();
    const created = await repo.create(base);
    await repo.update(created.id, { name: 'Press inclinado' });
    expect((await repo.byId(created.id))?.name).toBe('Press inclinado');
    await repo.delete(created.id);
    expect(await repo.byId(created.id)).toBeUndefined();
    expect(await repo.count()).toBe(0);
  });
});
