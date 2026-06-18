import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';

import { usePreferences } from '@stores/preferencesStore';
import { useActiveWorkout } from '@stores/activeWorkoutStore';
import { runMigrations } from '@db/migrations';
import { seedExercises } from '@db/seed';
import { darkTheme, lightTheme } from '@lib/theme';

// Mantén el splash hasta que la BD esté lista
SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Root layout de la app.
 *
 * Responsabilidades:
 * - Inicializa la BD (migraciones + seed) antes de mostrar contenido.
 * - Configura el tema según preferencias + esquema del sistema.
 * - Carga cualquier sesión activa en memoria.
 * - Aplica el color de fondo a la barra del sistema en nativo.
 */
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkTheme : lightTheme;
  const loadActive = useActiveWorkout((s) => s.loadActive);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        runMigrations();
        await seedExercises();
        await loadActive();
      } catch (err) {
        console.error('[strain] Error inicializando:', err);
      } finally {
        if (!cancelled) SplashScreen.hideAsync().catch(() => {});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadActive]);

  // Pinta la barra de estado en nativo
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
  }, [colors.background]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="workout/active"
            options={{
              presentation: 'fullScreenModal',
              headerShown: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="workout/finish"
            options={{
              presentation: 'modal',
              title: 'Resumen',
            }}
          />
          <Stack.Screen name="exercises/[id]" options={{ title: 'Ejercicio' }} />
          <Stack.Screen name="routines/[id]" options={{ title: 'Rutina' }} />
          <Stack.Screen name="settings" options={{ title: 'Ajustes' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
