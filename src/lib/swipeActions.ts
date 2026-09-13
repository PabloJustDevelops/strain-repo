/**
 * Matemática de las acciones de swipe, en un solo lugar.
 *
 * Antes vivía inline en `SetRow` como `interpolateColor(...) as unknown as
 * number`: `interpolateColor` devuelve un color (string) y usarlo de `opacity`
 * rompía en nativo (`String cannot be cast to Double`). El cast escondía el
 * error. Acá el cálculo es un número puro, con clamp, y testeable.
 *
 * Es un worklet: se llama desde `useAnimatedStyle`.
 */

/** Desplazamientos (px) del gesto que definen la curva. */
const STOPS = [-200, -50, 0] as const;
/** Opacidades correspondientes, de 0 (reposo) a 1 (acción desplegada). */
const OPACITIES = [1, 0.4, 0] as const;

/**
 * Opacidad (0..1) del fondo de la acción de swipe izquierda según el
 * desplazamiento horizontal. En reposo o hacia el otro lado vale 0; al
 * desplegar la acción llega a 1. Fuera de rango se queda en los extremos.
 */
export function swipeActionOpacity(translationX: number): number {
  'worklet';
  const [x0, x1, x2] = STOPS;
  const [y0, y1, y2] = OPACITIES;

  if (translationX <= x0) return y0;
  if (translationX >= x2) return y2;
  if (translationX <= x1) {
    return y0 + ((y1 - y0) * (translationX - x0)) / (x1 - x0);
  }
  return y1 + ((y2 - y1) * (translationX - x1)) / (x2 - x1);
}
