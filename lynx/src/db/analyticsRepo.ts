import { estimateOneRm } from '@lib/metrics';

import { createKvStore } from './kv';
import type { PersonalRecord, SessionExercise, Set as DbSet, WorkoutSession } from './schema';
import type { Storage } from './storage';

/** Réplica de strftime('%Y-%W') de SQLite para agrupar por semana. */
function weekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-${String(week).padStart(2, '0')}`;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

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

export function createAnalyticsRepo(storage: Storage): AnalyticsRepo {
  const sessions = createKvStore<WorkoutSession>(storage, 'session', ['startedAt', 'endedAt', 'createdAt']);
  const sessionExercises = createKvStore<SessionExercise>(storage, 'sessionExercise');
  const sets = createKvStore<DbSet>(storage, 'set', ['completedAt']);
  const personalRecords = createKvStore<PersonalRecord>(storage, 'personalRecord', ['achievedAt']);

  const completedSessions = () => sessions.all().filter((s) => s.status === 'completed');

  /** Sets completados de un ejercicio con su sesión (ya completada) asociada. */
  function completedSetsOfExercise(exerciseId: string, sinceDays?: number) {
    const since = sinceDays !== undefined ? daysAgo(sinceDays) : null;
    const seIds = new Set(
      sessionExercises.all().filter((se) => se.exerciseId === exerciseId).map((se) => se.id),
    );
    const sessionById = new Map(completedSessions().map((s) => [s.id, s]));
    const seById = new Map(sessionExercises.all().map((se) => [se.id, se]));

    const out: { set: DbSet; session: WorkoutSession }[] = [];
    for (const s of sets.all()) {
      if (!s.isCompleted || !seIds.has(s.sessionExerciseId)) continue;
      const se = seById.get(s.sessionExerciseId);
      if (!se) continue;
      const session = sessionById.get(se.sessionId);
      if (!session) continue;
      if (since && session.startedAt < since) continue;
      out.push({ set: s, session });
    }
    return out;
  }

  return {
    async volumePerWeek(weeks = 12) {
      const since = daysAgo(weeks * 7);
      const byWeek = new Map<string, number>();
      for (const s of completedSessions()) {
        if (s.startedAt < since) continue;
        const key = weekKey(s.startedAt);
        byWeek.set(key, (byWeek.get(key) ?? 0) + s.totalVolume);
      }
      return [...byWeek.entries()].map(([weekStart, volume]) => ({ weekStart, volume }));
    },

    async currentStreak() {
      const days = [...new Set(completedSessions().map((s) => dayKey(s.startedAt)))].sort().reverse();
      if (days.length === 0) return 0;

      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < days.length; i++) {
        const expected = new Date(today);
        expected.setDate(today.getDate() - i);
        const expectedStr = dayKey(expected);
        if (days[i] === expectedStr) {
          streak++;
        } else if (i === 0) {
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          if (days[i] === dayKey(yesterday)) { streak++; continue; }
          break;
        } else {
          break;
        }
      }
      return streak;
    },

    async personalRecords(exerciseId) {
      const all = personalRecords.all();
      return exerciseId ? all.filter((pr) => pr.exerciseId === exerciseId) : all;
    },

    async exerciseTimeline(exerciseId, sinceDays = 180) {
      const bySession = new Map<string, { session: WorkoutSession; sets: DbSet[] }>();
      for (const { set, session } of completedSetsOfExercise(exerciseId, sinceDays)) {
        const entry = bySession.get(session.id) ?? { session, sets: [] };
        entry.sets.push(set);
        bySession.set(session.id, entry);
      }
      return [...bySession.values()]
        .map(({ session, sets: ss }) => ({
          sessionId: session.id,
          date: session.startedAt,
          maxWeight: Math.max(...ss.map((s) => s.weight), 0),
          maxReps: Math.max(...ss.map((s) => s.reps), 0),
          totalVolume: ss.reduce((v, s) => v + s.weight * s.reps, 0),
          totalSets: ss.length,
          bestOneRm: Math.max(...ss.map((s) => estimateOneRm(s.weight, s.reps)), 0),
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());
    },

    async monthlyBest(exerciseId, sinceDays = 365) {
      const byMonth = new Map<string, { bestOneRm: number; bestWeight: number; bestReps: number }>();
      for (const { set } of completedSetsOfExercise(exerciseId, sinceDays)) {
        const session = completedSessions().find((s) => {
          const se = sessionExercises.byId(set.sessionExerciseId);
          return se && se.sessionId === s.id;
        });
        if (!session) continue;
        const key = monthKey(session.startedAt);
        const cur = byMonth.get(key) ?? { bestOneRm: 0, bestWeight: 0, bestReps: 0 };
        cur.bestOneRm = Math.max(cur.bestOneRm, estimateOneRm(set.weight, set.reps));
        cur.bestWeight = Math.max(cur.bestWeight, set.weight);
        cur.bestReps = Math.max(cur.bestReps, set.reps);
        byMonth.set(key, cur);
      }
      return [...byMonth.entries()]
        .map(([month, v]) => ({ month, ...v }))
        .sort((a, b) => a.month.localeCompare(b.month));
    },

    async exercisePrHistory(exerciseId) {
      return personalRecords
        .all()
        .filter((pr) => pr.exerciseId === exerciseId)
        .sort((a, b) => a.achievedAt.getTime() - b.achievedAt.getTime())
        .map(({ id, recordType, value, reps, weight, achievedAt }) => ({ id, recordType, value, reps, weight, achievedAt }));
    },

    async exerciseStats(exerciseId) {
      const rows = completedSetsOfExercise(exerciseId);
      const sessionIds = new Set(rows.map((r) => r.session.id));
      return {
        sessions: sessionIds.size,
        totalSets: rows.length,
        totalVolume: rows.reduce((v, r) => v + r.set.weight * r.set.reps, 0),
      };
    },

    async dailyVolume(sinceDays = 365) {
      const since = daysAgo(sinceDays);
      const byDay = new Map<string, { count: number; volume: number; ids: Set<string> }>();
      for (const s of completedSessions()) {
        if (s.startedAt < since) continue;
        const key = dayKey(s.startedAt);
        const cur = byDay.get(key) ?? { count: 0, volume: 0, ids: new Set<string>() };
        if (!cur.ids.has(s.id)) { cur.ids.add(s.id); cur.count++; }
        cur.volume += s.totalVolume;
        byDay.set(key, cur);
      }
      return [...byDay.entries()].map(([date, v]) => ({ date, count: v.count, volume: v.volume }));
    },
  };
}
