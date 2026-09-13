import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Mismo bug de clase que expo-notifications: `react-native-health-connect` lanza
 * al importarse cuando el módulo nativo no está (Expo Go). Los fakes se inyectan
 * por alias en vitest.config, sin mockear módulos con `vi.mock`.
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

async function loadHealthConnect(environment: 'storeClient' | 'bare') {
  vi.resetModules();
  stubGlobal.__EXPO_ENV__ = environment;
  stubGlobal.__NATIVE_THROWS__ = environment === 'storeClient';

  return import('./healthConnect');
}

describe('healthConnect · Expo Go', () => {
  it('no carga el paquete nativo y degrada a no-op sin lanzar', async () => {
    nodeGlobal.__DEV__ = false;
    const hc = await loadHealthConnect('storeClient');

    await expect(hc.checkAvailability()).resolves.toBe(0);
    await expect(hc.initializeClient()).resolves.toBe(false);
    await expect(hc.requestPermissions()).resolves.toEqual([]);
    await expect(hc.getGrantedPermissions()).resolves.toEqual([]);
    await expect(hc.openHealthConnectSettings()).resolves.toBeUndefined();
    await expect(
      hc.writeWorkoutSession({ title: 'Push', startTime: new Date(0), endTime: new Date(1000) })
    ).resolves.toBeNull();

    const summary = await hc.readTodayHealth(new Date(0));
    expect(summary.steps).toBe(0);
    expect(summary.avgHeartRate).toBeNull();
  });
});

describe('healthConnect · development build', () => {
  it('usa el paquete real cuando está disponible', async () => {
    nodeGlobal.__DEV__ = false;
    const hc = await loadHealthConnect('bare');

    await expect(hc.checkAvailability()).resolves.toBe(3);
    await expect(hc.initializeClient()).resolves.toBe(true);
  });
});
