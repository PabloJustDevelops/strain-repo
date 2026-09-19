import type { ReactNode } from '@lynx-js/react';

import { Text } from '@components/Text';

/**
 * Cabecera de sección: el título que ordena un bloque y, si hace falta, una
 * acción al lado.
 *
 * Existe para que "sección" y "fila" no se confundan. Antes cada bloque lo
 * titulaba una tarjeta, que es lo que llevaba a meter tarjetas dentro de
 * tarjetas; con una cabecera suelta el contenido de la sección puede ser una
 * lista de filas a sangre.
 */
interface SectionHeaderProps {
  title: string;
  /** Acción de la sección: un enlace, un botón pequeño. */
  action?: ReactNode;
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <view className="SectionHeader">
      <Text role="heading" tone="textPrimary" className="SectionHeaderTitle" maxLines={1}>
        {title}
      </Text>
      {action ? <view className="SectionHeaderAction">{action}</view> : null}
    </view>
  );
}
