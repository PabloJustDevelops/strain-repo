/**
 * Stub de `expo-notifications` para Vitest.
 *
 * Si `globalThis.__NATIVE_THROWS__` está activo, lanza al evaluarse: así el test
 * comprueba que el código no lo importa en Expo Go.
 */
// SAFETY: flag de test que Node no declara.
const g = globalThis as { __NATIVE_THROWS__?: boolean };

if (g.__NATIVE_THROWS__) throw new Error('expo-notifications no debe cargarse en Expo Go');

export const setNotificationHandler = () => {};

export const setNotificationChannelAsync = async () => null;

export const getPermissionsAsync = async () => ({ status: 'granted' });

export const requestPermissionsAsync = async () => ({ status: 'granted' });

export const cancelAllScheduledNotificationsAsync = async () => {};

export const scheduleNotificationAsync = async () => 'id';

export const AndroidImportance = { HIGH: 4 };

export const SchedulableTriggerInputTypes = { WEEKLY: 'weekly' };
