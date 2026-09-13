import { eq, and, gte, asc, sql } from 'drizzle-orm';

import * as schema from '../schema';
import type { SqliteDb } from '../seam';
import type { PersonalRecord } from '../schema';
import { oneRmSql, setVolumeSql } from '@lib/metrics';

export interface AnalyticsRepo {
  volumePerWeek(weeks?: number): Promise<{ weekStart: string; volume: number }[]>;
  currentStreak(): Promise<number>;
  personalRecords(exerciseId?: string): Promise<PersonalRecord[]>;
  exerciseTimeline(exerciseId: string, sinceDays?: number): Promise<
    { sessionId: string; date: Date; maxWeight: number; maxReps: number; totalVolume: number; totalSets: number; bestOneRm: number }[]
  >;
  monthlyBest(exerciseId: string, sinceDays?: number): Promise<
    { month: string; bestOneRm: number; bestWeight: number; bestReps: number }[]
  >;
  exercisePrHistory(exerciseId: string): Promise<
    { id: string; recordType: string; value: number; reps: number | null; weight: number | null; achievedAt: Date }[]
  >;
  exerciseStats(exerciseId: string): Promise<{ sessions: number; totalSets: number; totalVolume: number }>;
  dailyVolume(sinceDays?: number): Promise<{ date: string; count: number; volume: number }[]>;
}

export function createAnalyticsRepo(db: SqliteDb): AnalyticsRepo {
  return {
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
        return db.select().from(schema.personalRecords).where(eq(schema.personalRecords.exerciseId, exerciseId)).all();
      }

      return db.select().from(schema.personalRecords).all();
    },

    /**
     * Serie temporal del peso máximo por sesión para un ejercicio.
     * Ordenado por fecha.
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
          totalVolume: sql<number>`SUM(${setVolumeSql(schema.sets.weight, schema.sets.reps)})`,
          totalSets: sql<number>`COUNT(${schema.sets.id})`,
          bestOneRm: sql<number>`MAX(${oneRmSql(schema.sets.weight, schema.sets.reps)})`,
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
          bestOneRm: sql<number>`MAX(${oneRmSql(schema.sets.weight, schema.sets.reps)})`,
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
          totalVolume: sql<number>`COALESCE(SUM(${setVolumeSql(schema.sets.weight, schema.sets.reps)}), 0)`,
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
}
