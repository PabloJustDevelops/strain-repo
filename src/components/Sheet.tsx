import type { ReactNode } from '@lynx-js/react';
import {
  SheetBackdrop,
  SheetContent,
  SheetHandle,
  SheetRoot,
  SheetView,
} from '@lynx-js/lynx-ui';

import { Text } from '@components/Text';
import { motion } from '@lib/theme';
import { useTheme } from '@lib/useTheme';

/**
 * Panel que sube desde el borde inferior, sobre el `sheet` de `@lynx-js/lynx-ui`.
 *
 * Antes era un `<view>` posicionado en absoluto, sin gesto y con cierre sólo por
 * botón. Ahora la librería aporta lo que faltaba y no se puede escribir a mano:
 * arrastre para cerrar, animación de entrada/salida y snap al alto del contenido.
 * El dibujo (color, borde, radio, cabecera) sigue siendo nuestro: la librería es
 * headless.
 *
 * `@lib/bottomSheet` (la política de arrastre portada de la app Expo) sigue sin
 * consumidor: la librería resuelve el gesto por su cuenta.
 */
interface SheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children?: ReactNode;
  /** Acción al pie, fuera del área scrolleable. */
  footer?: ReactNode;
}

export function Sheet({ visible, title, onClose, children, footer }: SheetProps) {
  const { colors } = useTheme();

  return (
    <SheetRoot
      show={visible}
      snapPoints={['fit']}
      enableDragToClose
      onShowChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetView>
        <SheetBackdrop
          onClick={onClose}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        />

        <SheetContent
          className="SheetPanel"
          style={{ backgroundColor: colors.surfaceRaised, borderColor: colors.line }}
          enterAnimation={{ type: 'tween', duration: motion.base }}
          exitAnimation={{ type: 'tween', duration: motion.base }}
        >
          <view className="SheetHandleRow">
            <SheetHandle className="SheetHandle" style={{ backgroundColor: colors.line }} />
          </view>

          <view className="SheetHeader">
            <Text role="title" tone="textPrimary">
              {title}
            </Text>
            <view className="SheetClose" bindtap={onClose}>
              <Text role="support" tone="textSecondary">
                Cerrar
              </Text>
            </view>
          </view>

          {children}
          {footer ? <view className="SheetFooter">{footer}</view> : null}
        </SheetContent>
      </SheetView>
    </SheetRoot>
  );
}
