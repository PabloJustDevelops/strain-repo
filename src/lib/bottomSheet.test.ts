import { describe, expect, it } from 'vitest';

import { clampSheetDrag, shouldDismissSheet } from './bottomSheet';

/** Tabla de casos de la política del gesto. Corre sin RN ni render: es la razón
 * por la que la regla vive en `lib` y no inline en el sheet.
 *
 * Los umbrales se escriben como literales derivados de la altura de trabajo (no
 * leyendo las constantes del módulo) para que un cambio de constante se note. */
const HEIGHT = 600;

const DISMISS_AT = 200; // umbral documentado: 1/3 de la altura

const FLICK = 900;      // velocidad documentada en px/s

function dismiss(input: Partial<Parameters<typeof shouldDismissSheet>[0]> = {}) {
  return shouldDismissSheet({ translationY: 0, velocityY: 0, height: HEIGHT, ...input });
}

describe('bottomSheet', () => {
  describe('clampSheetDrag', () => {
    it('no deja subir el sheet por encima de su posición de reposo', () => {
      expect(clampSheetDrag(-120)).toBe(0);
    });

    it('deja pasar el arrastre hacia abajo tal cual', () => {
      expect(clampSheetDrag(0)).toBe(0);
      expect(clampSheetDrag(80)).toBe(80);
    });
  });

  describe('shouldDismissSheet', () => {
    it('sin arrastre ni velocidad no cierra', () => {
      expect(dismiss()).toBe(false);
    });

    it('un arrastre corto y lento vuelve a su sitio', () => {
      expect(dismiss({ translationY: DISMISS_AT - 1 })).toBe(false);
    });

    it('justo en el umbral de distancia cierra', () => {
      expect(dismiss({ translationY: DISMISS_AT })).toBe(true);
    });

    it('un arrastre largo cierra aunque vaya lento', () => {
      expect(dismiss({ translationY: 360 })).toBe(true);
    });

    it('un flick hacia abajo por debajo del umbral no cierra por sí solo', () => {
      expect(dismiss({ translationY: 12, velocityY: FLICK - 1 })).toBe(false);
    });

    it('un flick rápido hacia abajo cierra aunque casi no se haya arrastrado', () => {
      expect(dismiss({ translationY: 12, velocityY: FLICK })).toBe(true);
      expect(dismiss({ translationY: 12, velocityY: FLICK + 300 })).toBe(true);
    });

    it('un flick decidido hacia arriba cancela aunque haya pasado el umbral', () => {
      expect(dismiss({ translationY: 480, velocityY: -FLICK })).toBe(false);
      expect(dismiss({ translationY: 480, velocityY: -FLICK - 300 })).toBe(false);
    });

    it('un flick hacia arriba suave no cancela si ya pasó el umbral', () => {
      expect(dismiss({ translationY: 480, velocityY: -100 })).toBe(true);
    });

    it('una altura sin medir no cierra por distancia', () => {
      expect(dismiss({ translationY: 500, height: 0 })).toBe(false);
    });
  });
});
