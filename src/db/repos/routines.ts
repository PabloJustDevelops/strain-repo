import { eq, and, desc, sql, asc, inArray } from 'drizzle-orm';
import { newId } from '@lib/id';

import * as schema from '../schema';
import type { SqliteDb } from '../seam';
import type { Exercise, Routine, RoutineExercise } from '../schema';

export interface RoutinesRepo {
  list(includeArchived?: boolean): Promise<Routine[]>;
  byId(id: string): Promise<Routine | undefined>;
  getWithExercises(id: string): Promise<{ routine: Routine; exercises: (RoutineExercise & { exercise: Exercise })[] } | null>;
  create(input: { name: string; description?: string; tags?: string[]; color?: string }): Promise<Routine>;
  update(id: string, patch: Partial<Routine>): Promise<void>;
  delete(id: string): Promise<void>;
  clone(id: string, newName?: string): Promise<Routine>;
  addExercise(routineId: string, exerciseId: string, opts?: { supersetGroup?: string | null }): Promise<void>;
  setSupersetGroup(routineId: string, routineExerciseIds: string[], group: string | null): Promise<void>;
  reorderExercises(routineId: string, orderedIds: string[]): Promise<void>;
  removeExercise(routineExerciseId: string): Promise<void>;
  touch(id: string): Promise<void>;
}

export function createRoutinesRepo(db: SqliteDb): RoutinesRepo {
  const repo: RoutinesRepo = {
    async list(includeArchived = false): Promise<Routine[]> {
      const where = includeArchived ? undefined : eq(schema.routines.isArchived, false);
      const query = db.select().from(schema.routines);
      return (where ? query.where(where) : query).orderBy(desc(schema.routines.updatedAt)).all() as Routine[];
    },

    async byId(id: string): Promise<Routine | undefined> {
      return db.select().from(schema.routines).where(eq(schema.routines.id, id)).get();
    },

    async getWithExercises(id: string): Promise<{ routine: Routine; exercises: (RoutineExercise & { exercise: Exercise })[] } | null> {
      const routine = await repo.byId(id);
      if (!routine) return null;

      const rows = db
        .select({
          re: schema.routineExercises,
          ex: schema.exercises,
        })
        .from(schema.routineExercises)
        .innerJoin(schema.exercises, eq(schema.exercises.id, schema.routineExercises.exerciseId))
        .where(eq(schema.routineExercises.routineId, id))
        .orderBy(asc(schema.routineExercises.orderIndex))
        .all();

      return {
        routine,
        exercises: rows.map((r) => ({ ...r.re, exercise: r.ex })),
      };
    },

    async create(input: { name: string; description?: string; tags?: string[]; color?: string }): Promise<Routine> {
      const id = newId();
      const now = new Date();
      db.insert(schema.routines)
        .values({
          id,
          name: input.name,
          description: input.description,
          tags: input.tags ?? [],
          color: input.color ?? '#3b82f6',
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        })
        .run();
      return (await repo.byId(id))!;
    },

    async update(id: string, patch: Partial<Routine>): Promise<void> {
      db.update(schema.routines)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(schema.routines.id, id))
        .run();
    },

    async delete(id: string): Promise<void> {
      db.delete(schema.routines).where(eq(schema.routines.id, id)).run();
    },

    async clone(id: string, newName?: string): Promise<Routine> {
      const original = await repo.getWithExercises(id);
      if (!original) throw new Error('Routine not found');

      const clone = await repo.create({
        name: newName ?? `${original.routine.name} (copia)`,
        description: original.routine.description ?? undefined,
        tags: original.routine.tags ?? [],
        color: original.routine.color ?? '#3b82f6',
      });

      for (const ex of original.exercises) {
        db.insert(schema.routineExercises)
          .values({
            id: newId(),
            routineId: clone.id,
            exerciseId: ex.exerciseId,
            orderIndex: ex.orderIndex,
            targetSets: ex.targetSets,
            targetReps: ex.targetReps,
            targetWeight: ex.targetWeight ?? undefined,
            restSeconds: ex.restSeconds,
            notes: ex.notes ?? undefined,
          })
          .run();
      }

      return clone;
    },

    async addExercise(
      routineId: string,
      exerciseId: string,
      opts: { supersetGroup?: string | null } = {}
    ): Promise<void> {
      const last = db
        .select({ maxOrder: sql<number>`MAX(${schema.routineExercises.orderIndex})` })
        .from(schema.routineExercises)
        .where(eq(schema.routineExercises.routineId, routineId))
        .get();
      db.insert(schema.routineExercises)
        .values({
          id: newId(),
          routineId,
          exerciseId,
          orderIndex: (last?.maxOrder ?? 0) + 1,
          targetSets: 3,
          targetReps: '8-12',
          restSeconds: 90,
          supersetGroup: opts.supersetGroup ?? null,
        })
        .run();
      await repo.touch(routineId);
    },

    /**
     * Marca un grupo de superset. Asigna la misma letra `group` a varios
     * `routineExerciseId` consecutivos y la quita del resto.
     */
    async setSupersetGroup(
      routineId: string,
      routineExerciseIds: string[],
      group: string | null
    ): Promise<void> {
      if (group) {
        db.transaction((tx) => {
          tx.update(schema.routineExercises)
            .set({ supersetGroup: null })
            .where(and(
              eq(schema.routineExercises.routineId, routineId),
              eq(schema.routineExercises.supersetGroup, group)
            ))
            .run();
          for (const id of routineExerciseIds) {
            tx.update(schema.routineExercises)
              .set({ supersetGroup: group })
              .where(and(
                eq(schema.routineExercises.id, id),
                eq(schema.routineExercises.routineId, routineId)
              ))
              .run();
          }
        });
      } else {
        db.update(schema.routineExercises)
          .set({ supersetGroup: null })
          .where(and(
            eq(schema.routineExercises.routineId, routineId),
            inArray(schema.routineExercises.id, routineExerciseIds)
          ))
          .run();
      }
      await repo.touch(routineId);
    },

    async reorderExercises(routineId: string, orderedIds: string[]): Promise<void> {
      db.transaction((tx) => {
        orderedIds.forEach((id, idx) => {
          tx.update(schema.routineExercises)
            .set({ orderIndex: idx + 1 })
            .where(and(eq(schema.routineExercises.id, id), eq(schema.routineExercises.routineId, routineId)))
            .run();
        });
      });
      await repo.touch(routineId);
    },

    async removeExercise(routineExerciseId: string): Promise<void> {
      db.delete(schema.routineExercises).where(eq(schema.routineExercises.id, routineExerciseId)).run();
    },

    async touch(id: string): Promise<void> {
      db.update(schema.routines).set({ updatedAt: new Date() }).where(eq(schema.routines.id, id)).run();
    },
  };

  return repo;
}
