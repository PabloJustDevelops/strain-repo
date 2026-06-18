import { Tabs } from 'expo-router';
import { useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useColorScheme } from 'react-native';
import { usePreferences } from '@stores/preferencesStore';
import { darkTheme, lightTheme } from '@lib/theme';

/**
 * Layout de las pestañas principales.
 *
 * - En móvil/tablet estrecho: barra inferior de tabs.
 * - En web/desktop o pantallas anchas: se renderiza como una fila de links
 *   en la parte superior (Stack padre) o como sidebar si se prefiere.
 *
 * Como expo-router no soporta nativamente sidebar, usamos `tabBarPosition`
 * detectado por dimensiones: en anchos >= 1024 ocultamos la tab bar inferior
 * y dejamos que la navegación principal viva en un sidebar custom que se
 * renderiza en el index (ver `app/(tabs)/index.tsx`).
 */
export default function TabsLayout() {
  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkTheme : lightTheme;

  const { width } = useWindowDimensions();
  const isWide = width >= 1024;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          // En pantallas anchas ocultamos la tab bar inferior
          display: isWide ? 'none' : 'flex',
          height: 64,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Hoy',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="routines"
        options={{
          title: 'Rutinas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: 'Ejercicios',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="barbell-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Historial',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progreso',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trending-up-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
