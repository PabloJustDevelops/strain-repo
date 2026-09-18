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

import { Text } from '@components/Text';
import { TOUCH_TARGET, lightTheme } from '@lib/theme';
import { byClass, byType, childrenOf, render, resetNodes, textOf } from '@/test/jsxCapture';
import { SegmentedControl } from './SegmentedControl';

type Mode = 'light' | 'dark' | 'system';

const OPTIONS = [
  { value: 'light' as Mode, label: 'Claro' },
  { value: 'dark' as Mode, label: 'Oscuro' },
  { value: 'system' as Mode, label: 'Sistema' },
];

function select(value: Mode, onChange: (next: Mode) => void) {
  SegmentedControl({ options: OPTIONS, value, onChange });
}

/**
 * El arnés captura sin montar, así que los `<Segment/>` quedan como elementos
 * sueltos: hay que invocarlos para que produzcan su markup.
 */
function mountSegments() {
  const [control] = byClass('SegmentedControl');

  for (const segment of childrenOf(control)) {
    render(segment);
  }
}

describe('SegmentedControl', () => {
  beforeEach(() => {
    resetNodes();
  });

  it('pinta un segmento por opción, con su etiqueta', () => {
    select('dark', () => {});
    mountSegments();

    expect(byClass('Segment')).toHaveLength(OPTIONS.length);
    expect(byType(Text).map(textOf)).toEqual(['Claro', 'Oscuro', 'Sistema']);
  });

  it('marca el activo con el acento y su etiqueta con onAccent', () => {
    select('dark', () => {});
    mountSegments();

    const segments = byClass('Segment');

    expect(segments[0].props.style).toMatchObject({ backgroundColor: 'transparent' });
    expect(segments[1].props.style).toMatchObject({ backgroundColor: lightTheme.accent });
    expect(byClass('SegmentActive')).toHaveLength(1);

    // El estado no depende sólo del color: la etiqueta cambia de rol también.
    expect(byType(Text).map((node) => node.props.tone)).toEqual([
      'textPrimary',
      'onAccent',
      'textPrimary',
    ]);
  });

  it('cada segmento es un objetivo táctil completo', () => {
    select('light', () => {});
    mountSegments();

    for (const segment of byClass('Segment')) {
      expect(segment.props.style).toMatchObject({ minHeight: TOUCH_TARGET });
    }
  });

  it('al tocar un segmento devuelve el valor de esa opción', () => {
    const onChange = vi.fn();
    select('light', onChange);
    mountSegments();

    (byClass('Segment')[2].props.bindtap as () => void)();

    expect(onChange).toHaveBeenCalledWith('system');
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
