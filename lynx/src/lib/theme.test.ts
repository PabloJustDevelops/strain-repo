import { describe, expect, it } from 'vitest';

import { darkTheme, withAlpha } from './theme';

/**
 * `withAlpha` existe porque el CSS de Lynx no acepta el hex de 8 dígitos
 * (`#rrggbbaa`) que sí usaba la app Expo: todo color con transparencia pasa por
 * acá, y si el hex no se entiende preferimos el color opaco antes que uno roto.
 */
describe('withAlpha', () => {
  it('convierte un hex de 6 dígitos a rgba con el alfa pedido', () => {
    expect(withAlpha(darkTheme.primary, 0.5)).toBe('rgba(59, 130, 246, 0.5)');
  });

  it('acepta el hex sin numeral y el de 3 dígitos', () => {
    expect(withAlpha('000000', 0.5)).toBe('rgba(0, 0, 0, 0.5)');
    expect(withAlpha('#fff', 0.25)).toBe('rgba(255, 255, 255, 0.25)');
  });

  it('devuelve el color original si el hex no se entiende', () => {
    expect(withAlpha('transparent', 0.5)).toBe('transparent');
    expect(withAlpha('#zzzzzz', 0.5)).toBe('#zzzzzz');
  });
});
