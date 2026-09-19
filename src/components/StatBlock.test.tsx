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
import { byType, resetNodes, textOf } from '@/test/jsxCapture';
import { StatBlock } from './StatBlock';

describe('StatBlock', () => {
  beforeEach(() => {
    resetNodes();
  });

  it('separa etiqueta, valor y unidad en sus propios textos', () => {
    StatBlock({ label: 'Volumen', value: '1.240', unit: 'kg' });

    expect(byType(Text).map(textOf)).toEqual(['Volumen', '1.240', 'kg']);
  });

  it('la etiqueta es detalle y el valor es título: la cifra manda', () => {
    StatBlock({ label: 'Series', value: '18' });

    const [label, value] = byType(Text);

    expect(label.props.role).toBe('detail');
    expect(label.props.tone).toBe('textSecondary');
    expect(value.props.role).toBe('title');
    expect(value.props.tone).toBe('textPrimary');
  });

  it('sin unidad no deja un hueco vacío', () => {
    StatBlock({ label: 'Series', value: '18' });

    expect(byType(Text)).toHaveLength(2);
  });

  it('la unidad tiene rol propio, no va pegada al número', () => {
    StatBlock({ label: 'Duración', value: '48:00', unit: 'min' });

    const unit = byType(Text)[2];

    expect(unit.props.role).toBe('support');
    expect(unit.props.tone).toBe('textSecondary');
  });
});
