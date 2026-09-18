import { describe, expect, it } from 'vitest';

import {
  BORDER_WIDTH,
  TOUCH_TARGET,
  TYPE_SCALE,
  darkTheme,
  lightTheme,
  motion,
  pressedStyle,
  px,
  radius,
  space,
  type,
  typeStyle,
  type ThemeColors,
  type TypeRole,
} from './theme';

/**
 * Invariantes del sistema de diseño v2.
 *
 * Estos tests son la parte "medible" del sistema: si alguien cambia un token y
 * rompe el contraste, la escala, el ritmo o el estado pulsado, acá salta. El
 * contraste se calcula con la fórmula de WCAG 2.1 (luminancia relativa), la
 * misma que usan las herramientas de auditoría.
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
  ['onAccent', 'accent'],
  ['success', 'surface'],
  ['warn', 'surface'],
  ['danger', 'surface'],
];

/** El borde del sistema, contra cada superficie sobre la que se dibuja. */
const BORDER_PAIRS: [keyof ThemeColors, keyof ThemeColors][] = [
  ['border', 'bg'],
  ['border', 'surface'],
  ['border', 'surfaceRaised'],
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

  /**
   * El borde de la v2 es una línea **sutil**: agrupa sin encerrar. Deliberadamente
   * baja del 3:1 que pide un borde significativo de la WCAG, así que lo que este
   * test fija es el rango: por encima de 1.15 se ve, y por debajo de 2.5 sigue
   * siendo una línea y no vuelve a ser el borde duro que la v2 abandona.
   */
  it('el borde se ve pero no vuelve a ser un borde duro', () => {
    for (const [fg, bg] of BORDER_PAIRS) {
      const ratio = contrastRatio(theme[fg], theme[bg]);

      expect(ratio, `${fg} sobre ${bg} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(1.15);
      expect(ratio, `${fg} sobre ${bg} = ${ratio.toFixed(2)}:1`).toBeLessThanOrEqual(2.5);
    }
  });

  it('todos los roles de color son hex de 6 dígitos, y los dos temas tienen los mismos', () => {
    for (const [role, value] of Object.entries(theme)) {
      expect(value, role).toMatch(/^#[0-9a-f]{6}$/i);
    }

    expect(Object.keys(lightTheme).sort()).toEqual(Object.keys(darkTheme).sort());
  });

  it('los alias de compatibilidad no se despegan de los roles v2', () => {
    expect(theme.line).toBe(theme.border);
    expect(theme.warning).toBe(theme.warn);
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
  it('son seis pasos, de 12 a 34, en orden ascendente', () => {
    expect(TYPE_SCALE).toEqual([12, 14, 16, 18, 22, 34]);
    expect(Object.keys(type)).toHaveLength(TYPE_SCALE.length);
    expect(Object.values(type).map((t) => t.fontSize)).toEqual([...TYPE_SCALE]);
  });

  it('tiene los seis roles con nombre propio, incluido el cuerpo', () => {
    expect(Object.keys(type)).toEqual(['detail', 'support', 'body', 'heading', 'title', 'display']);
  });

  it('cada paso define línea y peso', () => {
    for (const [role, token] of Object.entries(type)) {
      expect(token.lineHeight, role).toBeGreaterThan(token.fontSize);
      expect(token.fontWeight, role).toMatch(/^[4-9]00$/);
    }
  });

  it('los pesos y las líneas son los de la especificación v2', () => {
    expect(type.display).toMatchObject({ fontSize: 34, lineHeight: 40, fontWeight: '700' });
    expect(type.title).toMatchObject({ fontSize: 22, lineHeight: 28, fontWeight: '600' });
    expect(type.heading).toMatchObject({ fontSize: 18, lineHeight: 24, fontWeight: '600' });
    expect(type.body).toMatchObject({ fontSize: 16, lineHeight: 24, fontWeight: '400' });
    expect(type.support).toMatchObject({ fontSize: 14, lineHeight: 20, fontWeight: '400' });
    expect(type.detail).toMatchObject({ fontSize: 12, lineHeight: 16, fontWeight: '500' });
  });

  it('en oscuro sube el interlineado y baja un escalón el peso', () => {
    for (const role of Object.keys(type) as TypeRole[]) {
      const light = typeStyle(role, false);
      const dark = typeStyle(role, true);

      expect(dark.fontSize).toBe(light.fontSize);
      expect(dark.lineHeight).toBe(px(type[role].lineHeight + 2));
      // El cuerpo ya está en el suelo del escalón (400): nunca adelgaza de ahí.
      expect(Number(dark.fontWeight)).toBeLessThanOrEqual(Number(light.fontWeight));
    }

    // Un paso por encima del cuerpo sí baja de verdad.
    expect(typeStyle('title', true).fontWeight).toBe('500');
    expect(typeStyle('display', true).fontWeight).toBe('600');
  });
});

describe('ritmo de espaciado, radios, borde y movimiento', () => {
  it('el espaciado sólo usa 4, 8, 16, 24 y 36, ya serializados', () => {
    expect(Object.values(space)).toEqual(['4px', '8px', '16px', '24px', '36px']);
  });

  it('hay tres radios: control, contenedor y píldora', () => {
    expect(Object.keys(radius)).toEqual(['control', 'container', 'pill']);
    expect(radius.control).toBe('8px');
    expect(radius.container).toBe('12px');
    expect(radius.pill).toBe('999px');
  });

  it('el borde es uno sólo, de 1px, y el área táctil mínima es 44', () => {
    expect(BORDER_WIDTH).toBe('1px');
    expect(TOUCH_TARGET).toBe('44px');
  });

  it('el movimiento tiene duraciones crecientes y una sola curva', () => {
    expect(motion.fast).toBeLessThan(motion.base);
    expect(motion.easing).toMatch(/^cubic-bezier\(/);
  });

  it('el estado pulsado baja la opacidad y encoge apenas, sin mover el layout', () => {
    expect(motion.pressed.opacity).toBe(0.6);
    expect(motion.pressed.scale).toBe(0.98);

    expect(pressedStyle(true)).toEqual({ opacity: 0.6, transform: 'scale(0.98)' });
    expect(pressedStyle(false)).toEqual({ opacity: 1, transform: 'scale(1)' });
  });
});

/**
 * Guarda contra la reincidencia del bug de Fase 4: el motor de Lynx rechaza
 * cualquier longitud distinta de 0 sin unidad, también en los estilos inline
 * (`CSS length need units (except 0)`). Todo token de longitud se exporta ya
 * serializado y `typeStyle()` serializa la escala tipográfica, así que ningún
 * número suelto puede llegar a un `style={{...}}`.
 */
describe('longitudes con unidad', () => {
  /** Una longitud que el motor acepta: `0` desnudo o un número con `px`. */
  const LENGTH = /^(?:0|-?\d+(?:\.\d+)?px)$/;

  it('px serializa con unidad, salvo el cero', () => {
    expect(px(0)).toBe('0');
    expect(px(1)).toBe('1px');
    expect(px(13)).toBe('13px');
    expect(px(-4)).toBe('-4px');
    expect(px(2.5)).toBe('2.5px');
  });

  it('ningún token de longitud sale como número suelto', () => {
    const tokens = [
      ...Object.entries(space),
      ...Object.entries(radius),
      ['BORDER_WIDTH', BORDER_WIDTH] as const,
      ['TOUCH_TARGET', TOUCH_TARGET] as const,
    ];

    for (const [name, value] of tokens) {
      expect(typeof value, name).toBe('string');
      expect(value, name).toMatch(LENGTH);
    }
  });

  it('la escala tipográfica son medidas crudas: el borde al motor es typeStyle', () => {
    for (const token of Object.values(type)) {
      expect(typeof token.fontSize).toBe('number');
      expect(typeof token.lineHeight).toBe('number');
    }

    for (const role of Object.keys(type) as TypeRole[]) {
      for (const isDark of [false, true]) {
        const style = typeStyle(role, isDark);
        const where = `${role} (${isDark ? 'oscuro' : 'claro'})`;

        expect(style.fontSize, where).toMatch(LENGTH);
        expect(style.lineHeight, where).toMatch(LENGTH);
      }
    }
  });
});
