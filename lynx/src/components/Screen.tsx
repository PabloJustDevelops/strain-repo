import type { ReactNode } from '@lynx-js/react';

import { useTheme } from '@lib/useTheme';
import { Text } from '@components/Text';

/**
 * Andamiaje común de una pestaña: cabecera + cuerpo con scroll.
 *
 * El scroll (`<scroll-view>`) sólo envuelve el contenido, así que la cabecera
 * queda fija. Los colores salen del tema; el layout, de clases CSS.
 */
interface ScreenProps {
  title: string;
  subtitle?: string;
  /** Contenido a la derecha del título (una acción, un badge...). */
  right?: ReactNode;
  children?: ReactNode;
}

export function Screen({ title, subtitle, right, children }: ScreenProps) {
  const { colors } = useTheme();

  return (
    <view className="Screen" style={{ backgroundColor: colors.bg }}>
      <view className="ScreenHeader" style={{ borderColor: colors.line }}>
        <view className="ScreenHeaderRow">
          <Text role="heading" tone="textPrimary">
            {title}
          </Text>
          {right}
        </view>
        {subtitle ? (
          <Text role="support" tone="textSecondary">
            {subtitle}
          </Text>
        ) : null}
      </view>

      <scroll-view className="ScreenScroll" scroll-orientation="vertical">
        <view className="ScreenContent">{children}</view>
      </scroll-view>
    </view>
  );
}
