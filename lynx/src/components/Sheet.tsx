import type { ReactNode } from '@lynx-js/react';

import { useTheme } from '@lib/useTheme';

/**
 * Panel que sube desde el borde inferior, con telón de fondo.
 *
 * Por qué no hay un `<Sheet>` nativo acá:
 * - `@lynx-js/types` no expone ningún elemento `sheet` ni `action-sheet`; el
 *   paquete que sí los trae (`@lynx-js/lynx-ui`) no está instalado y este run no
 *   suma dependencias.
 * - `<overlay>` sí existe, pero es un overlay *de ventana* del lado nativo: no
 *   deja controlar layout/estilos ni se puede testear sin dispositivo.
 *
 * Así que el sheet es un `<view>` posicionado en absoluto dentro de la pantalla.
 * Sin gesto de arrastre (no hay `gesture-handler` ni `<Sheet>`), el cierre es
 * explícito: telón y botón "Cerrar". La política de arrastre ya portada en
 * `@lib/bottomSheet` queda sin consumidor hasta que existan esos gestos, y se
 * usará tal cual el día que se sumen.
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

  if (!visible) return null;

  return (
    <view className="Sheet">
      <view className="SheetBackdrop" bindtap={onClose} />

      <view
        className="SheetPanel"
        style={{ backgroundColor: colors.surfaceElevated, borderColor: colors.border }}
      >
        <view className="SheetHeader">
          <text className="SheetTitle" style={{ color: colors.text }}>
            {title}
          </text>
          <view className="SheetClose" bindtap={onClose}>
            <text className="SheetCloseLabel" style={{ color: colors.textMuted }}>
              Cerrar
            </text>
          </view>
        </view>

        {children}
        {footer ? <view className="SheetFooter">{footer}</view> : null}
      </view>
    </view>
  );
}
