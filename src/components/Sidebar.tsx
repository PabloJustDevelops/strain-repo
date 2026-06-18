import { View, Text, Pressable } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { usePreferences } from '@stores/preferencesStore';
import { darkTheme, lightTheme, spacing, radius, fontSize } from '@lib/theme';

interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Hoy', icon: 'home-outline' },
  { href: '/routines', label: 'Rutinas', icon: 'list-outline' },
  { href: '/exercises', label: 'Ejercicios', icon: 'barbell-outline' },
  { href: '/history', label: 'Historial', icon: 'calendar-outline' },
  { href: '/progress', label: 'Progreso', icon: 'trending-up-outline' },
];

/**
 * Sidebar fijo para web/desktop.
 * Se renderiza a la izquierda del contenido en pantallas anchas.
 */
export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkTheme : lightTheme;

  return (
    <View
      style={{
        width: 240,
        backgroundColor: colors.surface,
        borderRightColor: colors.border,
        borderRightWidth: 1,
        paddingVertical: spacing.xl,
        paddingHorizontal: spacing.md,
        gap: spacing.xs,
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontSize: fontSize.xxl,
          fontWeight: '900',
          letterSpacing: -1,
          marginBottom: spacing.lg,
          paddingHorizontal: spacing.sm,
        }}
      >
        Strain
      </Text>
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Pressable
            key={item.href}
            onPress={() => router.push(item.href)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.md,
              borderRadius: radius.md,
              backgroundColor: active ? colors.primaryMuted : pressed ? colors.surfaceElevated : 'transparent',
            })}
          >
            <Ionicons
              name={item.icon}
              size={20}
              color={active ? colors.primary : colors.textMuted}
            />
            <Text
              style={{
                color: active ? colors.primary : colors.text,
                fontSize: fontSize.base,
                fontWeight: active ? '700' : '500',
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
