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
import { lightTheme, radius } from '@lib/theme';
import { byClass, byType, resetNodes, textOf } from '@/test/jsxCapture';
import { Chip } from './Chip';

describe('Chip', () => {
  beforeEach(() => {
    resetNodes();
  });

  it('es una píldora con su etiqueta', () => {
    Chip({ label: 'Pecho', onPress: () => {} });

    expect(byClass('Chip')).toHaveLength(1);
    expect(byClass('Chip')[0].props.style).toMatchObject({ borderRadius: radius.pill });
    expect(byType(Text).map(textOf)).toEqual(['Pecho']);
  });

  it('sin seleccionar es superficie con borde, no un relleno de acento', () => {
    Chip({ label: 'Pecho', onPress: () => {} });

    const [chip] = byClass('Chip');

    expect(chip.props.style).toMatchObject({
      backgroundColor: lightTheme.surface,
      borderColor: lightTheme.border,
    });
    expect(byClass('ChipActive')).toHaveLength(0);
    expect(byType(Text)[0].props.tone).toBe('textPrimary');
  });

  it('seleccionado se rellena de acento y su etiqueta pasa a onAccent', () => {
    Chip({ label: 'Pecho', active: true, onPress: () => {} });

    const [chip] = byClass('Chip');

    expect(chip.props.style).toMatchObject({ backgroundColor: lightTheme.accent });
    expect(byClass('ChipActive')).toHaveLength(1);
    // El estado no depende sólo del color: la etiqueta cambia de rol también.
    expect(byType(Text)[0].props.tone).toBe('onAccent');
  });

  it('avisa del toque y marca el estado pulsado', () => {
    const onPress = vi.fn();
    Chip({ label: 'Pecho', onPress });

    const [chip] = byClass('Chip');

    expect(chip.props.bindtap).toBe(onPress);
    expect(chip.props.style).toMatchObject({ opacity: 1 });
    expect(typeof chip.props.bindtouchstart).toBe('function');
  });
});
