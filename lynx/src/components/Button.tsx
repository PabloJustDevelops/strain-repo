import { useTheme } from '@lib/useTheme';
import type { ThemeColors } from '@lib/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/**
 * Botón estándar de Strain en Lynx.
 *
 * Lynx no trae `Pressable`: el área táctil es un `<view>` con `bindtap` y el
 * estado deshabilitado se resuelve sin registrar el handler (en vez de un
 * `disabled` que el engine no tiene).
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
  text: string;
}

function variantStyle(variant: ButtonVariant, colors: ThemeColors): VariantStyle {
  switch (variant) {
    case 'secondary':
      return { background: colors.surfaceRaised, border: colors.line, text: colors.textPrimary };
    case 'ghost':
      return { background: 'transparent', border: 'transparent', text: colors.accent };
    case 'danger':
      return { background: colors.danger, border: colors.danger, text: '#ffffff' };
    case 'primary':
      return { background: colors.accent, border: colors.accent, text: '#ffffff' };
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
      <text className="ButtonText" style={{ color: style.text }}>
        {title}
      </text>
    </view>
  );
}
