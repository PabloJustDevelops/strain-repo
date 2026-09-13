import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, Pressable, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import { usePreferences } from '@stores/preferencesStore';
import { useActiveWorkout } from '@stores/activeWorkoutStore';
import { useAuth } from '@stores/authStore';
import { bootstrapProductionDatabase } from '@db/bootstrap';
import { darkTheme, lightTheme, spacing, radius, fontSize } from '@lib/theme';
import { initNotifications, scheduleReminders } from '@lib/notifications';

// Mantén el splash hasta que la BD esté lista
SplashScreen.preventAutoHideAsync().catch(() => {});

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

/**
 * Root layout de la app.
 *
 * Responsabilidades:
 * - Inicializa la BD (migraciones + seed) antes de mostrar contenido.
 * - Configura el tema según preferencias + esquema del sistema.
 * - Carga cualquier sesión activa en memoria.
 * - Aplica el color de fondo a la barra del sistema en nativo.
 *
 * Si el arranque falla, NO se renderiza la app con el data layer a medias: se
 * muestra la causa real y un botón para reintentar. Antes el error se tragaba y
 * cada pantalla reventaba con "Data layer no inicializado", que no decía nada
 * del problema de fondo.
 */
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkTheme : lightTheme;
  const loadActive = useActiveWorkout((s) => s.loadActive);
  const initAuth = useAuth((s) => s.init);

  const [bootError, setBootError] = useState<Error | null>(null);
  const [bootAttempt, setBootAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await bootstrapProductionDatabase();
        await loadActive();
        await initAuth();
        await initNotifications();
        // Re-aplica los recordatorios guardados por si el usuario los tenía activos
        const reminder = usePreferences.getState().reminder;
        if (reminder?.enabled) {
          await scheduleReminders(reminder);
        }
        if (!cancelled) setBootError(null);
      } catch (err) {
        console.error('[strain] Error inicializando:', err);
        if (!cancelled) setBootError(toError(err));
      } finally {
        if (!cancelled) SplashScreen.hideAsync().catch(() => {});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadActive, initAuth, bootAttempt]);

  const handleRetry = () => {
    setBootError(null);
    setBootAttempt((n) => n + 1);
  };

  if (bootError) {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
        <SafeAreaProvider>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              padding: spacing.xl,
              gap: spacing.md,
            }}
          >
            <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '700', textAlign: 'center' }}>
              No se pudo iniciar la base de datos
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, textAlign: 'center' }}>
              {bootError.message}
            </Text>
            <Pressable
              onPress={handleRetry}
              style={{
                backgroundColor: colors.primary,
                paddingHorizontal: spacing.xl,
                paddingVertical: spacing.md,
                borderRadius: radius.md,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Reintentar</Text>
            </Pressable>
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

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
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
