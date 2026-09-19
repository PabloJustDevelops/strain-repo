import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { ThemeMode, Units } from '@/types/domain';
import type { ReminderConfig } from '@/lib/notifications';
import { DEFAULT_REMINDER_CONFIG } from '@/lib/notifications';
import { createStateStorage } from '@/lib/storage';

/**
 * Preferencias persistentes del usuario. Vive en la seam `Storage` (Lynx) para
 * no mezclarse con la BD de entrenamiento. Idéntico contrato al de la app Expo.
 */
interface PreferencesState {
  themeMode: ThemeMode;
  units: Units;
  hapticsEnabled: boolean;
  defaultRestSeconds: number;
  keepScreenAwake: boolean;
  notificationsEnabled: boolean;
  reminder: ReminderConfig;
  setThemeMode: (mode: ThemeMode) => void;
  setUnits: (units: Units) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setDefaultRest: (seconds: number) => void;
  setKeepScreenAwake: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setReminder: (reminder: ReminderConfig) => void;
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      themeMode: 'system',
      units: 'kg',
      hapticsEnabled: true,
      defaultRestSeconds: 90,
      keepScreenAwake: true,
      notificationsEnabled: false,
      reminder: DEFAULT_REMINDER_CONFIG,
      setThemeMode: (themeMode) => set({ themeMode }),
      setUnits: (units) => set({ units }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
      setDefaultRest: (defaultRestSeconds) => set({ defaultRestSeconds }),
      setKeepScreenAwake: (keepScreenAwake) => set({ keepScreenAwake }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setReminder: (reminder) => set({ reminder }),
    }),
    {
      name: 'strain-preferences',
      storage: createJSONStorage(() => createStateStorage()),
    },
  ),
);
