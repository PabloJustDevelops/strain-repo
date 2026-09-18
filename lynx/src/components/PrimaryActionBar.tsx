import { useState } from '@lynx-js/react';

import { Text } from '@components/Text';
import { TOUCH_TARGET, pressedStyle, radius } from '@lib/theme';
import { useTheme } from '@lib/useTheme';

/**
 * Barra inferior de acción primaria: la única de la pantalla.
 *
 * Va pegada al borde de abajo porque es donde llega el pulgar, y ocupa el ancho
 * completo para que el objetivo táctil no dependa del largo del texto. La regla
 * de una sola acción por pantalla es del sistema, no de este componente: si algo
 * más tiene que estar al alcance, va en el cuerpo, no acá.
 */
interface PrimaryActionBarProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

export function PrimaryActionBar({ label, onPress, disabled = false }: PrimaryActionBarProps) {
  const { colors } = useTheme();
  const [pressed, setPressed] = useState(false);

  return (
    <view
      className="PrimaryActionBar"
      style={{ backgroundColor: colors.surface, borderColor: colors.border }}
    >
      <view
        className={disabled ? 'PrimaryAction PrimaryActionDisabled' : 'PrimaryAction'}
        style={{
          ...pressedStyle(pressed),
          backgroundColor: colors.accent,
          borderRadius: radius.control,
          minHeight: TOUCH_TARGET,
        }}
        bindtap={disabled ? undefined : onPress}
        bindtouchstart={() => setPressed(true)}
        bindtouchend={() => setPressed(false)}
        bindtouchcancel={() => setPressed(false)}
      >
        <Text role="heading" tone="onAccent" className="PrimaryActionLabel" maxLines={1}>
          {label}
        </Text>
      </view>
    </view>
  );
}
