import { newId } from '@lib/id';

import { createKvStore } from './kv';
import type { Exercise } from './schema';
import type { Storage } from './storage';

/**
 * Repositorio de ejercicios sobre la seam `Storage` (clave-valor).
 *
 * Mantiene la MISMA interfaz pública que el repo Drizzle de la app anterior, de
 * modo que la UI y los stores no cambian al migrar. Lo relacional lo resuelve
 * en memoria (ordenar/filtrar), suficiente para una biblioteca de ejercicios.
 */

type NewExerciseInput = Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'>;

export interface ExercisesRepo {
  list(): Promise<Exercise[]>;
  byId(id: string): Promise<Exercise | undefined>;
  byMuscleGroup(group: string): Promise<Exercise[]>;
  search(query: string): Promise<Exercise[]>;
  count(): Promise<number>;
  create(input: NewExerciseInput): Promise<Exercise>;
  update(id: string, patch: Partial<Exercise>): Promise<void>;
  delete(id: string): Promise<void>;
  bulkCreate(items: NewExerciseInput[]): Promise<void>;
}

export function createExercisesRepo(storage: Storage): ExercisesRepo {
  const store = createKvStore<Exercise>(storage, 'exercise', ['createdAt', 'updatedAt']);

  const byName = (a: Exercise, b: Exercise) => a.name.localeCompare(b.name);

  const repo: ExercisesRepo = {
    async list() {
      return store.all().sort(byName);
    },

    async byId(id) {
      return store.byId(id);
    },

    async byMuscleGroup(group) {
      return store
        .all()
        .filter((e) => e.muscleGroup === group)
        .sort(byName);
    },

    async search(query) {
      const q = query.toLowerCase();
      return store
        .all()
        .filter((e) => e.name.toLowerCase().includes(q))
        .sort(byName);
    },

    async count() {
      return store.count();
    },

    async create(input) {
      const now = new Date();
      const exercise: Exercise = { ...input, id: newId(), createdAt: now, updatedAt: now };
      store.put(exercise);
      return exercise;
    },

    async update(id, patch) {
      const current = store.byId(id);
      if (!current) return;
      store.put({ ...current, ...patch, id, updatedAt: new Date() });
    },

    async delete(id) {
      store.remove(id);
    },

    async bulkCreate(items) {
      for (const item of items) {
        await repo.create(item);
      }
    },
  };

  return repo;
}
