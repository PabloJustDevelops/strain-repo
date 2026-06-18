import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { nanoid } from 'nanoid';

import { usePreferences } from '@stores/preferencesStore';

/**
 * Servicio de notificaciones push.
 *
 * Strain solo soporta Android y Web (sin iOS), así que el flujo es:
 * 1. Pedir permisos en Android (POST_NOTIFICATIONS desde SDK 33).
 * 2. Configurar el canal por defecto con importancia alta.
 * 3. Programar recordatorios diarios/semanales.
 */

// Días de la semana para recordatorios (1=Domingo, 7=Sábado según expo-notifications)
type WeekdayNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;
function clampWeekday(day: number): WeekdayNumber {
  // Acepta 0-6 (estilo JS) o 1-7 (estilo expo) y normaliza a 1-7
  if (day === 0) return 7;
  return Math.max(1, Math.min(7, day)) as WeekdayNumber;
}

let initialized = false;
let channelReady = false;

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
  initialized = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === 'android' && !channelReady) {
    await Notifications.setNotificationChannelAsync('strain-reminders', {
      name: 'Recordatorios de entrenamiento',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3b82f6',
      sound: 'default',
    });
    channelReady = true;
  }

  return true;
}

/**
 * Pide permiso al usuario. Devuelve true si lo concede.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  const { status: newStatus } = await Notifications.requestPermissionsAsync({
    ios: {},
  });
  return newStatus === 'granted';
}

/**
 * Cancela todos los recordatorios programados.
 */
export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Programa los recordatorios según la configuración.
 * Si enabled=false, cancela todo.
 */
export async function scheduleReminders(config: ReminderConfig): Promise<void> {
  await cancelAllReminders();
  if (!config.enabled) return;

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  const days = config.daysOfWeek.length === 0 ? [0, 1, 2, 3, 4, 5, 6] : config.daysOfWeek;

  for (const day of days) {
    const trigger: Notifications.WeeklyTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: clampWeekday(day),
      hour: config.hour,
      minute: config.minute,
    };

    await Notifications.scheduleNotificationAsync({
      identifier: `reminder-${day}-${nanoid(6)}`,
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