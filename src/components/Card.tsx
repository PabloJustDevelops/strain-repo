import { View, type ViewProps } from 'react-native';
import { useColorScheme } from 'react-native';
import { usePreferences } from '@stores/preferencesStore';
import { darkTheme, lightTheme, spacing, radius } from '@lib/theme';

interface CardProps extends ViewProps {
  padded?: boolean;
}

/**
 * Contenedor con borde y elevación ligera. Base para la mayoría de tarjetas.
 */
export function Card({ children, style, padded = true, ...rest }: CardProps) {
  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);

  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';

  const colors = isDark ? darkTheme : lightTheme;

  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.lg,
          padding: padded ? spacing.lg : 0,
          gap: spacing.sm,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
