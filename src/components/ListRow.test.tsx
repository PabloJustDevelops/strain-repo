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
import { lightTheme } from '@lib/theme';
import { byClass, byType, resetNodes, textOf } from '@/test/jsxCapture';
import { Icon } from './Icon';
import { ListRow } from './ListRow';

describe('ListRow', () => {
  beforeEach(() => {
    resetNodes();
  });

  it('pinta la fila separada por línea, con título y meta', () => {
    ListRow({ title: 'Press banca', meta: 'Lunes 18 jun' });

    const [row] = byClass('ListRow');

    expect(row.type).toBe('view');
    expect(row.props.style).toMatchObject({ borderColor: lightTheme.border, opacity: 1 });
    expect(byType(Text).map(textOf)).toEqual(['Press banca', 'Lunes 18 jun']);
  });

  it('la meta es opcional: sin meta la fila sólo lleva el título', () => {
    ListRow({ title: 'Sentadilla' });

    expect(byType(Text).map(textOf)).toEqual(['Sentadilla']);
  });

  it('el título es cuerpo y la meta apoyo: la jerarquía no la elige el llamador', () => {
    ListRow({ title: 'Press banca', meta: 'ayer' });

    const [title, meta] = byType(Text);

    expect(title.props.role).toBe('body');
    expect(title.props.tone).toBe('textPrimary');
    expect(meta.props.role).toBe('support');
    expect(meta.props.tone).toBe('textSecondary');
  });

  it('tolera nombres largos: título y meta truncan a una línea, no desbordan', () => {
    ListRow({
      title: 'Sentadilla búlgara con barra alta y pausa de tres segundos',
      meta: 'Una etiqueta de apoyo bastante más larga de lo normal',
    });

    for (const node of byType(Text)) {
      expect(node.props.maxLines).toBe(1);
    }
  });

  it('el chevron sólo aparece cuando la fila navega', () => {
    ListRow({ title: 'Fila sin destino' });

    expect(byType(Icon)).toHaveLength(0);

    resetNodes();
    ListRow({ title: 'Fila con destino', chevron: true });

    expect(byType(Icon)[0].props.name).toBe('chevronRight');
  });

  it('el hueco de la izquierda se pinta sólo si hay algo que poner', () => {
    ListRow({ title: 'Con leading', leading: <Text>2x</Text> });

    expect(byClass('ListRowLeading')).toHaveLength(1);

    resetNodes();
    ListRow({ title: 'Sin leading' });

    expect(byClass('ListRowLeading')).toHaveLength(0);
  });

  it('responde al toque, con el estado pulsado enganchado a los eventos de tacto', () => {
    const onPress = vi.fn();
    ListRow({ title: 'Press banca', onPress });

    const [row] = byClass('ListRow');

    expect(row.props.bindtap).toBe(onPress);
    expect(typeof row.props.bindtouchstart).toBe('function');
    expect(typeof row.props.bindtouchend).toBe('function');
    expect(typeof row.props.bindtouchcancel).toBe('function');
    // En reposo la opacidad es la del sistema, no la del estado pulsado.
    expect(row.props.style).toMatchObject({ opacity: 1 });
  });

  it('una fila sin destino sigue siendo una fila: no rompe sin onPress', () => {
    ListRow({ title: 'Sólo lectura' });

    expect(byClass('ListRow')).toHaveLength(1);
    expect(byClass('ListRow')[0].props.bindtap).toBeUndefined();
  });
});
