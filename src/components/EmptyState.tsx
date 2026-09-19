import type { ReactNode } from '@lynx-js/react';

import { Icon, type IconName } from '@components/Icon';
import { Text } from '@components/Text';

/**
 * Estado vacío explícito: sin esto, una lista sin datos es una pantalla en
 * blanco que no distingue "no hay nada" de "todavía está cargando".
 *
 * Lleva **una** acción como mucho: un vacío que ofrece tres caminos no está
 * guiando a ninguno. El icono es del set propio; nunca un emoji.
 */
interface EmptyStateProps {
  /** Icono que ilustra el vacío. */
  icon?: IconName;
  title: string;
  body?: string;
  /** La única acción sugerida (crear la primera rutina, etc.). */
  action?: ReactNode;
}

export function EmptyState({ icon, title, body, action }: EmptyStateProps) {
  return (
    <view className="Empty">
      {icon ? (
        <view className="EmptyIcon">
          <Icon name={icon} size={32} tone="textSecondary" />
        </view>
      ) : null}

      <Text role="title" tone="textPrimary">
        {title}
      </Text>
      {body ? (
        <Text role="body" tone="textSecondary">
          {body}
        </Text>
      ) : null}
      {action ? <view className="EmptyAction">{action}</view> : null}
    </view>
  );
}
