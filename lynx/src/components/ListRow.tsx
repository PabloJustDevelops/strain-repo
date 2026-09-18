import { useState } from '@lynx-js/react';
import type { ReactNode } from '@lynx-js/react';

import { Icon } from '@components/Icon';
import { Text } from '@components/Text';
import { pressedStyle } from '@lib/theme';
import { useTheme } from '@lib/useTheme';

/**
 * Fila de lista: la forma por defecto de todo lo que se repite.
 *
 * La v2 abandona la tarjeta por elemento —una lista de workouts eran diez cajas
 * apiladas— y vuelve a la fila separada por una línea, que es lo que deja leer
 * una lista como una lista. El contenido se ordena en tres huecos (leading,
 * cuerpo, chevron) y los nombres largos truncan con elipsis en vez de desbordar.
 */
interface ListRowProps {
  /** Hueco a la izquierda: un icono, un badge, un avatar. */
  leading?: ReactNode;
  /** Lo que se lee primero. */
  title: string;
  /** Línea de apoyo: fecha, volumen, unidades. */
  meta?: string;
  /** Flecha a la derecha, sólo para lo que navega a otra pantalla. */
  chevron?: boolean;
  onPress?: () => void;
}

export function ListRow({ leading, title, meta, chevron = false, onPress }: ListRowProps) {
  const { colors } = useTheme();
  const [pressed, setPressed] = useState(false);

  return (
    <view
      className="ListRow"
      style={{ ...pressedStyle(pressed), borderColor: colors.border }}
      bindtap={onPress}
      bindtouchstart={() => setPressed(true)}
      bindtouchend={() => setPressed(false)}
      bindtouchcancel={() => setPressed(false)}
    >
      <view className="ListRowMain">
        {leading ? <view className="ListRowLeading">{leading}</view> : null}

        <view className="ListRowBody">
          <Text role="body" tone="textPrimary" className="ListRowTitle" maxLines={1}>
            {title}
          </Text>
          {meta ? (
            <Text role="support" tone="textSecondary" className="ListRowMeta" maxLines={1}>
              {meta}
            </Text>
          ) : null}
        </view>

        {chevron ? <Icon name="chevronRight" size={20} tone="textSecondary" /> : null}
      </view>
    </view>
  );
}
