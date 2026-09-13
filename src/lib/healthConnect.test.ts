import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Mismo bug de clase que expo-notifications: `react-native-health-connect` lanza
 * al importarse cuando el módulo nativo no está (Expo Go). El test simula Expo Go
 * y exige que el wrapper no lo cargue y degrade a no-op.
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

async function loadHealthConnect(environment: 'storeClient' | 'bare') {
  vi.resetModules();
  vi.doMock('expo-constants', () => ({
    default: {
      executionEnvironment: environment,
      appOwnership: environment === 'storeClient' ? 'expo' : 'standalone',
    },
  }));

  if (environment === 'storeClient') {
    vi.doMock('react-native-health-connect', () => {
      throw new Error('react-native-health-connect no debe cargarse en Expo Go');
    });
  } else {
    vi.doMock('react-native-health-connect', () => ({
      getSdkStatus: vi.fn(async () => 3),
      initialize: vi.fn(async () => true),
      requestPermission: vi.fn(async () => []),
      getGrantedPermissions: vi.fn(async () => []),
      openHealthConnectSettings: vi.fn(),
      readRecords: vi.fn(async () => ({ records: [] })),
      insertRecords: vi.fn(async () => ['id']),
      ExerciseType: { WEIGHTLIFTING: 81 },
    }));
  }

  return import('./healthConnect');
}

describe('healthConnect · Expo Go', () => {
  it('no carga el paquete nativo y degrada a no-op sin lanzar', async () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
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
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    const hc = await loadHealthConnect('bare');

    await expect(hc.checkAvailability()).resolves.toBe(3);
    await expect(hc.initializeClient()).resolves.toBe(true);
  });
});
