import { newId } from './id';

/**
 * Wrapper de Health Connect — versión Lynx.
 *
 * Health Connect es una API nativa de Android; en Lynx requiere un native
 * module propio. Esta seam conserva íntegra la lógica (máquina de estados de
 * disponibilidad, estimación de calorías, forma del resumen diario y del
 * registro de sesión) detrás de `HealthConnectDriver`. Sin driver nativo, todo
 * reporta "no disponible" y las escrituras son no-op que devuelven null.
 */

export interface DailyHealthSummary {
  steps: number;
  activeCalories: number;
  totalCalories: number;
  distanceMeters: number;
  avgHeartRate: number | null;
  restingHeartRate: number | null;
  sleepMinutes: number | null;
  date: string;
}

export interface WorkoutSyncInput {
  title: string;
  notes?: string;
  startTime: Date;
  endTime: Date;
  exerciseType?: number;
  activeCalories?: number;
  totalCalories?: number;
}

/** Estados del SDK (espejo de SdkAvailability de Health Connect). */
export const SdkAvailability = {
  SDK_UNAVAILABLE: 0,
  SDK_UNAVAILABLE_PROVIDER_INSTALL_FINISHED: 1,
  SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED: 2,
  SDK_AVAILABLE: 3,
} as const;

export interface HealthConnectDriver {
  getSdkStatus(): Promise<number>;
  initialize(): Promise<boolean>;
  requestPermissions(): Promise<string[]>;
  readDailySummary(date: Date): Promise<DailyHealthSummary>;
  writeExerciseSession(input: WorkoutSyncInput & { clientRecordId: string }): Promise<string | null>;
}

let driver: HealthConnectDriver | null = null;

export function registerHealthConnectDriver(next: HealthConnectDriver | null): void {
  driver = next;
}

export async function checkAvailability(): Promise<number> {
  if (!driver) return SdkAvailability.SDK_UNAVAILABLE;
  return driver.getSdkStatus();
}

export async function initializeClient(): Promise<boolean> {
  if (!driver) return false;
  return driver.initialize();
}

export async function requestPermissions(): Promise<string[]> {
  if (!driver) return [];
  return driver.requestPermissions();
}

export async function readTodayHealth(date: Date): Promise<DailyHealthSummary> {
  if (!driver) {
    return {
      steps: 0,
      activeCalories: 0,
      totalCalories: 0,
      distanceMeters: 0,
      avgHeartRate: null,
      restingHeartRate: null,
      sleepMinutes: null,
      date: date.toISOString().split('T')[0],
    };
  }
  return driver.readDailySummary(date);
}

/** Escribe una sesión en Health Connect. Devuelve el id creado, o null si falló. */
export async function writeWorkoutSession(input: WorkoutSyncInput): Promise<string | null> {
  if (!driver) return null;
  const clientRecordId = newId();
  return driver.writeExerciseSession({ ...input, clientRecordId });
}

/**
 * Estimación muy simple de calorías activas a partir del volumen.
 * Heurística: 0.05 kcal por kg·reps + 0.04 kcal por segundo de sesión.
 */
export function estimateCalories(volume: number, durationSeconds: number): number {
  return Math.round(volume * 0.05 + durationSeconds * 0.04);
}
