import { useState } from '@lynx-js/react';

import { Text } from '@components/Text';
import { remountKey } from '@lib/reactKeys';
import { TOUCH_TARGET, pressedStyle, radius } from '@lib/theme';
import { useTheme } from '@lib/useTheme';

/** Una opción del control: el valor que se elige y cómo se lee. */
export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Control segmentado: elegir uno entre pocos.
 *
 * Es para opciones excluyentes y pocas (2-4). La opción activa se pinta con el
 * acento y su etiqueta con `onAccent`, así el estado se lee por color y por
 * contraste del texto a la vez. Cada segmento es un objetivo táctil completo.
 */
interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();

  return (
    <view
      className="SegmentedControl"
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
        borderRadius: radius.container,
      }}
    >
      {options.map((option) => (
        <Segment
          key={remountKey('segment', option.value)}
          option={option}
          active={option.value === value}
          onSelect={onChange}
        />
      ))}
    </view>
  );
}

/**
 * Un segmento.
 *
 * Es un componente y no un `map` con `bindtap` porque el estado pulsado es un
 * `useState`, y un hook dentro de un bucle no es legal.
 */
function Segment<T extends string>({
  option,
  active,
  onSelect,
}: {
  option: SegmentedOption<T>;
  active: boolean;
  onSelect: (next: T) => void;
}) {
  const { colors } = useTheme();
  const [pressed, setPressed] = useState(false);

  return (
    <view
      className={active ? 'Segment SegmentActive' : 'Segment'}
      style={{
        ...pressedStyle(pressed),
        backgroundColor: active ? colors.accent : 'transparent',
        borderRadius: radius.control,
        minHeight: TOUCH_TARGET,
      }}
      bindtap={() => onSelect(option.value)}
      bindtouchstart={() => setPressed(true)}
      bindtouchend={() => setPressed(false)}
      bindtouchcancel={() => setPressed(false)}
    >
      <Text role="support" tone={active ? 'onAccent' : 'textPrimary'}>
        {option.label}
      </Text>
    </view>
  );
}
