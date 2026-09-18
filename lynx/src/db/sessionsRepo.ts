import { newId } from '@lib/id';
import { bestByOneRm, estimateOneRm, sessionTotals } from '@lib/metrics';

import { createKvStore } from './kv';
import type { Exercise, PersonalRecord, SessionExercise, Set as DbSet, WorkoutSession } from './schema';
import type { Storage } from './storage';

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

export function createSessionsRepo(storage: Storage): SessionsRepo {
  const sessions = createKvStore<WorkoutSession>(storage, 'session', ['startedAt', 'endedAt', 'createdAt']);
  const sessionExercises = createKvStore<SessionExercise>(storage, 'sessionExercise');
  const sets = createKvStore<DbSet>(storage, 'set', ['completedAt']);
  const exercises = createKvStore<Exercise>(storage, 'exercise', ['createdAt', 'updatedAt']);
  const personalRecords = createKvStore<PersonalRecord>(storage, 'personalRecord', ['achievedAt']);

  function sessionExercisesOf(sessionId: string): SessionExercise[] {
    return sessionExercises.all().filter((se) => se.sessionId === sessionId).sort((a, b) => a.orderIndex - b.orderIndex);
  }

  function setsOf(sessionExerciseId: string): DbSet[] {
    return sets.all().filter((s) => s.sessionExerciseId === sessionExerciseId).sort((a, b) => a.setIndex - b.setIndex);
  }

  function setsOfSession(sessionId: string): DbSet[] {
    const ids = new Set(sessionExercisesOf(sessionId).map((se) => se.id));
    return sets.all().filter((s) => ids.has(s.sessionExerciseId));
  }

  function recalcTotals(sessionId: string): void {
    const session = sessions.byId(sessionId);
    if (!session) return;
    const totals = sessionTotals(setsOfSession(sessionId));
    sessions.put({ ...session, totalVolume: totals.volume, totalSets: totals.completedSets });
  }

  const repo: SessionsRepo = {
    async start(input) {
      const id = newId();
      const startedAt = input.startedAt ?? new Date();

      sessions.put({
        id, name: input.name, routineId: input.routineId ?? null, startedAt,
        endedAt: null, durationSeconds: null, notes: null, totalVolume: 0,
        totalSets: 0, status: 'active', createdAt: new Date(),
      });

      (input.fromRoutineExercises ?? []).forEach((ex, idx) => {
        const sessionExerciseId = newId();
        sessionExercises.put({
          id: sessionExerciseId, sessionId: id, exerciseId: ex.exerciseId,
          orderIndex: idx + 1, supersetGroup: ex.supersetGroup ?? null,
          targetSets: ex.targetSets, targetReps: ex.targetReps,
          restSeconds: ex.restSeconds, notes: null,
        });
        for (let s = 1; s <= ex.targetSets; s++) {
          sets.put({
            id: newId(), sessionExerciseId, setIndex: s,
            setType: s === 1 ? 'warmup' : 'working', weight: ex.targetWeight ?? 0,
            reps: 0, isCompleted: false, rpe: null, actualRestSeconds: null,
            notes: null, completedAt: null,
          });
        }
      });

      return sessions.byId(id)!;
    },

    async setSessionExerciseSuperset(sessionExerciseId, group) {
      const se = sessionExercises.byId(sessionExerciseId);
      if (se) sessionExercises.put({ ...se, supersetGroup: group });
    },

    async byId(id) { return sessions.byId(id); },

    async activeSession() { return sessions.all().find((s) => s.status === 'active'); },

    async getFullSession(id) {
      const session = sessions.byId(id);
      if (!session) return null;
      const exs = sessionExercisesOf(id)
        .map((se) => {
          const exercise = exercises.byId(se.exerciseId);
          return exercise ? { ...se, exercise, sets: setsOf(se.id) } : null;
        })
        .filter((e): e is SessionExercise & { exercise: Exercise; sets: DbSet[] } => e !== null);
      return { session, exercises: exs };
    },

    async list(limit = 50) {
      return sessions.all().filter((s) => s.status === 'completed')
        .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime()).slice(0, limit);
    },

    async completeSet(setId, weight, reps) {
      const set = sets.byId(setId);
      if (!set) return;
      sets.put({
        ...set, isCompleted: true, weight: weight ?? set.weight,
        reps: reps ?? set.reps, completedAt: set.completedAt ?? new Date(),
      });
      const se = sessionExercises.byId(set.sessionExerciseId);
      if (se) recalcTotals(se.sessionId);
    },

    async uncompleteSet(setId) {
      const set = sets.byId(setId);
      if (!set) return;
      sets.put({ ...set, isCompleted: false, completedAt: null });
      const se = sessionExercises.byId(set.sessionExerciseId);
      if (se) recalcTotals(se.sessionId);
    },

    async updateSet(setId, patch) {
      const set = sets.byId(setId);
      if (!set) return;
      sets.put({ ...set, ...patch, id: setId });
      const se = sessionExercises.byId(set.sessionExerciseId);
      if (se) recalcTotals(se.sessionId);
    },

    async addSessionExercise(sessionId, exerciseId, opts = {}) {
      let orderIndex = opts.orderIndex;
      if (orderIndex === undefined) {
        orderIndex = sessionExercisesOf(sessionId).reduce((m, se) => Math.max(m, se.orderIndex), 0) + 1;
      }
      const row: SessionExercise = {
        id: newId(), sessionId, exerciseId, orderIndex,
        supersetGroup: opts.supersetGroup ?? null,
        targetSets: null, targetReps: null, restSeconds: null, notes: null,
      };
      sessionExercises.put(row);
      return row;
    },

    async addSet(sessionExerciseId) {
      const last = setsOf(sessionExerciseId).reduce((m, s) => Math.max(m, s.setIndex), 0);
      const newSet: DbSet = {
        id: newId(), sessionExerciseId, setIndex: last + 1, setType: 'working',
        weight: 0, reps: 0, isCompleted: false, rpe: null,
        actualRestSeconds: null, notes: null, completedAt: null,
      };
      sets.put(newSet);
      return newSet;
    },

    async deleteSet(setId) {
      const set = sets.byId(setId);
      sets.remove(setId);
      if (set) {
        const se = sessionExercises.byId(set.sessionExerciseId);
        if (se) recalcTotals(se.sessionId);
      }
    },

    async finish(id, opts = {}) {
      const session = sessions.byId(id);
      if (!session) return;
      const endedAt = opts.endedAt ?? new Date();
      const duration = Math.max(0, Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000));

      sessions.put({ ...session, status: 'completed', endedAt, durationSeconds: duration });

      const completed = setsOfSession(id).filter((s) => s.isCompleted);
      const seById = new Map(sessionExercisesOf(id).map((se) => [se.id, se]));
      const byExercise = new Map<string, DbSet[]>();
      for (const s of completed) {
        const se = seById.get(s.sessionExerciseId);
        if (!se) continue;
        const arr = byExercise.get(se.exerciseId) ?? [];
        arr.push(s);
        byExercise.set(se.exerciseId, arr);
      }

      byExercise.forEach((setsList, exerciseId) => {
        const prSet = bestByOneRm(setsList);
        if (!prSet) return;
        const bestOneRm = estimateOneRm(prSet.weight, prSet.reps);
        const existing = personalRecords.all().find((pr) => pr.exerciseId === exerciseId && pr.recordType === 'one_rm');

        if (!existing) {
          personalRecords.put({
            id: newId(), exerciseId, recordType: 'one_rm', value: bestOneRm,
            reps: prSet.reps, weight: prSet.weight, setId: prSet.id,
            achievedAt: prSet.completedAt ?? new Date(),
          });
        } else if (bestOneRm > existing.value) {
          personalRecords.put({
            ...existing, value: bestOneRm, reps: prSet.reps, weight: prSet.weight,
            setId: prSet.id, achievedAt: prSet.completedAt ?? new Date(),
          });
        }
      });
    },

    async discard(id) {
      const session = sessions.byId(id);
      if (session) sessions.put({ ...session, status: 'discarded' });
    },
  };

  return repo;
}
