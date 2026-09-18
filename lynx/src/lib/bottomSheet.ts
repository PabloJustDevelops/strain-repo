/**
 * La política del gesto de un bottom sheet, en un solo lugar.
 *
 * Un bottom sheet se cierra arrastrándolo hacia abajo: por distancia recorrida o por un flick rápido,
 * y vuelve a su sitio si el gesto no alcanzó. Estas dos funciones son la definición de esa regla; el
 * sheet es su único consumidor.
 *
 * Son worklets (`react-native-reanimated`) para poder llamarse desde los callbacks del gesto; en
 * Vitest son funciones puras normales. Los tipos son primitivos a propósito: la regla no depende de RN.
 */

/** Fracción de la altura del sheet que hay que arrastrar hacia abajo para cerrarlo. */
const SHEET_DISMISS_RATIO = 1 / 3;

/** Velocidad (px/s) hacia abajo que cierra el sheet aunque no llegue a la distancia. */
const SHEET_DISMISS_VELOCITY = 900;

/**
 * El arrastre nunca sube el sheet por encima de su posición de reposo: los valores negativos se
 * recortan a 0 para que no se despegue de abajo.
 */
export function clampSheetDrag(translationY: number): number {
  'worklet';

  return Math.max(0, translationY);
}

export interface SheetDismissInput {
  /** Desplazamiento vertical actual en px; positivo hacia abajo. */
  translationY: number;
  /** Velocidad vertical en px/s al soltar; positiva hacia abajo. */
  velocityY: number;
  /** Altura medida del sheet en px; 0 si todavía no se midió. */
  height: number;
}

/**
 * ¿El gesto de arrastre debe cerrar el sheet?
 *
 * - Un flick decidido hacia arriba siempre cancela, aunque se haya arrastrado lejos.
 * - Un flick hacia abajo cierra sin importar la distancia.
 * - Sin flick, cierra si el arrastre llegó a la fracción de altura configurada.
 * - Una altura sin medir (`0`) no cierra por distancia, para no decidir con datos incompletos.
 */
export function shouldDismissSheet({
  translationY,
  velocityY,
  height,
}: SheetDismissInput): boolean {
  'worklet';

  if (velocityY <= -SHEET_DISMISS_VELOCITY) return false;

  if (velocityY >= SHEET_DISMISS_VELOCITY) return true;

  if (height <= 0) return false;

  return translationY >= height * SHEET_DISMISS_RATIO;
}
