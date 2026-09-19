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
import { byClass, byType, resetNodes, textOf } from '@/test/jsxCapture';
import { SectionHeader } from './SectionHeader';

describe('SectionHeader', () => {
  beforeEach(() => {
    resetNodes();
  });

  it('pinta el título de la sección como encabezado', () => {
    SectionHeader({ title: 'Últimas sesiones' });

    const [title] = byType(Text);

    expect(byClass('SectionHeader')).toHaveLength(1);
    expect(textOf(title)).toBe('Últimas sesiones');
    expect(title.props.role).toBe('heading');
  });

  it('sin acción no reserva ningún hueco a la derecha', () => {
    SectionHeader({ title: 'Volumen semanal' });

    expect(byClass('SectionHeaderAction')).toHaveLength(0);
  });

  it('con acción la pone al lado, sin cambiar el título', () => {
    SectionHeader({ title: 'Historial', action: <Text>Cerrar</Text> });

    expect(byClass('SectionHeaderAction')).toHaveLength(1);

    // El nodo de la acción se captura antes que los del componente (JSX evalúa
    // los hijos-como-prop primero), así que se afirma por contenido, no por orden.
    const labels = byType(Text).map(textOf);

    expect(labels).toHaveLength(2);
    expect(labels).toContain('Historial');
    expect(labels).toContain('Cerrar');
  });

  it('tolera títulos largos: el título trunca a una línea', () => {
    SectionHeader({ title: 'Un título larguísimo que no debería empujar la acción' });

    const [title] = byType(Text);

    // `SectionHeaderTitle` lleva la elipsis y `maxLines` el `text-maxline` que
    // Lynx necesita para cortar de verdad.
    expect(byClass('SectionHeaderTitle')).toHaveLength(1);
    expect(title.props.maxLines).toBe(1);
  });
});
