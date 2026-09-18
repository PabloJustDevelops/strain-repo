import type { ReactNode } from '@lynx-js/react';

import { Text } from '@components/Text';

/**
 * Estado vacío explícito: sin esto, una lista sin datos es una pantalla en
 * blanco que no distingue "no hay nada" de "todavía está cargando".
 */
interface EmptyStateProps {
  title: string;
  body?: string;
  /** Acción sugerida (crear la primera rutina, etc.). */
  action?: ReactNode;
}

export function EmptyState({ title, body, action }: EmptyStateProps) {
  return (
    <view className="Empty">
      <Text role="title" tone="textPrimary">
        {title}
      </Text>
      {body ? (
        <Text role="support" tone="textSecondary">
          {body}
        </Text>
      ) : null}
      {action ? <view className="EmptyAction">{action}</view> : null}
    </view>
  );
}
