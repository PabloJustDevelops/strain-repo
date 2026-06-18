/**
 * Tipos compartidos del dominio Strain.
 * Estos tipos se usan en UI, stores, repos y serialización.
 * Los tipos de filas crudas de BD viven en `@db/schema`.
 */

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'cardio'
  | 'other';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'kettlebell'
  | 'other';

export type Mechanic = 'compound' | 'isolation';

export type SetType = 'warmup' | 'working' | 'failure' | 'dropset';

export type Units = 'kg' | 'lb';

export type ThemeMode = 'light' | 'dark' | 'system';

/** Etiqueta visual para mostrar al usuario final. */
export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Pecho',
  back: 'Espalda',
  legs: 'Piernas',
  shoulders: 'Hombros',
  arms: 'Brazos',
  core: 'Core',
  cardio: 'Cardio',
  other: 'Otro',
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Barra',
  dumbbell: 'Mancuerna',
  machine: 'Máquina',
  cable: 'Polea',
  bodyweight: 'Peso corporal',
  kettlebell: 'Kettlebell',
  other: 'Otro',
};

// ============================================================
// Vistas (DTOs para UI)
// ============================================================

/** Ejercicio con metadatos para mostrar en listas y tarjetas. */
export interface ExerciseView {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  secondaryMuscles: string[];
  equipment: Equipment;
  mechanic: Mechanic;
  isCustom: boolean;
}

/** Set que se muestra en el modo de workout activo. */
export interface SetView {
  id: string;
  setIndex: number;
  type: SetType;
  weight: number;
  reps: number;
  isCompleted: boolean;
  rpe?: number | null;
  previousWeight?: number | null;   // peso de la última vez que se hizo
  previousReps?: number | null;
}

/** Ejercicio dentro de una sesión activa. */
export interface SessionExerciseView {
  id: string;                        // session_exercise.id
  exerciseId: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  orderIndex: number;
  sets: SetView[];
  targetSets: number;
  targetReps: string;
  restSeconds: number;
  notes?: string | null;
}

/** Sesión activa completa para la UI. */
export interface ActiveSessionView {
  id: string;
  name: string;
  startedAt: Date;
  elapsedSeconds: number;
  exercises: SessionExerciseView[];
  totalVolume: number;
  totalSets: number;
  completedSets: number;
}

/** Historial — fila resumida para listas. */
export interface SessionSummary {
  id: string;
  name: string;
  startedAt: Date;
  durationSeconds: number;
  totalVolume: number;
  totalSets: number;
  exerciseCount: number;
}
