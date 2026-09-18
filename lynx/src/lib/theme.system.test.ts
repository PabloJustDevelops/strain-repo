import { describe, expect, it } from 'vitest';

import {
  BORDER_WIDTH,
  TOUCH_TARGET,
  TYPE_SCALE,
  darkTheme,
  lightTheme,
  motion,
  radius,
  space,
  type,
  typeStyle,
  type ThemeColors,
  type TypeRole,
} from './theme';

/**
 * Invariantes del sistema de diseño.
 *
 * Estos tests son la parte "medible" del sistema: si alguien cambia un token y
 * rompe el contraste, la escala o el ritmo, acá salta. El contraste se calcula
 * con la fórmula de WCAG 2.1 (luminancia relativa), la misma que usan las
 * herramientas de auditoría.
 */

function channelLuminance(value: number): number {
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => Number.parseInt(clean.slice(i, i + 2), 16) / 255);

  return (
    0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b)
  );
}

/** Ratio de contraste entre dos colores, siempre ≥1. */
export function contrastRatio(a: string, b: string): number {
  const [high, low] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);

  return (high + 0.05) / (low + 0.05);
}

/** Pares texto/fondo que la app usa de verdad. */
const TEXT_PAIRS: [keyof ThemeColors, keyof ThemeColors][] = [
  ['textPrimary', 'bg'],
  ['textPrimary', 'surface'],
  ['textPrimary', 'surfaceRaised'],
  ['textPrimary', 'accentSoft'],
  ['textSecondary', 'bg'],
  ['textSecondary', 'surface'],
  ['textSecondary', 'surfaceRaised'],
  ['accent', 'bg'],
  ['accent', 'surface'],
  ['accent', 'accentSoft'],
  ['onAccent', 'accent'],
  ['success', 'surface'],
  ['warning', 'surface'],
  ['danger', 'surface'],
];

/** Bordes significativos: el `line` contra cada superficie del sistema. */
const LINE_PAIRS: [keyof ThemeColors, keyof ThemeColors][] = [
  ['line', 'bg'],
  ['line', 'surface'],
  ['line', 'surfaceRaised'],
];

describe.each([
  ['claro', lightTheme],
  ['oscuro', darkTheme],
])('tema %s', (_name, theme) => {
  it('todo texto llega a 4.5:1 sobre el fondo en el que se usa', () => {
    for (const [fg, bg] of TEXT_PAIRS) {
      const ratio = contrastRatio(theme[fg], theme[bg]);

      expect(ratio, `${fg} sobre ${bg} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('el borde del sistema llega a 3:1 sobre cada superficie', () => {
    for (const [fg, bg] of LINE_PAIRS) {
      const ratio = contrastRatio(theme[fg], theme[bg]);

      expect(ratio, `${fg} sobre ${bg} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
    }
  });

  it('tiene los doce roles de color, todos en hex de 6 dígitos', () => {
    const roles: (keyof ThemeColors)[] = [
      'bg',
      'surface',
      'surfaceRaised',
      'line',
      'textPrimary',
      'textSecondary',
      'textInverse',
      'accent',
      'accentSoft',
      'onAccent',
      'success',
      'warning',
      'danger',
    ];

    for (const role of roles) {
      expect(theme[role], role).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('los neutros del tema oscuro están tintados, no son gris puro', () => {
    for (const role of ['bg', 'surface', 'surfaceRaised'] as const) {
      const clean = darkTheme[role].replace('#', '');
      const [r, g, b] = [0, 2, 4].map((i) => Number.parseInt(clean.slice(i, i + 2), 16));

      // El azul por encima del rojo es el croma mínimo hacia la marca; un gris
      // puro tendría los tres canales iguales.
      expect(b, `${role} debería tirar a azul`).toBeGreaterThan(r);
      expect(b).toBeGreaterThan(g);
    }
  });
});

describe('escala tipográfica', () => {
  it('son cinco pasos, de 13 a 28', () => {
    expect(TYPE_SCALE).toEqual([13, 15, 17, 22, 28]);
    expect(Object.keys(type)).toHaveLength(TYPE_SCALE.length);
    expect(Object.values(type).map((t) => t.fontSize)).toEqual([...TYPE_SCALE]);
  });

  it('cada paso define línea y peso', () => {
    for (const [role, token] of Object.entries(type)) {
      expect(token.lineHeight, role).toBeGreaterThan(token.fontSize);
      expect(token.fontWeight, role).toMatch(/^[4-9]00$/);
    }
  });

  it('en oscuro sube el interlineado y baja un escalón el peso', () => {
    for (const role of Object.keys(type) as TypeRole[]) {
      const light = typeStyle(role, false);
      const dark = typeStyle(role, true);

      expect(dark.fontSize).toBe(light.fontSize);
      expect(dark.lineHeight).toBe(light.lineHeight + 2);
      // El cuerpo ya está en el suelo del escalón (400): nunca adelgaza de ahí.
      expect(Number(dark.fontWeight)).toBeLessThanOrEqual(Number(light.fontWeight));
    }

    // Un paso por encima del cuerpo sí baja de verdad.
    expect(typeStyle('title', true).fontWeight).toBe('500');
    expect(typeStyle('display', true).fontWeight).toBe('700');
  });
});

describe('ritmo de espaciado, radios, borde y movimiento', () => {
  it('el espaciado sólo usa 4, 8, 16 y 36', () => {
    expect(Object.values(space)).toEqual([4, 8, 16, 36]);
  });

  it('hay tres radios: chip, control y tarjeta', () => {
    expect(Object.keys(radius)).toEqual(['chip', 'control', 'card']);
    expect(radius.chip).toBe(999);
  });

  it('el borde es uno sólo, de 1px, y el área táctil mínima es 44', () => {
    expect(BORDER_WIDTH).toBe(1);
    expect(TOUCH_TARGET).toBe(44);
  });

  it('el movimiento tiene tres duraciones crecientes y una sola curva', () => {
    expect(motion.fast).toBeLessThan(motion.base);
    expect(motion.base).toBeLessThan(motion.slow);
    expect(motion.easing).toMatch(/^cubic-bezier\(/);
  });
});
