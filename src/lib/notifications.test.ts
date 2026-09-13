import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Expo Go no incluye expo-notifications desde el SDK 53: importarlo lanza. Este
 * test simula ese entorno con los fakes inyectados por alias en vitest.config
 * (no se mockean módulos con `vi.mock`).
 */

// SAFETY: `__DEV__` es un global de React Native que los tipos de Node no declaran.
const nodeGlobal = globalThis as { __DEV__?: boolean };

// SAFETY: flags que leen los fakes de test inyectados por alias.
const stubGlobal = globalThis as {
  __EXPO_ENV__?: 'storeClient' | 'bare';
  __NATIVE_THROWS__?: boolean;
};

const originalDev = nodeGlobal.__DEV__;

afterEach(() => {
  nodeGlobal.__DEV__ = originalDev;
  stubGlobal.__EXPO_ENV__ = undefined;
  stubGlobal.__NATIVE_THROWS__ = undefined;
  vi.resetModules();
  vi.restoreAllMocks();
});

/** Carga `notifications` con el entorno simulado. */
async function loadNotifications(environment: 'storeClient' | 'bare') {
  vi.resetModules();
  stubGlobal.__EXPO_ENV__ = environment;
  stubGlobal.__NATIVE_THROWS__ = environment === 'storeClient';

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
    nodeGlobal.__DEV__ = false;
    const mod = await loadNotifications('storeClient');

    await expect(mod.initNotifications()).resolves.toBe(false);
    await expect(mod.requestNotificationPermission()).resolves.toBe(false);
    await expect(mod.cancelAllReminders()).resolves.toBeUndefined();
    await expect(mod.scheduleReminders(reminder)).resolves.toBeUndefined();
  });

  it('deja un aviso en desarrollo una sola vez', async () => {
    nodeGlobal.__DEV__ = true;
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
    nodeGlobal.__DEV__ = false;
    const mod = await loadNotifications('bare');

    await expect(mod.initNotifications()).resolves.toBe(true);
  });
});
