import { eq, asc, sql } from 'drizzle-orm';
import { newId } from '@lib/id';

import * as schema from '../schema';
import type { SqliteDb } from '../seam';
import type { Exercise, NewExercise } from '../schema';

export interface ExercisesRepo {
  list(): Promise<Exercise[]>;
  byId(id: string): Promise<Exercise | undefined>;
  byMuscleGroup(group: string): Promise<Exercise[]>;
  search(query: string): Promise<Exercise[]>;
  count(): Promise<number>;
  create(input: Omit<NewExercise, 'id' | 'createdAt' | 'updatedAt'>): Promise<Exercise>;
  update(id: string, patch: Partial<Exercise>): Promise<void>;
  delete(id: string): Promise<void>;
  bulkCreate(items: NewExercise[]): Promise<void>;
}

export function createExercisesRepo(db: SqliteDb): ExercisesRepo {
  const repo: ExercisesRepo = {
    async list(): Promise<Exercise[]> {
      return db.select().from(schema.exercises).orderBy(asc(schema.exercises.name)).all();
    },

    async byId(id: string): Promise<Exercise | undefined> {
      return db.select().from(schema.exercises).where(eq(schema.exercises.id, id)).get();
    },

    async byMuscleGroup(group: string): Promise<Exercise[]> {
      return db
        .select()
        .from(schema.exercises)
        .where(eq(schema.exercises.muscleGroup, group))
        .orderBy(asc(schema.exercises.name))
        .all();
    },

    async search(query: string): Promise<Exercise[]> {
      const q = `%${query.toLowerCase()}%`;

      return db
        .select()
        .from(schema.exercises)
        .where(sql`lower(${schema.exercises.name}) LIKE ${q}`)
        .orderBy(asc(schema.exercises.name))
        .all();
    },

    async count(): Promise<number> {
      const row = db
        .select({ cnt: sql<number>`COUNT(*)` })
        .from(schema.exercises)
        .get();

      return row?.cnt ?? 0;
    },

    async create(input: Omit<NewExercise, 'id' | 'createdAt' | 'updatedAt'>): Promise<Exercise> {
      const id = newId();
      const now = new Date();
      db.insert(schema.exercises).values({ ...input, id, createdAt: now, updatedAt: now }).run();

      return (await repo.byId(id))!;
    },

    async update(id: string, patch: Partial<Exercise>): Promise<void> {
      db.update(schema.exercises)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(schema.exercises.id, id))
        .run();
    },

    async delete(id: string): Promise<void> {
      db.delete(schema.exercises).where(eq(schema.exercises.id, id)).run();
    },

    /** Inserta varios ejercicios en una transacción (usado en seed). */
    async bulkCreate(items: NewExercise[]): Promise<void> {
      db.transaction((tx) => {
        for (const item of items) {
          tx.insert(schema.exercises).values(item).run();
        }
      });
    },
  };

  return repo;
}
