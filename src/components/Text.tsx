import type { ReactNode } from '@lynx-js/react';
import type { CSSProperties } from '@lynx-js/types';

import { typeStyle, type TypeRole } from '@lib/theme';
import { useTheme } from '@lib/useTheme';

/** Roles de color que puede tomar un texto (subconjunto de los tokens). */
export type TextTone =
  | 'textPrimary'
  | 'textSecondary'
  | 'textInverse'
  | 'accent'
  | 'onAccent'
  | 'success'
  | 'warning'
  | 'danger';

interface TextProps {
  /** Paso de la escala tipográfica. Por defecto, cuerpo (`support`). */
  role?: TypeRole;
  /** Rol de color. Por defecto, texto principal. */
  tone?: TextTone;
  /**
   * Corta el texto a N líneas y mete elipsis al final.
   *
   * En Lynx el corte no lo hace el CSS solo: la elipsis necesita
   * `text-overflow: ellipsis` **y** el atributo `text-maxline` del `<text>`,
   * que es lo que este prop agrega. Sin él, un nombre largo se envuelve o
   * desborda en vez de truncarse.
   */
  maxLines?: number;
  /** Clases de layout (no de tipografía ni de color). */
  className?: string;
  /** Estilos extra, por encima del rol. */
  style?: CSSProperties;
  children?: ReactNode;
}

/**
 * Texto del sistema: aplica el paso tipográfico y el rol de color.
 *
 * Es la única puerta de entrada a `<text>`. Existe para que la escala
 * tipográfica y su compensación en oscuro se apliquen en un solo sitio: el
 * llamador elige `role` y `tone`, nunca un `fontSize` suelto. Así no vuelven a
 * aparecer 14 tamaños distintos en las pantallas.
 */
export function Text({
  role = 'support',
  tone = 'textPrimary',
  maxLines,
  className,
  style,
  children,
}: TextProps) {
  const { colors, isDark } = useTheme();

  return (
    <text
      className={className}
      style={{ ...typeStyle(role, isDark), color: colors[tone], ...style }}
      text-maxline={maxLines === undefined ? undefined : String(maxLines)}
    >
      {children}
    </text>
  );
}
