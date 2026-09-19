import { create } from 'zustand';
import { getRepos } from '@db';
import { toActiveSessionView, type ActiveSessionView, type SetView } from '@db/shapes';
import { sessionTotals } from '@lib/metrics';
import { restEndsAt, restRemainingSeconds } from '@lib/rest';
import { buildWorkoutSummary, type WorkoutSummary } from '@lib/sessionSummary';
import { supersetRestOwner } from '@lib/supersets';
import { usePreferences } from '@stores/preferencesStore';

/**
 * Estado del workout en curso.
 *
 * - Se hidrata desde SQLite al abrir /workout/active.
 * - Optimistic updates: marca sets como completados localmente y sincroniza
 *   con la BD en background para que la UI sea instantÃ¡nea.
 * - Mantiene tambiÃ©n el timer global y el de descanso entre sets.
 */

interface ActiveWorkoutState {
  session: ActiveSessionView | null;
  isLoading: boolean;
  restRemaining: number;          // segundos restantes del descanso actual
  isResting: boolean;
  restEndsAt: number | null;      // instante (ms) en que termina el descanso
  /** Resumen de la última sesión cerrada. La pantalla de cierre no puede leer
   * `session` porque al finalizar se limpia, así que el store lo conserva acá. */
  lastFinished: WorkoutSummary | null;

  // Acciones
  loadActive: () => Promise<void>;
  startEmpty: (name: string) => Promise<void>;
  startFromRoutine: (routineId: string) => Promise<void>;
  addExercise: (exerciseId: string) => Promise<void>;
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
  restEndsAt: null,
  lastFinished: null,

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

  async addExercise(exerciseId) {
    const { session } = get();

    if (!session) return;
    // Un ejercicio reciÃ©n agregado arranca con una serie para poder registrar
    // enseguida; si no, quedarÃ­a visible pero sin forma de anotar nada.
    const row = await getRepos().sessions.addSessionExercise(session.id, exerciseId);
    await getRepos().sessions.addSet(row.id);
    const full = await getRepos().sessions.getFullSession(session.id);
    set({ session: full ? toActiveSessionView(full) : null });
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

    // El descanso arranca acÃ¡ y no en la pantalla: este es el Ãºnico punto que
    // sabe a quÃ© ejercicio pertenece el set, asÃ­ que cualquier caller de
    // `completeSet` obtiene el descanso correcto sin tener que acordarse.
    //
    // En un superset se descansa al cerrar la ronda, no en cada set: el dueÃ±o lo
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
    // `SetView` es un subconjunto de la fila con los mismos nombres, asÃ­ que el
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
    const safe = Math.max(0, seconds);

    set({
      isResting: safe > 0,
      restRemaining: safe,
      restEndsAt: restEndsAt(safe, Date.now()),
    });
  },

  skipRest() {
    set({ isResting: false, restRemaining: 0, restEndsAt: null });
  },

  tickRest() {
    const { restEndsAt: endsAt } = get();

    if (endsAt === null) return;
    const remaining = restRemainingSeconds(endsAt, Date.now());
    set({
      restRemaining: remaining,
      isResting: remaining > 0,
    });
  },

  async finishWorkout() {
    const { session } = get();

    if (!session) return;
    const endedAt = new Date();
    await getRepos().sessions.finish(session.id, { endedAt });

    // Los PRs los escribe `finish()`, así que recién ahora reflejan esta sesión.
    // El resumen se arma antes de limpiar `session`: la pantalla de cierre lee
    // `lastFinished`, no la sesión activa.
    const records = await getRepos().analytics.personalRecords();
    const summary = buildWorkoutSummary(session, endedAt, records);

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
      lastFinished: summary,
      session: null,
      isResting: false,
      restRemaining: 0,
      restEndsAt: null,
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
      restEndsAt: null,
    });
  },
}));

