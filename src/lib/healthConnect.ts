import { Platform } from 'react-native';
import * as HealthConnect from 'react-native-health-connect';
import { nanoid } from 'nanoid';

/**
 * Wrapper sobre `react-native-health-connect` con la API que Strain necesita.
 *
 * Funciones:
 * - checkAvailability():           ¿Está el SDK y la app Health Connect instalada?
 * - initializeClient():            Inicializa el SDK.
 * - requestPermissions():          Pide al usuario los permisos definidos.
 * - getGrantedPermissions():       Devuelve los que ya concedió.
 * - openHealthConnectSettings():   Abre la app de Health Connect.
 * - readTodayHealth():             Resumen diario (pasos, FC, calorías).
 * - writeWorkoutSession():         Escribe un ExerciseSessionRecord al terminar.
 *
 * Solo Android. En iOS devuelve siempre null o false con un aviso en consola.
 */

const PROVIDER_PACKAGE = 'com.google.android.apps.healthdata';

type HealthPermission = HealthConnect.Permission | HealthConnect.WriteExerciseRoutePermission | HealthConnect.BackgroundAccessPermission | HealthConnect.ReadHealthDataHistoryPermission;

const PERMISSIONS: HealthPermission[] = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'RestingHeartRate' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'TotalCaloriesBurned' },
  { accessType: 'read', recordType: 'Distance' },
  { accessType: 'read', recordType: 'SleepSession' },
  { accessType: 'read', recordType: 'Weight' },
  { accessType: 'write', recordType: 'ExerciseSession' },
  { accessType: 'write', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'write', recordType: 'TotalCaloriesBurned' },
];

/** ¿Está disponible Health Connect en este dispositivo? */
export async function checkAvailability(): Promise<number> {
  if (Platform.OS !== 'android') return 0;
  return HealthConnect.getSdkStatus(PROVIDER_PACKAGE);
}

/** Inicializa el SDK. Devuelve true si OK. */
export async function initializeClient(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  return HealthConnect.initialize(PROVIDER_PACKAGE);
}

/** Pide permisos al usuario. Devuelve los que concedió. */
export async function requestPermissions(): Promise<readonly HealthPermission[]> {
  if (Platform.OS !== 'android') return [];
  return HealthConnect.requestPermission([...PERMISSIONS]);
}

/** Devuelve los permisos ya concedidos. */
export async function getGrantedPermissions(): Promise<readonly HealthPermission[]> {
  if (Platform.OS !== 'android') return [];
  return HealthConnect.getGrantedPermissions();
}

/** Abre la app de Health Connect para que el usuario gestione los permisos. */
export function openHealthConnectSettings(): void {
  if (Platform.OS !== 'android') return;
  HealthConnect.openHealthConnectSettings();
}

// ============== LECTURA ==============

/** Resumen diario: pasos, calorías activas, distancia, FC media. */
export interface DailyHealthSummary {
  steps: number;
  activeCalories: number;
  totalCalories: number;
  distanceMeters: number;
  avgHeartRate: number | null;
  restingHeartRate: number | null;
  sleepMinutes: number | null;
  date: Date;
}

const startOfDay = (d: Date): string => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
};
const endOfDay = (d: Date): string => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.toISOString();
};

/**
 * Lee el resumen de salud del día actual.
 * Si una métrica no tiene permisos concedidos, devuelve 0 (no lanza).
 */
