import { eq, and, desc, sql, asc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import * as schema from '../schema';
import type { SqliteDb } from '../seam';
import type { Exercise, SessionExercise, Set as DbSet, WorkoutSession } from '../schema';
import { bestByOneRm, estimateOneRm, setVolumeSql } from '@lib/metrics';

/** Targets que una rutina aporta al arrancar una sesión. */
export interface SessionTargetInput {
  exerciseId: string;
  targetSets: number;
  targetReps: string;
  targetWeight?: number;
  restSeconds: number;
  supersetGroup?: string | null;
}

/** Una sesión con sus ejercicios, cada uno con sus sets. */
export interface FullSession {
  session: WorkoutSession;
  exercises: (SessionExercise & { exercise: Exercise; sets: DbSet[] })[];
}

export interface SessionsRepo {
  start(input: {
    name: string;
    routineId?: string;
    startedAt?: Date;
    fromRoutineExercises?: SessionTargetInput[];
  }): Promise<WorkoutSession>;
  setSessionExerciseSuperset(sessionExerciseId: string, group: string | null): Promise<void>;
  byId(id: string): Promise<WorkoutSession | undefined>;
  activeSession(): Promise<WorkoutSession | undefined>;
  getFullSession(id: string): Promise<FullSession | null>;
  list(limit?: number): Promise<WorkoutSession[]>;
  completeSet(setId: string, weight?: number, reps?: number): Promise<void>;
  uncompleteSet(setId: string): Promise<void>;
  updateSet(setId: string, patch: Partial<DbSet>): Promise<void>;
  addSessionExercise(
    sessionId: string,
    exerciseId: string,
    opts?: { orderIndex?: number; supersetGroup?: string | null },
  ): Promise<SessionExercise>;
  addSet(sessionExerciseId: string): Promise<DbSet>;
  deleteSet(setId: string): Promise<void>;
  finish(id: string, opts?: { endedAt?: Date }): Promise<void>;
  discard(id: string): Promise<void>;
}

export function createSessionsRepo(db: SqliteDb): SessionsRepo {
  const repo: SessionsRepo = {
    /** Inicia una nueva sesión (con o sin rutina como base). */
    async start(input: {
      name: string;
      routineId?: string;
      startedAt?: Date;
      fromRoutineExercises?: SessionTargetInput[];
    }): Promise<WorkoutSession> {
      const id = nanoid();
      // `startedAt` permite arrancar una sesión histórica (import de Strong); si no,
      // la duración calculada en `finish` clampearía a 0 porque el fin sería anterior
      // al inicio.
      const startedAt = input.startedAt ?? new Date();

      db.transaction((tx) => {
        tx.insert(schema.workoutSessions)
          .values({
            id,
            name: input.name,
            routineId: input.routineId,
            startedAt,
            status: 'active',
            totalVolume: 0,
            totalSets: 0,
          })
          .run();

        (input.fromRoutineExercises ?? []).forEach((ex, idx) => {
          const sessionExerciseId = nanoid();
          tx.insert(schema.sessionExercises)
            .values({
              id: sessionExerciseId,
              sessionId: id,
              exerciseId: ex.exerciseId,
              orderIndex: idx + 1,
              supersetGroup: ex.supersetGroup ?? null,
              // Snapshot de la intención de la rutina (ver D11). Se escribe tal
              // cual: si no se persiste acá, se pierde al recargar la sesión.
              targetSets: ex.targetSets,
              targetReps: ex.targetReps,
              restSeconds: ex.restSeconds,
            })
            .run();

          for (let s = 1; s <= ex.targetSets; s++) {
            tx.insert(schema.sets)
              .values({
                id: nanoid(),
                sessionExerciseId,
                setIndex: s,
                setType: s === 1 ? 'warmup' : 'working',
                weight: ex.targetWeight ?? 0,
                reps: 0,
                isCompleted: false,
              })
              .run();
          }
        });
      });

      return (await repo.byId(id))!;
    },

    /**
     * Actualiza el grupo de superset de un ejercicio de la sesión activa.
     */
    async setSessionExerciseSuperset(
      sessionExerciseId: string,
      group: string | null
    ): Promise<void> {
      db.update(schema.sessionExercises)
        .set({ supersetGroup: group })
        .where(eq(schema.sessionExercises.id, sessionExerciseId))
        .run();
    },

    async byId(id: string): Promise<WorkoutSession | undefined> {
      return db.select().from(schema.workoutSessions).where(eq(schema.workoutSessions.id, id)).get();
    },

    async activeSession(): Promise<WorkoutSession | undefined> {
      return db
        .select()
        .from(schema.workoutSessions)
        .where(eq(schema.workoutSessions.status, 'active'))
        .get();
    },

    async getFullSession(id: string): Promise<FullSession | null> {
      const session = await repo.byId(id);
      if (!session) return null;

      const exercises = db
        .select({ se: schema.sessionExercises, ex: schema.exercises })
        .from(schema.sessionExercises)
        .innerJoin(schema.exercises, eq(schema.exercises.id, schema.sessionExercises.exerciseId))
        .where(eq(schema.sessionExercises.sessionId, id))
        .orderBy(asc(schema.sessionExercises.orderIndex))
        .all();

      const sets = db
        .select()
        .from(schema.sets)
        .innerJoin(schema.sessionExercises, eq(schema.sessionExercises.id, schema.sets.sessionExerciseId))
        .where(eq(schema.sessionExercises.sessionId, id))
        .orderBy(asc(schema.sessionExercises.orderIndex), asc(schema.sets.setIndex))
        .all();

      // Indexar sets por sessionExerciseId
      const setsByExercise = new Map<string, typeof sets>();
      for (const row of sets) {
        const arr = setsByExercise.get(row.session_exercises.id) ?? [];
        arr.push(row);
        setsByExercise.set(row.session_exercises.id, arr);
      }

      return {
        session,
        exercises: exercises.map((e) => ({
          ...e.se,
          exercise: e.ex,
          sets: (setsByExercise.get(e.se.id) ?? []).map((r) => r.sets),
        })),
      };
    },

    async list(limit = 50): Promise<WorkoutSession[]> {
      return db
        .select()
        .from(schema.workoutSessions)
        .where(eq(schema.workoutSessions.status, 'completed'))
        .orderBy(desc(schema.workoutSessions.startedAt))
        .limit(limit)
        .all() as WorkoutSession[];
    },

    /** Marca un set como completado y actualiza los aggregates de la sesión. */
    async completeSet(setId: string, weight?: number, reps?: number): Promise<void> {
      db.transaction((tx) => {
        const set = tx.select().from(schema.sets).where(eq(schema.sets.id, setId)).get();
        if (!set) return;

        tx.update(schema.sets)
          .set({
            isCompleted: true,
            weight: weight ?? set.weight,
            reps: reps ?? set.reps,
            // No pisa una fecha ya puesta: el import de Strong la setea antes con
            // la fecha histórica real. `uncompleteSet` la limpia, así que
            // recompletar vuelve a dar la hora actual.
            completedAt: set.completedAt ?? new Date(),
          })
          .where(eq(schema.sets.id, setId))
          .run();

        // Recalcular totales de la sesión
        const seRow = tx
          .select({ sessionId: schema.sessionExercises.sessionId })
          .from(schema.sessionExercises)
          .where(eq(schema.sessionExercises.id, set.sessionExerciseId))
          .get();

        if (seRow) {
          const totals = tx
            .select({
              volume: sql<number>`COALESCE(SUM(CASE WHEN ${schema.sets.isCompleted} = 1 THEN ${setVolumeSql(schema.sets.weight, schema.sets.reps)} ELSE 0 END), 0)`,
              count: sql<number>`COALESCE(SUM(CASE WHEN ${schema.sets.isCompleted} = 1 THEN 1 ELSE 0 END), 0)`,
            })
            .from(schema.sets)
            .innerJoin(schema.sessionExercises, eq(schema.sessionExercises.id, schema.sets.sessionExerciseId))
            .where(eq(schema.sessionExercises.sessionId, seRow.sessionId))
            .get();

          tx.update(schema.workoutSessions)
            .set({ totalVolume: totals?.volume ?? 0, totalSets: totals?.count ?? 0 })
            .where(eq(schema.workoutSessions.id, seRow.sessionId))
            .run();
        }
      });
    },

    async uncompleteSet(setId: string): Promise<void> {
      db.update(schema.sets).set({ isCompleted: false, completedAt: null }).where(eq(schema.sets.id, setId)).run();
    },

    async updateSet(setId: string, patch: Partial<DbSet>): Promise<void> {
      db.update(schema.sets).set(patch).where(eq(schema.sets.id, setId)).run();
    },

    /**
     * Agrega un ejercicio a una sesión ya creada. `orderIndex` por defecto es el
     * último + 1, igual que `addSet` con `setIndex`.
     */
    async addSessionExercise(
      sessionId: string,
      exerciseId: string,
      opts: { orderIndex?: number; supersetGroup?: string | null } = {}
    ): Promise<SessionExercise> {
      let orderIndex = opts.orderIndex;
      if (orderIndex === undefined) {
        const last = db
          .select({ maxOrder: sql<number>`MAX(${schema.sessionExercises.orderIndex})` })
          .from(schema.sessionExercises)
          .where(eq(schema.sessionExercises.sessionId, sessionId))
          .get();
        orderIndex = (last?.maxOrder ?? 0) + 1;
      }

      const row: SessionExercise = {
        id: nanoid(),
        sessionId,
        exerciseId,
        orderIndex,
        supersetGroup: opts.supersetGroup ?? null,
        // Sin rutina de origen no hay targets que copiar (ver D11).
        targetSets: null,
        targetReps: null,
        restSeconds: null,
        notes: null,
      };
      db.insert(schema.sessionExercises).values(row).run();
      return row;
    },

    async addSet(sessionExerciseId: string): Promise<DbSet> {
      const last = db
        .select({ maxIdx: sql<number>`MAX(${schema.sets.setIndex})` })
        .from(schema.sets)
        .where(eq(schema.sets.sessionExerciseId, sessionExerciseId))
        .get();

      const id = nanoid();
      const newSet: DbSet = {
        id,
        sessionExerciseId,
        setIndex: (last?.maxIdx ?? 0) + 1,
        setType: 'working',
        weight: 0,
        reps: 0,
        isCompleted: false,
        rpe: null,
        actualRestSeconds: null,
        notes: null,
        completedAt: null,
      };
      db.insert(schema.sets).values(newSet).run();
      return newSet;
    },

    async deleteSet(setId: string): Promise<void> {
      db.delete(schema.sets).where(eq(schema.sets.id, setId)).run();
    },

    /**
     * Cierra la sesión: marca completed, guarda duración, recalcula PRs.
     *
     * `endedAt` permite cerrar una sesión histórica (import de Strong); por
     * defecto es ahora. La duración sale de startedAt → endedAt.
     */
    async finish(id: string, opts: { endedAt?: Date } = {}): Promise<void> {
      const session = await repo.byId(id);
      if (!session) return;
      const endedAt = opts.endedAt ?? new Date();
      const duration = Math.max(
        0,
        Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000)
      );

      db.transaction((tx) => {
        tx.update(schema.workoutSessions)
          .set({ status: 'completed', endedAt, durationSeconds: duration })
          .where(eq(schema.workoutSessions.id, id))
          .run();

        // Calcular PRs nuevos en esta sesión
        const completedSets = tx
          .select({
            setId: schema.sets.id,
            exerciseId: schema.sessionExercises.exerciseId,
            weight: schema.sets.weight,
            reps: schema.sets.reps,
            isCompleted: schema.sets.isCompleted,
            completedAt: schema.sets.completedAt,
          })
          .from(schema.sets)
          .innerJoin(schema.sessionExercises, eq(schema.sessionExercises.id, schema.sets.sessionExerciseId))
          .where(and(eq(schema.sessionExercises.sessionId, id), eq(schema.sets.isCompleted, true)))
          .all();

        const byExercise = new Map<string, typeof completedSets>();
        for (const s of completedSets) {
          const arr = byExercise.get(s.exerciseId) ?? [];
          arr.push(s);
          byExercise.set(s.exerciseId, arr);
        }

        byExercise.forEach((setsList, exerciseId) => {
          // El set con mayor 1RM estimado (Epley). En empate gana el primero.
          const prSet = bestByOneRm(setsList);
          if (!prSet) return;
          const bestOneRm = estimateOneRm(prSet.weight, prSet.reps);

          const existing = tx
            .select()
            .from(schema.personalRecords)
            .where(and(
              eq(schema.personalRecords.exerciseId, exerciseId),
              eq(schema.personalRecords.recordType, 'one_rm'),
            ))
            .get();

          if (!existing || bestOneRm > existing.value) {
            if (existing) {
              tx.update(schema.personalRecords)
                .set({
                  value: bestOneRm,
                  reps: prSet.reps,
                  weight: prSet.weight,
                  setId: prSet.setId,
                  achievedAt: prSet.completedAt ?? new Date(),
                })
                .where(eq(schema.personalRecords.id, existing.id))
                .run();
            } else {
              tx.insert(schema.personalRecords)
                .values({
                  id: nanoid(),
                  exerciseId,
                  recordType: 'one_rm',
                  value: bestOneRm,
                  reps: prSet.reps,
                  weight: prSet.weight,
                  setId: prSet.setId,
                  achievedAt: prSet.completedAt ?? new Date(),
                })
                .run();
            }
          }
        });
      });
    },

    async discard(id: string): Promise<void> {
      db.update(schema.workoutSessions).set({ status: 'discarded' }).where(eq(schema.workoutSessions.id, id)).run();
    },
  };

  return repo;
}
