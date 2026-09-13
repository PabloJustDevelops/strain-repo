import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Expo Go no incluye expo-notifications desde el SDK 53: importarlo lanza. Este
 * test simula ese entorno y exige que el módulo de notificaciones no lo cargue,
 * no lance y exponga no-ops. Antes fallaba porque el import era estático.
 */

vi.mock('react-native', () => ({
  Platform: {
    OS: 'android',
    select: (options: { default?: unknown; android?: unknown }) => options.default ?? options.android,
  },
}));

const originalDev = (globalThis as { __DEV__?: boolean }).__DEV__;

afterEach(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = originalDev;
  vi.resetModules();
  vi.restoreAllMocks();
});

/** Carga `notifications` con el entorno simulado. */
async function loadNotifications(environment: 'storeClient' | 'bare') {
  vi.resetModules();
  vi.doMock('expo-constants', () => ({
    default: {
      executionEnvironment: environment,
      appOwnership: environment === 'storeClient' ? 'expo' : 'standalone',
    },
  }));

  if (environment === 'storeClient') {
    // Si el código intenta cargarlo, revienta: es el bug que estamos cubriendo.
    vi.doMock('expo-notifications', () => {
      throw new Error('expo-notifications no debe cargarse en Expo Go');
    });
  } else {
    vi.doMock('expo-notifications', () => ({
      setNotificationHandler: vi.fn(),
      setNotificationChannelAsync: vi.fn(async () => null),
      getPermissionsAsync: vi.fn(async () => ({ status: 'granted' })),
      requestPermissionsAsync: vi.fn(async () => ({ status: 'granted' })),
      cancelAllScheduledNotificationsAsync: vi.fn(async () => {}),
      scheduleNotificationAsync: vi.fn(async () => 'id'),
      AndroidImportance: { HIGH: 4 },
      SchedulableTriggerInputTypes: { WEEKLY: 'weekly' },
    }));
  }

  return import('./notifications');
}

const reminder = {
  enabled: true,
  hour: 18,
  minute: 30,
  daysOfWeek: [1],
  message: 'Hora de entrenar',
};

describe('notifications · Expo Go', () => {
  it('no carga expo-notifications y expone no-ops que no lanzan', async () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    const mod = await loadNotifications('storeClient');

    await expect(mod.initNotifications()).resolves.toBe(false);
    await expect(mod.requestNotificationPermission()).resolves.toBe(false);
    await expect(mod.cancelAllReminders()).resolves.toBeUndefined();
    await expect(mod.scheduleReminders(reminder)).resolves.toBeUndefined();
  });

  it('deja un aviso en desarrollo una sola vez', async () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    // Es console.log a propósito: console.warn abre el overlay de LogBox, que
    // en Expo Go se dibuja encima de la barra de pestañas y bloquea el toque.
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const mod = await loadNotifications('storeClient');

    await mod.initNotifications();
    await mod.initNotifications();

    expect(log).toHaveBeenCalledTimes(1);
  });
});

describe('notifications · development build', () => {
  it('carga el módulo y sigue inicializando de verdad', async () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    const mod = await loadNotifications('bare');

    await expect(mod.initNotifications()).resolves.toBe(true);
  });
});
