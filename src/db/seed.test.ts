import { describe, expect, it } from 'vitest';

import { createExercisesRepo } from './exercisesRepo';
import { bootstrapDatabase, getRepos } from './index';
import { seedExercises } from './seed';
import { createSessionStorage, setStorageForTesting } from './storage';

/** Los 47 ejercicios predefinidos de la app anterior. */
const CATALOG_SIZE = 47;

describe('seedExercises (catálogo Lynx)', () => {
  it('siembra los 47 ejercicios predefinidos', async () => {
    const storage = createSessionStorage();
    setStorageForTesting(storage);
    const repo = createExercisesRepo(storage);

    await seedExercises(repo);

    expect(await repo.count()).toBe(CATALOG_SIZE);
    // Son predefinidos, no personalizados.
    expect((await repo.list()).every((ex) => ex.isCustom === false)).toBe(true);
  });

  it('es idempotente: una segunda siembra no duplica', async () => {
    const storage = createSessionStorage();
    setStorageForTesting(storage);
    const repo = createExercisesRepo(storage);

    await seedExercises(repo);
    await seedExercises(repo);

    expect(await repo.count()).toBe(CATALOG_SIZE);
  });
});

describe('bootstrapDatabase (Lynx)', () => {
  it('siembra el catálogo antes de publicar los repos', async () => {
    setStorageForTesting(createSessionStorage());

    await bootstrapDatabase();

    expect(await getRepos().exercises.count()).toBe(CATALOG_SIZE);
  });
});
