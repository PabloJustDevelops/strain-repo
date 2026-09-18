import type { ReactNode } from '@lynx-js/react';

import { useTheme } from '@lib/useTheme';

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
  const { colors } = useTheme();

  return (
    <view className="Empty">
      <text className="EmptyTitle" style={{ color: colors.text }}>
        {title}
      </text>
      {body ? (
        <text className="EmptyBody" style={{ color: colors.textMuted }}>
          {body}
        </text>
      ) : null}
      {action ? <view className="EmptyAction">{action}</view> : null}
    </view>
  );
}
