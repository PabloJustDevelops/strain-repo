import { Button as LynxButton } from '@lynx-js/lynx-ui';

import { Text, type TextTone } from '@components/Text';
import { useTheme } from '@lib/useTheme';
import type { ThemeColors } from '@lib/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/**
 * Botón estándar de Strain, sobre el `button` headless de `@lynx-js/lynx-ui`.
 *
 * El `Button` de lynx-ui aporta lo que faltaba con un `bindtap` pelado: separa
 * pulsado, reposo y deshabilitado (inyecta `ui-active` y `ui-disabled`), así que
 * los estados del botón se pueden pintar de verdad. El aspecto sigue siendo
 * nuestro: la librería es headless y sólo pinta lo que le dan `style` y
 * `className`.
 */
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  /** Ocupa todo el ancho disponible. */
  fullWidth?: boolean;
}

interface VariantStyle {
  background: string;
  border: string;
  tone: TextTone;
}

/**
 * Sólo `primary` y `danger` son rellenos; `secondary` y `ghost` no pintan
 * fondo. El acento queda para la acción primaria de la pantalla, que es lo que
 * sostiene la regla 60-30-10.
 */
function variantStyle(variant: ButtonVariant, colors: ThemeColors): VariantStyle {
  switch (variant) {
    case 'secondary':
      return { background: colors.surfaceRaised, border: colors.line, tone: 'textPrimary' };
    case 'ghost':
      return { background: 'transparent', border: 'transparent', tone: 'accent' };
    case 'danger':
      return { background: colors.danger, border: colors.danger, tone: 'textInverse' };
    case 'primary':
      return { background: colors.accent, border: colors.accent, tone: 'onAccent' };
  }
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  fullWidth = false,
}: ButtonProps) {
  const { colors } = useTheme();
  const style = variantStyle(variant, colors);

  return (
    <LynxButton
      className={fullWidth ? 'Button ButtonFull' : 'Button'}
      style={{ backgroundColor: style.background, borderColor: style.border }}
      disabled={disabled}
      onClick={onPress}
    >
      <Text role="title" tone={style.tone}>
        {title}
      </Text>
    </LynxButton>
  );
}
