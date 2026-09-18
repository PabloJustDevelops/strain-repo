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
import { TOUCH_TARGET, lightTheme, radius } from '@lib/theme';
import { byClass, byType, resetNodes, textOf } from '@/test/jsxCapture';
import { PrimaryActionBar } from './PrimaryActionBar';

describe('PrimaryActionBar', () => {
  beforeEach(() => {
    resetNodes();
  });

  it('es una barra a ancho completo con una sola acción', () => {
    PrimaryActionBar({ label: 'Empezar workout', onPress: () => {} });

    expect(byClass('PrimaryActionBar')).toHaveLength(1);
    expect(byClass('PrimaryAction')).toHaveLength(1);
    expect(byType(Text).map(textOf)).toEqual(['Empezar workout']);
  });

  it('el objetivo táctil llega a 44 pt y el radio es el del control', () => {
    PrimaryActionBar({ label: 'Empezar workout', onPress: () => {} });

    expect(byClass('PrimaryAction')[0].props.style).toMatchObject({
      minHeight: TOUCH_TARGET,
      borderRadius: radius.control,
    });
    expect(TOUCH_TARGET).toBe('44px');
  });

  it('la acción primaria usa el acento y su etiqueta va sobre el acento', () => {
    PrimaryActionBar({ label: 'Guardar', onPress: () => {} });

    expect(byClass('PrimaryAction')[0].props.style).toMatchObject({
      backgroundColor: lightTheme.accent,
    });

    const [label] = byType(Text);

    expect(label.props.tone).toBe('onAccent');
    expect(label.props.role).toBe('heading');
  });

  it('la etiqueta no desborda la barra: trunca a una línea', () => {
    PrimaryActionBar({ label: 'Una acción con un nombre larguísimo', onPress: () => {} });

    expect(byType(Text)[0].props.maxLines).toBe(1);
  });

  it('responde al toque mientras está habilitada', () => {
    const onPress = vi.fn();
    PrimaryActionBar({ label: 'Guardar', onPress });

    expect(byClass('PrimaryAction')[0].props.bindtap).toBe(onPress);
  });

  it('deshabilitada no dispara y queda atenuada', () => {
    const onPress = vi.fn();
    PrimaryActionBar({ label: 'Guardar', onPress, disabled: true });

    const [action] = byClass('PrimaryAction');

    expect(action.props.bindtap).toBeUndefined();
    expect(action.props.className).toContain('PrimaryActionDisabled');
    expect(byClass('PrimaryActionBar')).toHaveLength(1);
  });
});
