/**
 * Vocabulario del dominio Strain: enums y etiquetas. Version Lynx autocontenida.
 */

export type {
  Exercise,
  Routine,
  RoutineExercise,
  WorkoutSession,
  SessionExercise,
  Set as DbSet,
  PersonalRecord,
} from "@db/schema";

export type MuscleGroup =
  | "chest"
  | "back"
  | "legs"
  | "shoulders"
  | "arms"
  | "core"
  | "cardio"
  | "other";

export type Equipment =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "bodyweight"
  | "kettlebell"
  | "other";

export type Mechanic = "compound" | "isolation";

export type SetType = "warmup" | "working" | "failure" | "dropset";

export type Units = "kg" | "lb";

export type ThemeMode = "light" | "dark" | "system";

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: "Pecho",
  back: "Espalda",
  legs: "Piernas",
  shoulders: "Hombros",
  arms: "Brazos",
  core: "Core",
  cardio: "Cardio",
  other: "Otro",
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: "Barra",
  dumbbell: "Mancuerna",
  machine: "Máquina",
  cable: "Polea",
  bodyweight: "Peso corporal",
  kettlebell: "Kettlebell",
  other: "Otro",
};