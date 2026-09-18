import type { ReactNode } from '@lynx-js/react';

import { useTheme } from '@lib/useTheme';

/**
 * Contenedor con borde y fondo elevado. Base de casi todo lo que se lista.
 */
interface CardProps {
  /** `false` para que el padding lo ponga el contenido (filas a sangre). */
  padded?: boolean;
  children?: ReactNode;
}

export function Card({ padded = true, children }: CardProps) {
  const { colors } = useTheme();

  return (
    <view
      className={padded ? 'Card CardPadded' : 'Card'}
      style={{ backgroundColor: colors.surface, borderColor: colors.border }}
    >
      {children}
    </view>
  );
}
