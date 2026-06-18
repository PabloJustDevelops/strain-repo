import { create } from 'zustand';
import { SessionsRepo } from '@db/repositories';
import type {
  ActiveSessionView,
  SessionExerciseView,
  SetView,
} from '@/types/domain';

/**
 * Estado del workout en curso.
 *
 * - Se hidrata desde SQLite al abrir /workout/active.
 * - Optimistic updates: marca sets como completados localmente y sincroniza
 *   con la BD en background para que la UI sea instantánea.
 * - Mantiene también el timer global y el de descanso entre sets.
 */

interface ActiveWorkoutState {
  session: ActiveSessionView | null;
  isLoading: boolean;
  restRemaining: number;          // segundos restantes del descanso actual
  isResting: boolean;
  restStartedAt: number | null;   // timestamp del último descanso iniciado

  // Acciones
  loadActive: () => Promise<void>;
  startEmpty: (name: string) => Promise<void>;
  startFromRoutine: (routineId: string) => Promise<void>;
  completeSet: (setId: string, weight?: number, reps?: number) => Promise<void>;
  uncompleteSet: (setId: string) => Promise<void>;
  updateSet: (setId: string, patch: Partial<SetView>) => Promise<void>;
  addSet: (sessionExerciseId: string) => Promise<void>;
  deleteSet: (setId: string) => Promise<void>;
  setSupersetGroup: (sessionExerciseId: string, group: string | null) => Promise<void>;
  startRest: (seconds: number) => void;
  skipRest: () => void;
  tickRest: () => void;           // llamado por un useEffect cada segundo
  finishWorkout: () => Promise<void>;
  discardWorkout: () => Promise<void>;
}

function mapDbToView(db: Awaited<ReturnType<typeof SessionsRepo.getFullSession>>): ActiveSessionView | null {
  if (!db) return null;
  return {
    id: db.session.id,
    name: db.session.name,
    startedAt: db.session.startedAt,
    elapsedSeconds: db.session.startedAt
      ? Math.floor((Date.now() - db.session.startedAt.getTime()) / 1000)
      : 0,
    exercises: db.exercises.map<SessionExerciseView>((ex) => ({
      id: ex.id,
      exerciseId: ex.exerciseId,
      name: ex.exercise.name,
      muscleGroup: ex.exercise.muscleGroup,
      equipment: ex.exercise.equipment,
      orderIndex: ex.orderIndex,
      notes: ex.notes,
      targetSets: ex.sets.length,
      targetReps: '-',
      restSeconds: 90,
      sets: ex.sets.map<SetView>((s) => ({
        id: s.id,
        setIndex: s.setIndex,
        type: s.setType,
        weight: s.weight,
        reps: s.reps,
        isCompleted: s.isCompleted,
        rpe: s.rpe,
      })),
    })),
    totalVolume: db.session.totalVolume,
    totalSets: db.session.totalSets,
    completedSets: db.exercises.reduce(
      (acc, ex) => acc + ex.sets.filter((s) => s.isCompleted).length,
      0
    ),
  };
}

