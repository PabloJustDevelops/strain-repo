import { create } from 'zustand';

import {
  SdkAvailability,
  checkAvailability,
  initializeClient,
  readTodayHealth,
  requestPermissions,
  type DailyHealthSummary,
} from '@/lib/healthConnect';

/**
 * Estado global de la conexión con Health Connect (mismo contrato que en la app anterior).
 * Status: unknown | unavailable | needsInstall | notAuthorized | ready.
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
  lastSyncedAt: number | null;

  probe: () => Promise<HealthConnectStatus>;
  connect: () => Promise<HealthConnectStatus>;
  disconnect: () => Promise<void>;
  refreshToday: (force?: boolean) => Promise<DailyHealthSummary | null>;
}

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
      const next: HealthConnectStatus =
        status === SdkAvailability.SDK_AVAILABLE ? 'needsInstall' : 'unavailable';
      set({ status: next });
      return next;
    } catch (err) {
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
      const hasAny = Array.isArray(granted) && granted.length > 0;
      set({ status: hasAny ? 'ready' : 'notAuthorized' });
      return hasAny ? 'ready' : 'notAuthorized';
    } catch (err) {
      set({ status: 'unavailable', lastError: String(err) });
      return 'unavailable';
    } finally {
      set({ isLoading: false });
    }
  },

  async disconnect() {
    set({ status: 'notAuthorized', isInitialized: false, today: null, lastSyncedAt: null });
  },

  async refreshToday(force = false) {
    const { lastSyncedAt, status } = get();
    if (!force && lastSyncedAt && Date.now() - lastSyncedAt < 5 * 60 * 1000) {
      return get().today;
    }
    if (status !== 'ready') return null;
    try {
      const summary = await readTodayHealth(new Date());
      set({ today: summary, lastSyncedAt: Date.now() });
      return summary;
    } catch (err) {
      set({ lastError: String(err) });
      return null;
    }
  },
}));
