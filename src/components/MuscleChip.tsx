import { View, Text, Pressable } from 'react-native';
import { useColorScheme } from 'react-native';
import { usePreferences } from '@stores/preferencesStore';
import { darkTheme, lightTheme, spacing, radius, fontSize } from '@lib/theme';
import { MUSCLE_GROUP_LABELS, type MuscleGroup } from '@types/domain';

interface MuscleChipProps {
  group: MuscleGroup;
  active?: boolean;
  onPress?: () => void;
}

/** Pill seleccionable para filtrar por grupo muscular. */
export function MuscleChip({ group, active, onPress }: MuscleChipProps) {
  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkTheme : lightTheme;

  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        backgroundColor: active ? colors.primary : colors.surfaceElevated,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
      }}
    >
      <Text
        style={{
          color: active ? '#fff' : colors.text,
          fontSize: fontSize.sm,
          fontWeight: '600',
        }}
      >
        {MUSCLE_GROUP_LABELS[group]}
      </Text>
    </Pressable>
  );
}
