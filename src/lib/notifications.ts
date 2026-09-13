import { Platform } from 'react-native';
import { shortId } from './id';
import type { WeeklyTriggerInput } from 'expo-notifications';

import { usePreferences } from '@stores/preferencesStore';
import { isExpoGo } from './environment';

/**
 * Servicio de notificaciones push.
 *
 * Strain solo soporta Android y Web (sin iOS), así que el flujo es:
 * 1. Pedir permisos en Android (POST_NOTIFICATIONS desde SDK 33).
 * 2. Configurar el canal por defecto con importancia alta.
 * 3. Programar recordatorios diarios/semanales.
 *
 * Expo Go no incluye `expo-notifications` desde el SDK 53 y **el módulo lanza
 * al importarse**. Por eso se carga de forma perezosa dentro de la guarda
 * (`isExpoGo`): en Expo Go el import ni se evalúa y todas las funciones son
 * no-ops seguros, para que una feature opcional no tumbe el arranque. En un
 * development build o en la app compilada el comportamiento es el de siempre.
 */

type NotificationsModule = typeof import('expo-notifications');

// Días de la semana para recordatorios (1=Domingo, 7=Sábado según expo-notifications)
type WeekdayNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;
function clampWeekday(day: number): WeekdayNumber {
  // Acepta 0-6 (estilo JS) o 1-7 (estilo expo) y normaliza a 1-7
  if (day === 0) return 7;
  return Math.max(1, Math.min(7, day)) as WeekdayNumber;
}

let notifications: NotificationsModule | null = null;
let loadFailed = false;
let warnedUnavailable = false;
let initialized = false;
let channelReady = false;

/** Avisa una sola vez, y solo en desarrollo, de que no hay notificaciones. */
function warnUnavailableOnce(): void {
  if (warnedUnavailable) return;
  warnedUnavailable = true;
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn(
      '[notifications] No disponibles en Expo Go: expo-notifications se retiró del cliente en el SDK 53. Probá en un development build.'
    );
  }
}

/**
 * Carga `expo-notifications` solo cuando hace falta. En Expo Go no se evalúa
 * siquiera; si el import falla por otro motivo, tampoco lanza hacia afuera.
 */
async function getNotifications(): Promise<NotificationsModule | null> {
  if (isExpoGo()) {
    warnUnavailableOnce();
    return null;
  }
  if (notifications) return notifications;
  if (loadFailed) return null;

  try {
    notifications = await import('expo-notifications');
  } catch (err) {
    loadFailed = true;
    console.warn('[notifications] No se pudo cargar expo-notifications', err);
    return null;
  }
  return notifications;
}

export interface ReminderConfig {
  enabled: boolean;
  hour: number;
  minute: number;
  daysOfWeek: number[];
  message: string;
}

const DEFAULT_REMINDER: ReminderConfig = {
  enabled: false,
  hour: 18,
  minute: 30,
  daysOfWeek: [1, 3, 5],
  message: 'Hora de entrenar. ¡A por ello!',
};

/**
 * Inicializa el módulo: pide permisos y crea el canal Android.
 * Llamar una sola vez al arrancar la app.
 */
export async function initNotifications(): Promise<boolean> {
  if (initialized) return true;

  const N = await getNotifications();
  if (!N) return false;

  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === 'android' && !channelReady) {
    await N.setNotificationChannelAsync('strain-reminders', {
      name: 'Recordatorios de entrenamiento',
      importance: N.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3b82f6',
      sound: 'default',
    });
    channelReady = true;
  }

  initialized = true;
  return true;
}

/**
 * Pide permiso al usuario. Devuelve true si lo concede.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const N = await getNotifications();
  if (!N) return false;

  const { status } = await N.getPermissionsAsync();
  if (status === 'granted') return true;
  const { status: newStatus } = await N.requestPermissionsAsync({
    ios: {},
  });
  return newStatus === 'granted';
}

/**
 * Cancela todos los recordatorios programados.
 */
export async function cancelAllReminders(): Promise<void> {
  const N = await getNotifications();
  if (!N) return;
  await N.cancelAllScheduledNotificationsAsync();
}

/**
 * Programa los recordatorios según la configuración.
 * Si enabled=false, cancela todo.
 */
export async function scheduleReminders(config: ReminderConfig): Promise<void> {
  await cancelAllReminders();
  if (!config.enabled) return;

  const N = await getNotifications();
  if (!N) return;

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  const days = config.daysOfWeek.length === 0 ? [0, 1, 2, 3, 4, 5, 6] : config.daysOfWeek;

  for (const day of days) {
    const trigger: WeeklyTriggerInput = {
      type: N.SchedulableTriggerInputTypes.WEEKLY,
      weekday: clampWeekday(day),
      hour: config.hour,
      minute: config.minute,
    };

    await N.scheduleNotificationAsync({
      identifier: `reminder-${day}-${shortId(6)}`,
      content: {
        title: 'Strain',
        body: config.message,
        sound: 'default',
        ...(Platform.OS === 'android' && { channelId: 'strain-reminders' }),
      },
      trigger,
    });
  }
}

export const DEFAULT_REMINDER_CONFIG = DEFAULT_REMINDER;

export function getReminderConfig(): ReminderConfig {
  const prefs = usePreferences.getState();
  return prefs.reminder ?? DEFAULT_REMINDER;
}

export function setReminderConfig(config: ReminderConfig) {
  usePreferences.getState().setReminder(config);
}
