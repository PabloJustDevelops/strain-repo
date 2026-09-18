import { useState } from '@lynx-js/react';

import { Text } from '@components/Text';
import { pressedStyle, radius } from '@lib/theme';
import { useTheme } from '@lib/useTheme';

/**
 * Chip seleccionable.
 *
 * El acento marca la selección, nunca el relleno decorativo: sin seleccionar el
 * chip es una superficie con borde, y al seleccionarse se rellena de acento. La
 * etiqueta cambia de rol a la vez que el fondo, así que el estado también se lee
 * sin depender del color.
 */
interface ChipProps {
  label: string;
  active?: boolean;
  onPress: () => void;
}

export function Chip({ label, active = false, onPress }: ChipProps) {
  const { colors } = useTheme();
  const [pressed, setPressed] = useState(false);

  return (
    <view
      className={active ? 'Chip ChipActive' : 'Chip'}
      style={{
        ...pressedStyle(pressed),
        backgroundColor: active ? colors.accent : colors.surface,
        borderColor: active ? colors.accent : colors.border,
        borderRadius: radius.pill,
      }}
      bindtap={onPress}
      bindtouchstart={() => setPressed(true)}
      bindtouchend={() => setPressed(false)}
      bindtouchcancel={() => setPressed(false)}
    >
      <Text role="support" tone={active ? 'onAccent' : 'textPrimary'}>
        {label}
      </Text>
    </view>
  );
}