export async function readTodayHealth(date: Date = new Date()): Promise<DailyHealthSummary> {
  const empty: DailyHealthSummary = {
    steps: 0,
    activeCalories: 0,
    totalCalories: 0,
    distanceMeters: 0,
    avgHeartRate: null,
    restingHeartRate: null,
    sleepMinutes: null,
    date,
  };

  if (Platform.OS !== 'android') return empty;

  const timeFilter = {
    operator: 'between' as const,
    startTime: startOfDay(date),
    endTime: endOfDay(date),
  };

  const safe = async (fn: () => Promise<any>): Promise<any> => {
    try {
      return await fn();
    } catch (err) {
      console.warn('[health] read failed', err);
      return null;
    }
  };

  const [steps, activeCal, totalCal, distance, hr, sleep] = await Promise.all([
    safe(() => HealthConnect.readRecords('Steps', { timeRangeFilter: timeFilter })),
    safe(() => HealthConnect.readRecords('ActiveCaloriesBurned', { timeRangeFilter: timeFilter })),
    safe(() => HealthConnect.readRecords('TotalCaloriesBurned', { timeRangeFilter: timeFilter })),
    safe(() => HealthConnect.readRecords('Distance', { timeRangeFilter: timeFilter })),
    safe(() => HealthConnect.readRecords('HeartRate', { timeRangeFilter: timeFilter })),
    safe(() => HealthConnect.readRecords('SleepSession', { timeRangeFilter: timeFilter })),
  ]);

  let sumHr = 0;
  let nHr = 0;
  (hr?.records ?? []).forEach((r: any) =>
    (r.samples ?? []).forEach((s: any) => {
      sumHr += s.beatsPerMinute;
      nHr++;
    })
  );
  const avgHr = nHr > 0 ? Math.round(sumHr / nHr) : null;

  let restHr: number | null = null;
  try {
    const rest = await HealthConnect.readRecords('RestingHeartRate', { timeRangeFilter: timeFilter });
    const records = (rest as any).records ?? [];
    if (records.length > 0) {
      restHr = records[records.length - 1].beatsPerMinute;
    }
  } catch {}

  let sleepMin: number | null = null;
  if (sleep && sleep.records && sleep.records.length > 0) {
    const totalMs = sleep.records.reduce(
      (acc: number, r: any) => acc + (new Date(r.endTime).getTime() - new Date(r.startTime).getTime()),
      0
    );
    sleepMin = Math.round(totalMs / 60000);
  }

  return {
    steps: (steps?.records ?? []).reduce((acc: number, r: any) => acc + (r.count ?? 0), 0),
    activeCalories: (activeCal?.records ?? []).reduce((acc: number, r: any) => acc + (r.energy?.inKilocalories ?? 0), 0),
    totalCalories: (totalCal?.records ?? []).reduce((acc: number, r: any) => acc + (r.energy?.inKilocalories ?? 0), 0),
    distanceMeters: (distance?.records ?? []).reduce((acc: number, r: any) => acc + (r.distance?.inMeters ?? 0), 0),
    avgHeartRate: avgHr,
    restingHeartRate: restHr,
    sleepMinutes: sleepMin,
    date,
  };
}

// ============== ESCRITURA ==============

export interface WorkoutSyncInput {
  /** Nombre de la sesión (ej. "Push Day"). */
  title: string;
  /** Notas opcionales que se guardan como description. */
  notes?: string;
  /** Inicio y fin del workout. */
  startTime: Date;
  endTime: Date;
  /** Tipo de ejercicio para Health Connect (resistance training por defecto). */
  exerciseType?: number;
  /** Calorías activas estimadas (kcal). */
  activeCalories?: number;
  /** Energía total quemada estimada (kcal). */
  totalCalories?: number;
}

/**
 * Escribe una sesión de entrenamiento a Health Connect.
 * Devuelve el id del ExerciseSessionRecord creado, o null si falló.
 */
export async function writeWorkoutSession(input: WorkoutSyncInput): Promise<string | null> {
  if (Platform.OS !== 'android') return null;

  const id = nanoid();
  const exerciseType = input.exerciseType ?? HealthConnect.ExerciseType.WEIGHTLIFTING;

  const records: any[] = [
    {
      recordType: 'ExerciseSession',
      metadata: { clientRecordId: id },
      startTime: input.startTime.toISOString(),
      endTime: input.endTime.toISOString(),
      exerciseType,
      title: input.title,
      notes: input.notes,
    },
  ];

  if (input.activeCalories && input.activeCalories > 0) {
    records.push({
      recordType: 'ActiveCaloriesBurned',
      metadata: { clientRecordId: `${id}-cal-active` },
      startTime: input.startTime.toISOString(),
      endTime: input.endTime.toISOString(),
      energy: { inKilocalories: input.activeCalories },
    });
  }

  if (input.totalCalories && input.totalCalories > 0) {
    records.push({
      recordType: 'TotalCaloriesBurned',
      metadata: { clientRecordId: `${id}-cal-total` },
      startTime: input.startTime.toISOString(),
      endTime: input.endTime.toISOString(),
      energy: { inKilocalories: input.totalCalories },
    });
  }

  try {
    const ids = await HealthConnect.insertRecords(records);
    return ids[0] ?? id;
  } catch (err) {
    console.warn('[health] writeWorkoutSession failed', err);
    return null;
  }
}

/**
 * Estimación muy simple de calorías activas a partir del volumen.
 * Heurística: 0.05 kcal por kg·reps + 0.04 kcal por segundo de sesión.
 * Es lo bastante buena para reflejar esfuerzo relativo, no para medicina.
 */
export function estimateCalories(volume: number, durationSeconds: number): number {
  return Math.round(volume * 0.05 + durationSeconds * 0.04);
}