export const useActiveWorkout = create<ActiveWorkoutState>((set, get) => ({
  session: null,
  isLoading: false,
  restRemaining: 0,
  isResting: false,
  restStartedAt: null,

  async loadActive() {
    set({ isLoading: true });
    const active = await SessionsRepo.activeSession();
    if (!active) {
      set({ session: null, isLoading: false });
      return;
    }
    const full = await SessionsRepo.getFullSession(active.id);
    set({ session: mapDbToView(full), isLoading: false });
  },

  async startEmpty(name) {
    const session = await SessionsRepo.start({ name });
    const full = await SessionsRepo.getFullSession(session.id);
    set({ session: mapDbToView(full) });
  },

  async startFromRoutine(routineId) {
    const full = await import('@db/repositories').then((m) =>
      m.RoutinesRepo.getWithExercises(routineId)
    );
    if (!full) return;
    const session = await SessionsRepo.start({
      name: full.routine.name,
      routineId,
      fromRoutineExercises: full.exercises.map((re) => ({
        exerciseId: re.exerciseId,
        targetSets: re.targetSets,
        targetReps: re.targetReps,
        targetWeight: re.targetWeight ?? undefined,
        restSeconds: re.restSeconds,
      })),
    });
    const detailed = await SessionsRepo.getFullSession(session.id);
    set({ session: mapDbToView(detailed) });
  },

  async completeSet(setId, weight, reps) {
    const { session } = get();
    if (!session) return;
    // Optimistic update
    const updated: ActiveSessionView = {
      ...session,
      exercises: session.exercises.map((ex) => ({
        ...ex,
        sets: ex.sets.map((s) =>
          s.id === setId ? { ...s, isCompleted: true, weight: weight ?? s.weight, reps: reps ?? s.reps } : s
        ),
      })),
    };
    updated.completedSets = updated.exercises.reduce(
      (acc, ex) => acc + ex.sets.filter((s) => s.isCompleted).length,
      0
    );
    set({ session: updated });

    await SessionsRepo.completeSet(setId, weight, reps);

    // Inicia el descanso automáticamente (usa el último rest configurado)
    const setDef = updated.exercises
      .flatMap((ex) => ex.sets)
      .find((s) => s.id === setId);
    if (setDef) {
      get().startRest(90); // TODO: obtener rest del ejercicio
    }
  },

  async uncompleteSet(setId) {
    const { session } = get();
    if (!session) return;
    set({
      session: {
        ...session,
        exercises: session.exercises.map((ex) => ({
          ...ex,
          sets: ex.sets.map((s) => (s.id === setId ? { ...s, isCompleted: false } : s)),
        })),
        completedSets: session.completedSets - 1,
      },
    });
    await SessionsRepo.uncompleteSet(setId);
  },

  async updateSet(setId, patch) {
    const { session } = get();
    if (!session) return;
    set({
      session: {
        ...session,
        exercises: session.exercises.map((ex) => ({
          ...ex,
          sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
        })),
      },
    });
    // SetView usa 'type'/'isCompleted', la tabla usa 'setType'/'isCompleted'+completedAt.
    const dbPatch: Record<string, unknown> = {};
    if ('weight' in patch) dbPatch.weight = patch.weight;
    if ('reps' in patch) dbPatch.reps = patch.reps;
    if ('rpe' in patch) dbPatch.rpe = patch.rpe;
    if ('notes' in patch) dbPatch.notes = patch.notes;
    if ('isCompleted' in patch) {
      dbPatch.isCompleted = patch.isCompleted;
      if (patch.isCompleted) dbPatch.completedAt = new Date();
      else dbPatch.completedAt = null;
    }
    await SessionsRepo.updateSet(setId, dbPatch);
  },

  async setSupersetGroup(sessionExerciseId, group) {
    const { session } = get();
    if (!session) return;
    set({
      session: {
        ...session,
        exercises: session.exercises.map((ex) =>
          ex.id === sessionExerciseId ? { ...ex, supersetGroup: group } : ex
        ),
      },
    });
    await SessionsRepo.setSessionExerciseSuperset(sessionExerciseId, group);
  },

  async addSet(sessionExerciseId) {
    await SessionsRepo.addSet(sessionExerciseId);
    const { session } = get();
    if (!session) return;
    const full = await SessionsRepo.getFullSession(session.id);
    set({ session: mapDbToView(full) });
  },

  async deleteSet(setId) {
    const { session } = get();
    if (!session) return;
    set({
      session: {
        ...session,
        exercises: session.exercises.map((ex) => ({
          ...ex,
          sets: ex.sets.filter((s) => s.id !== setId),
        })),
      },
    });
    await SessionsRepo.deleteSet(setId);
  },

  startRest(seconds) {
    set({
      isResting: true,
      restRemaining: seconds,
      restStartedAt: Date.now(),
    });
  },

  skipRest() {
    set({ isResting: false, restRemaining: 0, restStartedAt: null });
  },

  tickRest() {
    const { restStartedAt, restRemaining } = get();
    if (!restStartedAt) return;
    const elapsed = Math.floor((Date.now() - restStartedAt) / 1000);
    const remaining = Math.max(0, restRemaining - elapsed);
    set({
      restRemaining: remaining,
      isResting: remaining > 0,
    });
  },

  async finishWorkout() {
    const { session } = get();
    if (!session) return;
    await SessionsRepo.finish(session.id);
    set({
      session: null,
      isResting: false,
      restRemaining: 0,
      restStartedAt: null,
    });
  },

  async discardWorkout() {
    const { session } = get();
    if (!session) return;
    await SessionsRepo.discard(session.id);
    set({
      session: null,
      isResting: false,
      restRemaining: 0,
      restStartedAt: null,
    });
  },
}));
