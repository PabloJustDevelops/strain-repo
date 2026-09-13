/**
 * Vocabulario del dominio Strain: los enums y sus etiquetas para el usuario.
 *
 * Las **formas** que ve la UI (rows y DTOs) viven en `@db/shapes`, junto al mapeo
 * que las produce. Acá sólo queda el lenguaje: qué músculos, equipos y tipos de
 * set existen, y cómo se llaman en español.
 */

// Re-exports: las filas crudas de BD vienen de `@db/schema`, pero para que la UI
// no tenga que importar de dos sitios, las exponemos desde aquí también.
export type { Exercise, Routine, RoutineExercise, WorkoutSession, SessionExercise, Set as DbSet, PersonalRecord } from '@db/schema';

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
