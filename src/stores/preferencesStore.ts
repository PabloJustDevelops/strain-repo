import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeMode, Units } from '@/types/domain';
import type { ReminderConfig } from '@/lib/notifications';

/**
 * Preferencias persistentes del usuario.
 * Vive en AsyncStorage para no mezclarse con la BD de entrenamiento.
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

const DEFAULT_REMINDER: ReminderConfig = {
  enabled: false,
  hour: 18,
  minute: 30,
  daysOfWeek: [1, 3, 5],
  message: 'Hora de entrenar. ¡A por ello!',
};

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      themeMode: 'system',
      units: 'kg',
      hapticsEnabled: true,
      defaultRestSeconds: 90,
      keepScreenAwake: true,
      notificationsEnabled: false,
      reminder: DEFAULT_REMINDER,
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
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);