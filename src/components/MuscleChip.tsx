import { useTheme } from '@lib/useTheme';
import type { MuscleGroup } from '@/types/domain';
import { Text } from '@components/Text';

/**
 * Pill seleccionable para filtrar por grupo muscular.
 *
 * `label` permite usarlo como chip "Todos" sin inventar un `MuscleGroup` que no
 * existe (la app anterior resolvía el filtro "all" pasando un grupo cualquiera).
 */
interface MuscleChipProps {
  group: MuscleGroup;
  active?: boolean;
  label?: string;
  onPress: () => void;
}

export function MuscleChip({ group, active = false, label, onPress }: MuscleChipProps) {
  const { colors } = useTheme();

  return (
    <view
      className="Chip"
      style={{
        backgroundColor: active ? colors.accent : colors.surfaceRaised,
        borderColor: active ? colors.accent : colors.line,
      }}
      bindtap={onPress}
    >
      <Text
        role="support"
        tone={active ? 'onAccent' : 'textPrimary'}

      >
        {label ?? group}
      </Text>
    </view>
  );
}
