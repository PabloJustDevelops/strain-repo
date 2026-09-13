import { create } from 'zustand';

import {
  checkAvailability,
  initializeClient,
  requestPermissions,
  type DailyHealthSummary,
} from '@/lib/healthConnect';

/**
 * Estado global de la conexión con Health Connect.
 *
 * Status:
 * - unknown: todavía no se ha chequeado.
 * - unavailable: dispositivo sin Health Connect (iOS o Android < 14 sin app).
 * - needsInstall: SDK presente pero la app Health Connect no está instalada.
 * - notAuthorized: SDK listo pero faltan permisos por conceder.
 * - ready: permisos concedidos, podemos leer/escribir.
 */

export type HealthConnectStatus =
  | 'unknown'
  | 'unavailable'
  | 'needsInstall'
  | 'notAuthorized'
  | 'ready';

interface HealthConnectState {
  status: HealthConnectStatus;
  isInitialized: boolean;
  isLoading: boolean;
  lastError: string | null;
  today: DailyHealthSummary | null;
  /** Última vez que se sincronizó today (ms epoch). */
  lastSyncedAt: number | null;

  /** Detecta estado de la plataforma + SDK. */
  probe: () => Promise<HealthConnectStatus>;
  /** Inicializa SDK y pide permisos si hace falta. */
  connect: () => Promise<HealthConnectStatus>;
  /** Revoca los permisos y resetea el estado. */
  disconnect: () => Promise<void>;
  /** Lee el resumen de hoy (cachea 5 min). */
  refreshToday: (force?: boolean) => Promise<DailyHealthSummary | null>;
}

const SdkAvailability = {
  SDK_UNAVAILABLE: 0,
  SDK_UNAVAILABLE_PROVIDER_INSTALL_FINISHED: 1,
  SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED: 2,
  SDK_AVAILABLE: 3,
} as const;

export const useHealthConnect = create<HealthConnectState>((set, get) => ({
  status: 'unknown',
  isInitialized: false,
  isLoading: false,
  lastError: null,
  today: null,
  lastSyncedAt: null,

  async probe() {
    if (get().isLoading) return get().status;
    set({ isLoading: true, lastError: null });

    try {
      const status = await checkAvailability();
      let next: HealthConnectStatus;

      switch (status) {
        case SdkAvailability.SDK_AVAILABLE:
          next = 'needsInstall'; // SDK listo, aún no inicializado
          break;
        case SdkAvailability.SDK_UNAVAILABLE_PROVIDER_INSTALL_FINISHED:
        case SdkAvailability.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED:
          next = 'unavailable';
          break;
        default:
          next = 'unavailable';
      }

      set({ status: next });

      return next;
    } catch (err: any) {
      set({ status: 'unavailable', lastError: String(err) });

      return 'unavailable';
    } finally {
      set({ isLoading: false });
    }
  },

  async connect() {
    if (get().isLoading) return get().status;
    set({ isLoading: true, lastError: null });

    try {
      const ok = await initializeClient();

      if (!ok) {
        set({ status: 'unavailable' });

        return 'unavailable';
      }

      set({ isInitialized: true });

      const granted = await requestPermissions();
      // Si el usuario ha concedido al menos un permiso, podemos leer algo.
      const hasAny = Array.isArray(granted) && granted.length > 0;
      set({ status: hasAny ? 'ready' : 'notAuthorized' });

      return hasAny ? 'ready' : 'notAuthorized';
    } catch (err: any) {
      set({ status: 'unavailable', lastError: String(err) });

      return 'unavailable';
    } finally {
      set({ isLoading: false });
    }
  },

  async disconnect() {
    // No hay revoke client-side; lo hacemos abriendo la app de Health Connect.
    set({ status: 'notAuthorized', isInitialized: false, today: null, lastSyncedAt: null });
  },

  async refreshToday(force = false) {
    const { lastSyncedAt, status } = get();

    if (!force && lastSyncedAt && Date.now() - lastSyncedAt < 5 * 60 * 1000) {
      return get().today;
    }

    if (status !== 'ready') return null;

    try {
      const { readTodayHealth } = await import('@/lib/healthConnect');
      const summary = await readTodayHealth(new Date());
      set({ today: summary, lastSyncedAt: Date.now() });

      return summary;
    } catch (err: any) {
      set({ lastError: String(err) });

      return null;
    }
  },
}));