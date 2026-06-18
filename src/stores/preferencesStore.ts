import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeMode, Units } from '@types/domain';

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
  setThemeMode: (mode: ThemeMode) => void;
  setUnits: (units: Units) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setDefaultRest: (seconds: number) => void;
  setKeepScreenAwake: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
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
      setThemeMode: (themeMode) => set({ themeMode }),
      setUnits: (units) => set({ units }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
      setDefaultRest: (defaultRestSeconds) => set({ defaultRestSeconds }),
      setKeepScreenAwake: (keepScreenAwake) => set({ keepScreenAwake }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
    }),
    {
      name: 'strain-preferences',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
