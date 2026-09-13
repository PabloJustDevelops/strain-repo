import { create } from 'zustand';
import { getRepos } from '@db';
import { toActiveSessionView, type ActiveSessionView, type SetView } from '@db/shapes';
import { sessionTotals } from '@lib/metrics';
import { supersetRestOwner } from '@lib/supersets';
import { usePreferences } from '@stores/preferencesStore';

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

export const useActiveWorkout = create<ActiveWorkoutState>((set, get) => ({
  session: null,
  isLoading: false,
  restRemaining: 0,
  isResting: false,
  restStartedAt: null,

  async loadActive() {
    set({ isLoading: true });
    const active = await getRepos().sessions.activeSession();
    if (!active) {
      set({ session: null, isLoading: false });
      return;
    }
    const full = await getRepos().sessions.getFullSession(active.id);
    set({ session: full ? toActiveSessionView(full) : null, isLoading: false });
  },

  async startEmpty(name) {
    const session = await getRepos().sessions.start({ name });
    const full = await getRepos().sessions.getFullSession(session.id);
    set({ session: full ? toActiveSessionView(full) : null });
  },

  async startFromRoutine(routineId) {
    const full = await getRepos().routines.getWithExercises(routineId);
    if (!full) return;
    const session = await getRepos().sessions.start({
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
    const detailed = await getRepos().sessions.getFullSession(session.id);
    set({ session: detailed ? toActiveSessionView(detailed) : null });
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
    updated.completedSets = sessionTotals(updated.exercises.flatMap((ex) => ex.sets)).completedSets;
    set({ session: updated });

    await getRepos().sessions.completeSet(setId, weight, reps);

    // El descanso arranca acá y no en la pantalla: este es el único punto que
    // sabe a qué ejercicio pertenece el set, así que cualquier caller de
    // `completeSet` obtiene el descanso correcto sin tener que acordarse.
    //
    // En un superset se descansa al cerrar la ronda, no en cada set: el dueño lo
    // decide la regla, y su `restSeconds` es el que arranca.
    const restOwner = supersetRestOwner(updated.exercises, setId);
    if (restOwner) {
      // Sin plan de rutina no hay descanso objetivo: cae al default del usuario.
      get().startRest(restOwner.restSeconds ?? usePreferences.getState().defaultRestSeconds);
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
    await getRepos().sessions.uncompleteSet(setId);
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
    // `SetView` es un subconjunto de la fila con los mismos nombres, así que el
    // patch cruza la seam tal cual: no hay mapeo inverso que mantener.
    await getRepos().sessions.updateSet(setId, patch);
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
    await getRepos().sessions.setSessionExerciseSuperset(sessionExerciseId, group);
  },

  async addSet(sessionExerciseId) {
    await getRepos().sessions.addSet(sessionExerciseId);
    const { session } = get();
    if (!session) return;
    const full = await getRepos().sessions.getFullSession(session.id);
    set({ session: full ? toActiveSessionView(full) : null });
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
    await getRepos().sessions.deleteSet(setId);
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
    await getRepos().sessions.finish(session.id);

    // Sincronizar con Health Connect (best effort, no bloquea la UX).
    try {
      const { useHealthConnect } = await import('@stores/healthConnectStore');
      const status = useHealthConnect.getState().status;
      if (status === 'ready') {
        const { writeWorkoutSession, estimateCalories } = await import('@/lib/healthConnect');
        const end = new Date();
        const start = session.startedAt ?? new Date(end.getTime() - 60 * 60 * 1000);
        const durationSec = Math.max(60, Math.floor((end.getTime() - start.getTime()) / 1000));
        await writeWorkoutSession({
          title: session.name,
          notes: `${session.completedSets} series completadas`,
          startTime: start,
          endTime: end,
          activeCalories: estimateCalories(session.totalVolume, durationSec),
          totalCalories: estimateCalories(session.totalVolume, durationSec),
        });
      }
    } catch (err) {
      console.warn('[workout] no se pudo sincronizar con Health Connect:', err);
    }

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
    await getRepos().sessions.discard(session.id);
    set({
      session: null,
      isResting: false,
      restRemaining: 0,
      restStartedAt: null,
    });
  },
}));
