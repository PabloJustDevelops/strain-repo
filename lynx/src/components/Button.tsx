import { Text, type TextTone } from '@components/Text';
import { useTheme } from '@lib/useTheme';
import type { ThemeColors } from '@lib/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/**
 * Botón estándar de Strain en Lynx.
 *
 * Lynx no trae `Pressable`: el área táctil es un `<view>` con `bindtap` y el
 * estado deshabilitado se resuelve sin registrar el handler (en vez de un
 * `disabled` que el engine no tiene). El alto mínimo sale del área táctil del
 * sistema (44).
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
    <view
      className={fullWidth ? 'Button ButtonFull' : 'Button'}
      style={{
        backgroundColor: style.background,
        borderColor: style.border,
        opacity: disabled ? 0.5 : 1,
      }}
      bindtap={disabled ? undefined : onPress}
    >
      <Text role="title" tone={style.tone}>
        {title}
      </Text>
    </view>
  );
}
