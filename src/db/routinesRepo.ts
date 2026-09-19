import { newId } from '@lib/id';

import { createKvStore } from './kv';
import type { Exercise, Routine, RoutineExercise } from './schema';
import type { Storage } from './storage';

/**
 * Repositorio de rutinas sobre la seam `Storage`. Réplica funcional del repo
 * Drizzle original: mismo contrato, joins (rutina→ejercicios) resueltos en
 * memoria. Los `updatedAt` se tocan en cada mutación, como en el original.
 */

export interface RoutinesRepo {
  list(includeArchived?: boolean): Promise<Routine[]>;
  byId(id: string): Promise<Routine | undefined>;
  getWithExercises(
    id: string,
  ): Promise<{ routine: Routine; exercises: (RoutineExercise & { exercise: Exercise })[] } | null>;
  create(input: {
    name: string;
    description?: string;
    tags?: string[];
    color?: string;
  }): Promise<Routine>;
  update(id: string, patch: Partial<Routine>): Promise<void>;
  delete(id: string): Promise<void>;
  clone(id: string, newName?: string): Promise<Routine>;
  addExercise(
    routineId: string,
    exerciseId: string,
    opts?: { supersetGroup?: string | null },
  ): Promise<void>;
  setSupersetGroup(
    routineId: string,
    routineExerciseIds: string[],
    group: string | null,
  ): Promise<void>;
  reorderExercises(routineId: string, orderedIds: string[]): Promise<void>;
  removeExercise(routineExerciseId: string): Promise<void>;
  touch(id: string): Promise<void>;
}

export function createRoutinesRepo(storage: Storage): RoutinesRepo {
  const routines = createKvStore<Routine>(storage, 'routine', ['createdAt', 'updatedAt']);
  const routineExercises = createKvStore<RoutineExercise>(storage, 'routineExercise');
  const exercises = createKvStore<Exercise>(storage, 'exercise', ['createdAt', 'updatedAt']);

  function byRoutine(routineId: string): RoutineExercise[] {
    return routineExercises
      .all()
      .filter((re) => re.routineId === routineId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  const repo: RoutinesRepo = {
    async list(includeArchived = false) {
      return routines
        .all()
        .filter((r) => includeArchived || !r.isArchived)
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    },

    async byId(id) {
      return routines.byId(id);
    },

    async getWithExercises(id) {
      const routine = routines.byId(id);
      if (!routine) return null;
      const rows = byRoutine(id)
        .map((re) => {
          const exercise = exercises.byId(re.exerciseId);
          return exercise ? { ...re, exercise } : null;
        })
        .filter((r): r is RoutineExercise & { exercise: Exercise } => r !== null);
      return { routine, exercises: rows };
    },

    async create(input) {
      const now = new Date();
      const routine: Routine = {
        id: newId(),
        name: input.name,
        description: input.description ?? null,
        tags: input.tags ?? [],
        color: input.color ?? '#3b82f6',
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      };
      routines.put(routine);
      return routine;
    },

    async update(id, patch) {
      const current = routines.byId(id);
      if (!current) return;
      routines.put({ ...current, ...patch, id, updatedAt: new Date() });
    },

    async delete(id) {
      for (const re of byRoutine(id)) routineExercises.remove(re.id);
      routines.remove(id);
    },

    async clone(id, newName) {
      const original = await repo.getWithExercises(id);
      if (!original) throw new Error(`Rutina no encontrada: ${id}`);
      const copy = await repo.create({
        name: newName ?? `${original.routine.name} (copia)`,
        description: original.routine.description ?? undefined,
        tags: original.routine.tags,
        color: original.routine.color ?? undefined,
      });
      for (const ex of original.exercises) {
        routineExercises.put({
          id: newId(),
          routineId: copy.id,
          exerciseId: ex.exerciseId,
          orderIndex: ex.orderIndex,
          targetSets: ex.targetSets,
          targetReps: ex.targetReps,
          targetWeight: ex.targetWeight ?? null,
          restSeconds: ex.restSeconds,
          supersetGroup: ex.supersetGroup ?? null,
          notes: ex.notes ?? null,
        });
      }
      return copy;
    },

    async addExercise(routineId, exerciseId, opts = {}) {
      const last = byRoutine(routineId).reduce((m, re) => Math.max(m, re.orderIndex), 0);
      routineExercises.put({
        id: newId(),
        routineId,
        exerciseId,
        orderIndex: last + 1,
        targetSets: 3,
        targetReps: '8-12',
        targetWeight: null,
        restSeconds: 90,
        supersetGroup: opts.supersetGroup ?? null,
        notes: null,
      });
      await repo.touch(routineId);
    },

    async setSupersetGroup(routineId, routineExerciseIds, group) {
      for (const re of byRoutine(routineId)) {
        let next = re.supersetGroup;
        if (group) {
          if (routineExerciseIds.includes(re.id)) next = group;
          else if (re.supersetGroup === group) next = null;
        } else if (routineExerciseIds.includes(re.id)) {
          next = null;
        }
        if (next !== re.supersetGroup) routineExercises.put({ ...re, supersetGroup: next });
      }
      await repo.touch(routineId);
    },

    async reorderExercises(routineId, orderedIds) {
      orderedIds.forEach((id, idx) => {
        const re = routineExercises.byId(id);
        if (re && re.routineId === routineId) {
          routineExercises.put({ ...re, orderIndex: idx + 1 });
        }
      });
      await repo.touch(routineId);
    },

    async removeExercise(routineExerciseId) {
      const re = routineExercises.byId(routineExerciseId);
      routineExercises.remove(routineExerciseId);
      if (re) await repo.touch(re.routineId);
    },

    async touch(id) {
      const current = routines.byId(id);
      if (current) routines.put({ ...current, updatedAt: new Date() });
    },
  };

  return repo;
}
