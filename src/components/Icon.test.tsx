import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@lynx-js/react', async () => {
  const { reactRuntimeMock } = await import('@/test/jsxCapture');

  return reactRuntimeMock;
});

vi.mock('@lynx-js/react/jsx-runtime', async () => {
  const { jsxRuntimeMock } = await import('@/test/jsxCapture');

  return jsxRuntimeMock;
});

vi.mock('@lynx-js/react/jsx-dev-runtime', async () => {
  const { jsxDevRuntimeMock } = await import('@/test/jsxCapture');

  return jsxDevRuntimeMock;
});

vi.mock('@lib/useTheme', async () => {
  const { themeMock } = await import('@/test/jsxCapture');

  return themeMock;
});

import { lightTheme } from '@lib/theme';
import { byType, resetNodes } from '@/test/jsxCapture';
import { ICON_NAMES, ICON_STROKE, ICON_VIEWBOX, Icon, iconSvg } from './Icon';

/**
 * El set de iconos es la respuesta a los glifos de texto (`‹`, `✓`, `⋯`): acá se
 * fija que todos los nombres dibujan algo, con el mismo trazo, y que ninguno
 * mete un carácter que no sea del documento SVG.
 */
describe('iconSvg', () => {
  it('dibuja todos los nombres del set en la caja de 24, con trazo de 2', () => {
    for (const name of ICON_NAMES) {
      const svg = iconSvg(name);

      expect(svg, name).toMatch(/^<svg /);
      expect(svg, name).toContain(`viewBox="0 0 ${ICON_VIEWBOX} ${ICON_VIEWBOX}"`);
      expect(svg, name).toContain(`stroke-width="${ICON_STROKE}"`);
      expect(svg, name).toContain('stroke="currentColor"');
      expect(svg, name).toContain('</svg>');
    }
  });

  it('no dibuja emojis ni glifos de texto: el documento es sólo ASCII', () => {
    for (const name of ICON_NAMES) {
      expect(iconSvg(name), name).toMatch(/^[\x20-\x7e]+$/);
    }
  });

  it('cada icono trae su propio trazado, y todos trazan algo', () => {
    const documents = ICON_NAMES.map((name) => iconSvg(name));

    for (const [index, svg] of documents.entries()) {
      const inner = svg.slice(svg.indexOf('>') + 1, svg.lastIndexOf('</svg>'));

      expect(inner.length, ICON_NAMES[index]).toBeGreaterThan(0);
    }

    expect(new Set(documents).size).toBe(documents.length);
  });
});

describe('Icon', () => {
  beforeEach(() => {
    resetNodes();
  });

  it('pinta el documento del nombre pedido, con el color del rol', () => {
    Icon({ name: 'check', tone: 'success' });

    const [svg] = byType('svg');

    expect(svg.type).toBe('svg');
    expect(svg.props.content).toBe(iconSvg('check'));
    expect(svg.props['current-color']).toBe(lightTheme.success);
  });

  it('el tamaño sale en pt y nunca como número suelto', () => {
    Icon({ name: 'clock', size: 20 });

    expect(byType('svg')[0].props.style).toEqual({ width: '20px', height: '20px' });
  });

  it('con el tamaño por defecto usa la caja del set', () => {
    Icon({ name: 'list' });

    expect(byType('svg')[0].props.style).toEqual({
      width: `${ICON_VIEWBOX}px`,
      height: `${ICON_VIEWBOX}px`,
    });
  });

  it('por defecto el trazo es el color de apoyo, no el principal', () => {
    Icon({ name: 'dumbbell' });

    expect(byType('svg')[0].props['current-color']).toBe(lightTheme.textSecondary);
  });
});

describe('cobertura del set', () => {
  it('están los iconos que usan las pestañas, la navegación y las acciones', () => {
    const required = [
      'chevron',
      'chevronRight',
      'plus',
      'check',
      'clock',
      'streak',
      'list',
      'dumbbell',
      'chart',
      'settings',
    ];

    for (const name of required) {
      expect(ICON_NAMES).toContain(name);
    }
  });
});
