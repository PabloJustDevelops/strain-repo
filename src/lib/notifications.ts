import { shortId } from './id';

/**
 * Servicio de notificaciones — versión Lynx.
 *
 * Lynx no trae un módulo de notificaciones: hay que exponer uno nativo
 * (Kotlin/Swift) vía `lynx.getJSModule(...)`. Esta seam encapsula ese acceso
 * detrás de `NotificationDriver`, así que la lógica (config de recordatorios,
 * normalización de días, programación semanal) se conserva intacta y el driver
 * nativo se enchufa en un solo sitio (`getDriver`).
 *
 * Sin driver nativo registrado, todo es un no-op seguro que devuelve
 * "no disponible", igual que el guard de Expo Go en la app original.
 */

export interface ReminderConfig {
  enabled: boolean;
  hour: number;
  minute: number;
  daysOfWeek: number[];
  message: string;
}

export const DEFAULT_REMINDER_CONFIG: ReminderConfig = {
  enabled: false,
  hour: 18,
  minute: 30,
  daysOfWeek: [1, 3, 5],
  message: 'Hora de entrenar. ¡A por ello!',
};

/** Días de la semana normalizados a 1..7 (1=Domingo ... 7=Sábado). */
function clampWeekday(day: number): number {
  if (day === 0) return 7;
  return Math.max(1, Math.min(7, day));
}

/** Lo mínimo que un native module de notificaciones debe exponer. */
export interface NotificationDriver {
  requestPermission(): Promise<boolean>;
  cancelAll(): Promise<void>;
  scheduleWeekly(input: {
    identifier: string;
    title: string;
    body: string;
    weekday: number;
    hour: number;
    minute: number;
  }): Promise<void>;
}

let driver: NotificationDriver | null = null;

/** Registra el driver nativo (lo llamará el bootstrap cuando exista). */
export function registerNotificationDriver(next: NotificationDriver | null): void {
  driver = next;
}

function getDriver(): NotificationDriver | null {
  return driver;
}

export async function initNotifications(): Promise<boolean> {
  return getDriver() !== null;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const d = getDriver();
  if (!d) return false;
  return d.requestPermission();
}

export async function cancelAllReminders(): Promise<void> {
  const d = getDriver();
  if (!d) return;
  await d.cancelAll();
}

/** Programa los recordatorios según la configuración. Si enabled=false, cancela. */
export async function scheduleReminders(config: ReminderConfig): Promise<void> {
  await cancelAllReminders();
  if (!config.enabled) return;

  const d = getDriver();
  if (!d) return;

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  const days = config.daysOfWeek.length === 0 ? [0, 1, 2, 3, 4, 5, 6] : config.daysOfWeek;
  for (const day of days) {
    await d.scheduleWeekly({
      identifier: `reminder-${day}-${shortId(6)}`,
      title: 'Strain',
      body: config.message,
      weekday: clampWeekday(day),
      hour: config.hour,
      minute: config.minute,
    });
  }
}
