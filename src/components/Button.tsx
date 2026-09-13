import { Pressable, Text, ActivityIndicator, type ViewStyle } from 'react-native';
import { usePreferences } from '@stores/preferencesStore';
import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme, spacing, radius, fontSize } from '@lib/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Botón estándar de Strain.
 * - primary: acción principal (azul)
 * - secondary: acción secundaria (outlined)
 * - ghost: acción terciaria (sin fondo)
 * - danger: acción destructiva (rojo)
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  fullWidth,
  icon,
  style,
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkTheme : lightTheme;

  const isDisabled = disabled || loading;
  const opacity = isDisabled ? 0.5 : 1;

  const styles = getStyles(variant, colors, fullWidth);

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        { opacity: pressed ? 0.85 : opacity },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={styles.text.color} />
      ) : (
        <>
          {icon}
          <Text style={styles.text}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

function getStyles(variant: ButtonProps['variant'], colors: typeof darkTheme, fullWidth?: boolean) {
  const base: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    minHeight: 44,
    ...(fullWidth ? { alignSelf: 'stretch' } : {}),
  };

  switch (variant) {
    case 'primary':
      return {
        base: { ...base, backgroundColor: colors.primary },
        text: { color: '#fff', fontWeight: '700' as const, fontSize: fontSize.base },
      };
    case 'secondary':
      return {
        base: { ...base, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
        text: { color: colors.text, fontWeight: '600' as const, fontSize: fontSize.base },
      };
    case 'ghost':
      return {
        base: { ...base, backgroundColor: 'transparent' },
        text: { color: colors.primary, fontWeight: '600' as const, fontSize: fontSize.base },
      };
    case 'danger':
      return {
        base: { ...base, backgroundColor: colors.danger },
        text: { color: '#fff', fontWeight: '700' as const, fontSize: fontSize.base },
      };
    default:
      return {
        base: { ...base, backgroundColor: colors.primary },
        text: { color: '#fff', fontWeight: '700' as const, fontSize: fontSize.base },
      };
  }
}
