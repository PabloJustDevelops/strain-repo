import { db, getRawDb, schema } from './client';
import { eq, and, gte, desc, sql, asc, isNull, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type {
  Exercise,
  NewExercise,
  Routine,
  RoutineExercise,
  WorkoutSession,
  SessionExercise,
  Set as DbSet,
  PersonalRecord,
} from './schema';

/**
 * Repositorios (Repository pattern).
 *
 * Centralizan todas las queries y mutaciones de la BD local.
 * Las pantallas consumen funciones tipo `createRoutine(...)` en vez de
 * escribir SQL/Drizzle crudo, lo que permite:
 *   - Cambiar el motor de almacenamiento sin tocar UI.
 *   - Añadir caching, validación, sync queue, métricas, etc. en un solo sitio.
 *   - Testear la lógica de dominio con mocks del repositorio.
 */

// ============================================================
// EJERCICIOS
// ============================================================

export const ExercisesRepo = {
  async list(): Promise<Exercise[]> {
    return db.select().from(schema.exercises).orderBy(asc(schema.exercises.name)).all() as Exercise[];
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
      .all() as Exercise[];
  },

  async search(query: string): Promise<Exercise[]> {
    const q = `%${query.toLowerCase()}%`;
    return db
      .select()
      .from(schema.exercises)
      .where(sql`lower(${schema.exercises.name}) LIKE ${q}`)
      .orderBy(asc(schema.exercises.name))
      .all() as Exercise[];
  },

  async create(input: Omit<NewExercise, 'id' | 'createdAt' | 'updatedAt'>): Promise<Exercise> {
    const id = nanoid();
    const now = new Date();
    db.insert(schema.exercises).values({ ...input, id, createdAt: now, updatedAt: now }).run();
    return (await this.byId(id))!;
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

// ============================================================
// RUTINAS
// ============================================================

export const RoutinesRepo = {
  async list(includeArchived = false): Promise<Routine[]> {
    const where = includeArchived ? undefined : eq(schema.routines.isArchived, false);
    const query = db.select().from(schema.routines);
    return (where ? query.where(where) : query).orderBy(desc(schema.routines.updatedAt)).all() as Routine[];
  },

  async byId(id: string): Promise<Routine | undefined> {
    return db.select().from(schema.routines).where(eq(schema.routines.id, id)).get();
  },

  async getWithExercises(id: string): Promise<{ routine: Routine; exercises: (RoutineExercise & { exercise: Exercise })[] } | null> {
    const routine = await this.byId(id);
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
    const id = nanoid();
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
    return (await this.byId(id))!;
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
    const original = await this.getWithExercises(id);
    if (!original) throw new Error('Routine not found');

    const clone = await this.create({
      name: newName ?? `${original.routine.name} (copia)`,
      description: original.routine.description ?? undefined,
      tags: original.routine.tags ?? [],
      color: original.routine.color ?? '#3b82f6',
    });

    for (const ex of original.exercises) {
      db.insert(schema.routineExercises)
        .values({
          id: nanoid(),
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
        id: nanoid(),
        routineId,
        exerciseId,
        orderIndex: (last?.maxOrder ?? 0) + 1,
        targetSets: 3,
        targetReps: '8-12',
        restSeconds: 90,
        supersetGroup: opts.supersetGroup ?? null,
      })
      .run();
    await this.touch(routineId);
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
    await this.touch(routineId);
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
    await this.touch(routineId);
  },

  async removeExercise(routineExerciseId: string): Promise<void> {
    db.delete(schema.routineExercises).where(eq(schema.routineExercises.id, routineExerciseId)).run();
  },

  async touch(id: string): Promise<void> {
    db.update(schema.routines).set({ updatedAt: new Date() }).where(eq(schema.routines.id, id)).run();
  },
};

// ============================================================
// SESIONES DE WORKOUT (la parte central de la app)
// ============================================================

export const SessionsRepo = {
  /** Inicia una nueva sesión (con o sin rutina como base). */
  async start(input: {
    name: string;
    routineId?: string;
    fromRoutineExercises?: {
      exerciseId: string;
      targetSets: number;
      targetReps: string;
      targetWeight?: number;
      restSeconds: number;
      supersetGroup?: string | null;
    }[];
  }): Promise<WorkoutSession> {
    const id = nanoid();
    const now = new Date();

    db.transaction((tx) => {
      tx.insert(schema.workoutSessions)
        .values({
          id,
          name: input.name,
          routineId: input.routineId,
          startedAt: now,
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

    return (await this.byId(id))!;
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

  async getFullSession(id: string) {
    const session = await this.byId(id);
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
          completedAt: new Date(),
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
            volume: sql<number>`COALESCE(SUM(CASE WHEN ${schema.sets.isCompleted} = 1 THEN ${schema.sets.weight} * ${schema.sets.reps} ELSE 0 END), 0)`,
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

  /** Cierra la sesión: marca completed, guarda duración, recalcula PRs. */
  async finish(id: string): Promise<void> {
    const session = await this.byId(id);
    if (!session) return;
    const endedAt = new Date();
    const duration = Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000);

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
        // Encontrar el set con mayor 1RM estimado (fórmula de Epley)
        let bestSet = setsList[0];
        let bestOneRm = 0;
        for (const s of setsList) {
          const oneRm = s.weight * (1 + s.reps / 30);
          if (oneRm > bestOneRm) {
            bestOneRm = oneRm;
            bestSet = s;
          }
        }

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
                reps: bestSet.reps,
                weight: bestSet.weight,
                setId: bestSet.setId,
                achievedAt: bestSet.completedAt ?? new Date(),
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
                reps: bestSet.reps,
                weight: bestSet.weight,
                setId: bestSet.setId,
                achievedAt: bestSet.completedAt ?? new Date(),
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

// ============================================================
// ANALYTICS
// ============================================================

export const AnalyticsRepo = {
  async volumePerWeek(weeks = 12): Promise<{ weekStart: string; volume: number }[]> {
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);
    const rows = db
      .select({
        week: sql<string>`strftime('%Y-%W', ${schema.workoutSessions.startedAt}, 'unixepoch')`,
        volume: sql<number>`COALESCE(SUM(${schema.workoutSessions.totalVolume}), 0)`,
      })
      .from(schema.workoutSessions)
      .where(and(
        eq(schema.workoutSessions.status, 'completed'),
        gte(schema.workoutSessions.startedAt, since),
      ))
      .groupBy(sql`week`)
      .all();

    return rows.map((r) => ({ weekStart: r.week, volume: r.volume }));
  },

  async strengthProgression(exerciseId: string): Promise<{ date: Date; oneRm: number }[]> {
    const rows = db
      .select({
        date: schema.workoutSessions.startedAt,
        maxWeight: sql<number>`MAX(${schema.sets.weight})`,
      })
      .from(schema.sets)
      .innerJoin(schema.sessionExercises, eq(schema.sessionExercises.id, schema.sets.sessionExerciseId))
      .innerJoin(schema.workoutSessions, eq(schema.workoutSessions.id, schema.sessionExercises.sessionId))
      .where(and(
        eq(schema.sessionExercises.exerciseId, exerciseId),
        eq(schema.sets.isCompleted, true),
        eq(schema.workoutSessions.status, 'completed'),
      ))
      .groupBy(schema.workoutSessions.startedAt)
      .orderBy(asc(schema.workoutSessions.startedAt))
      .all();

    return rows.map((r) => ({
      date: r.date,
      // Estimación de 1RM conservadora (Epley)
      oneRm: r.maxWeight * 1.05,
    }));
  },

  async currentStreak(): Promise<number> {
    const rows = db
      .select({ day: sql<string>`strftime('%Y-%m-%d', ${schema.workoutSessions.startedAt}, 'unixepoch')` })
      .from(schema.workoutSessions)
      .where(eq(schema.workoutSessions.status, 'completed'))
      .groupBy(sql`day`)
      .orderBy(sql`day DESC`)
      .all();

    if (rows.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < rows.length; i++) {
      const expected = new Date(today);
      expected.setDate(today.getDate() - i);
      const expectedStr = expected.toISOString().split('T')[0];
      if (rows[i].day === expectedStr) {
        streak++;
      } else if (i === 0) {
        // Permitir que la racha cuente si ayer entrenó (no penalizar hoy en blanco)
        expected.setDate(today.getDate() - 1);
        const yesterdayStr = expected.toISOString().split('T')[0];
        if (rows[i].day === yesterdayStr) {
          streak++;
          continue;
        } else {
          break;
        }
      } else {
        break;
      }
    }
    return streak;
  },

  async personalRecords(exerciseId?: string): Promise<PersonalRecord[]> {
    if (exerciseId) {
      return db.select().from(schema.personalRecords).where(eq(schema.personalRecords.exerciseId, exerciseId)).all() as PersonalRecord[];
    }
    return db.select().from(schema.personalRecords).all() as PersonalRecord[];
  },

  /**
   * Serie temporal del peso máximo por sesión para un ejercicio.
   * Devuelve { date, maxWeight, volume, oneRmEstimated, sessionId } ordenado por fecha.
   */
  async exerciseTimeline(exerciseId: string, sinceDays = 365) {
    const since = new Date();
    since.setDate(since.getDate() - sinceDays);
    const rows = db
      .select({
        sessionId: schema.workoutSessions.id,
        date: schema.workoutSessions.startedAt,
        maxWeight: sql<number>`MAX(${schema.sets.weight})`,
        maxReps: sql<number>`MAX(${schema.sets.reps})`,
        totalVolume: sql<number>`SUM(${schema.sets.weight} * ${schema.sets.reps})`,
        totalSets: sql<number>`COUNT(${schema.sets.id})`,
        bestOneRm: sql<number>`MAX(${schema.sets.weight} * (1 + ${schema.sets.reps} / 30.0))`,
      })
      .from(schema.sets)
      .innerJoin(schema.sessionExercises, eq(schema.sessionExercises.id, schema.sets.sessionExerciseId))
      .innerJoin(schema.workoutSessions, eq(schema.workoutSessions.id, schema.sessionExercises.sessionId))
      .where(and(
        eq(schema.sessionExercises.exerciseId, exerciseId),
        eq(schema.sets.isCompleted, true),
        eq(schema.workoutSessions.status, 'completed'),
        gte(schema.workoutSessions.startedAt, since),
      ))
      .groupBy(schema.workoutSessions.id, schema.workoutSessions.startedAt)
      .orderBy(asc(schema.workoutSessions.startedAt))
      .all();
    return rows;
  },

  /** Mejor set (por 1RM estimado) en cada mes para un ejercicio. */
  async monthlyBest(exerciseId: string, sinceDays = 365) {
    const since = new Date();
    since.setDate(since.getDate() - sinceDays);
    return db
      .select({
        month: sql<string>`strftime('%Y-%m', ${schema.workoutSessions.startedAt}, 'unixepoch')`,
        bestOneRm: sql<number>`MAX(${schema.sets.weight} * (1 + ${schema.sets.reps} / 30.0))`,
        bestWeight: sql<number>`MAX(${schema.sets.weight})`,
        bestReps: sql<number>`MAX(${schema.sets.reps})`,
      })
      .from(schema.sets)
      .innerJoin(schema.sessionExercises, eq(schema.sessionExercises.id, schema.sets.sessionExerciseId))
      .innerJoin(schema.workoutSessions, eq(schema.workoutSessions.id, schema.sessionExercises.sessionId))
      .where(and(
        eq(schema.sessionExercises.exerciseId, exerciseId),
        eq(schema.sets.isCompleted, true),
        eq(schema.workoutSessions.status, 'completed'),
        gte(schema.workoutSessions.startedAt, since),
      ))
      .groupBy(sql`month`)
      .orderBy(sql`month`)
      .all();
  },

  /** Lista de PRs alcanzados para un ejercicio, ordenados por fecha. */
  async exercisePrHistory(exerciseId: string) {
    return db
      .select({
        id: schema.personalRecords.id,
        recordType: schema.personalRecords.recordType,
        value: schema.personalRecords.value,
        reps: schema.personalRecords.reps,
        weight: schema.personalRecords.weight,
        achievedAt: schema.personalRecords.achievedAt,
      })
      .from(schema.personalRecords)
      .where(eq(schema.personalRecords.exerciseId, exerciseId))
      .orderBy(asc(schema.personalRecords.achievedAt))
      .all();
  },

  /** Conteo de veces que se ha hecho el ejercicio. */
  async exerciseStats(exerciseId: string) {
    const totals = db
      .select({
        sessions: sql<number>`COUNT(DISTINCT ${schema.workoutSessions.id})`,
        totalSets: sql<number>`COUNT(${schema.sets.id})`,
        totalVolume: sql<number>`COALESCE(SUM(${schema.sets.weight} * ${schema.sets.reps}), 0)`,
      })
      .from(schema.sets)
      .innerJoin(schema.sessionExercises, eq(schema.sessionExercises.id, schema.sets.sessionExerciseId))
      .innerJoin(schema.workoutSessions, eq(schema.workoutSessions.id, schema.sessionExercises.sessionId))
      .where(and(
        eq(schema.sessionExercises.exerciseId, exerciseId),
        eq(schema.sets.isCompleted, true),
        eq(schema.workoutSessions.status, 'completed'),
      ))
      .get();
    return totals ?? { sessions: 0, totalSets: 0, totalVolume: 0 };
  },

  /**
   * Volumen por día para alimentar el heatmap de consistencia.
   * Devuelve una entrada por cada día con sesión completada en el rango.
   */
  async dailyVolume(sinceDays = 365): Promise<{ date: string; count: number; volume: number }[]> {
    const since = new Date();
    since.setDate(since.getDate() - sinceDays);
    const rows = db
      .select({
        date: sql<string>`strftime('%Y-%m-%d', ${schema.workoutSessions.startedAt}, 'unixepoch')`,
        count: sql<number>`COUNT(DISTINCT ${schema.workoutSessions.id})`,
        volume: sql<number>`COALESCE(SUM(${schema.workoutSessions.totalVolume}), 0)`,
      })
      .from(schema.workoutSessions)
      .where(and(
        eq(schema.workoutSessions.status, 'completed'),
        gte(schema.workoutSessions.startedAt, since),
      ))
      .groupBy(sql`date`)
      .all();
    return rows;
  },
};

/** Exporta todo el repositorio en un solo objeto para fácil importación. */
export const Repos = {
  exercises: ExercisesRepo,
  routines: RoutinesRepo,
  sessions: SessionsRepo,
  analytics: AnalyticsRepo,
};
