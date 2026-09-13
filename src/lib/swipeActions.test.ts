import { describe, expect, it } from 'vitest';

import { swipeActionOpacity } from './swipeActions';

/**
 * El bug de SetRow: se usaba `interpolateColor` (devuelve un color string) como
 * `opacity`, y el cast `as unknown as number` escondía que el tipo no cuadraba.
 * Esta función deja el cálculo en un número, con clamp en los extremos.
 */
describe('swipeActionOpacity', () => {
  it('en reposo vale 0', () => {
    expect(swipeActionOpacity(0)).toBe(0);
  });

  it('llega a 1 en el tope del gesto y fuera de rango', () => {
    expect(swipeActionOpacity(-200)).toBe(1);
    expect(swipeActionOpacity(-300)).toBe(1);
  });

  it('interpola los puntos conocidos', () => {
    expect(swipeActionOpacity(-50)).toBeCloseTo(0.4, 10);
    expect(swipeActionOpacity(-125)).toBeCloseTo(0.7, 10);
    expect(swipeActionOpacity(-25)).toBeCloseTo(0.2, 10);
  });

  it('se queda en 0 al desplazar hacia el otro lado', () => {
    expect(swipeActionOpacity(1)).toBe(0);
    expect(swipeActionOpacity(200)).toBe(0);
  });

  it('siempre devuelve un número dentro de [0, 1]', () => {
    for (let x = -400; x <= 400; x += 7) {
      const value = swipeActionOpacity(x);
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});
