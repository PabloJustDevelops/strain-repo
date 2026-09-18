/**
 * Modelo de datos de Strain — versión Lynx (autocontenida, sin Drizzle).
 *
 * Las interfaces replican 1:1 las filas del esquema SQLite/Drizzle original
 * (`strain-repo/src/db/schema.ts`). Los timestamps usan `Date` porque así lo
 * consumen los repos y la lógica de métricas (Drizzle mode: timestamp).
 * La persistencia vive detrás de la seam `Storage` (ver `storage.ts`).
 */

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  secondaryMuscles: string[];
  equipment: string;
  mechanic: string;
  instructions: string | null;
  isCustom: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Routine {
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  color: string | null;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoutineExercise {
  id: string;
  routineId: string;
  exerciseId: string;
  orderIndex: number;
  targetSets: number;
  targetReps: string; // texto libre: "8-12" o "AMRAP"
  targetWeight: number | null;
  restSeconds: number;
  supersetGroup: string | null;
  notes: string | null;
}

export type SessionStatus = "active" | "completed" | "discarded";

export interface WorkoutSession {
  id: string;
  routineId: string | null;
  name: string;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number | null;
  notes: string | null;
  totalVolume: number;
  totalSets: number;
  status: SessionStatus;
  createdAt: Date;
}

export interface SessionExercise {
  id: string;
  sessionId: string;
  exerciseId: string;
  orderIndex: number;
  supersetGroup: string | null;
  targetSets: number | null;
  targetReps: string | null;
  restSeconds: number | null;
  notes: string | null;
}

export interface Set {
  id: string;
  sessionExerciseId: string;
  setIndex: number;
  setType: string; // warmup | working | failure | dropset
  weight: number;
  reps: number;
  isCompleted: boolean;
  rpe: number | null;
  actualRestSeconds: number | null;
  notes: string | null;
  completedAt: Date | null;
}

export interface PersonalRecord {
  id: string;
  exerciseId: string;
  recordType: string; // one_rm | max_volume | max_reps | max_weight
  value: number;
  reps: number | null;
  weight: number | null;
  setId: string | null;
  achievedAt: Date;
}