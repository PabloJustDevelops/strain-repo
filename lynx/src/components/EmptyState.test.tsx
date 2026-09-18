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
import { EmptyState } from './EmptyState';
import { Icon } from './Icon';

describe('EmptyState', () => {
  beforeEach(() => {
    resetNodes();
  });

  it('pinta el título y el cuerpo, sin hueco de icono si no se pide', () => {
    EmptyState({ title: 'Todavía no hay rutinas', body: 'Crea la primera para empezar.' });

    expect(byType(Icon)).toHaveLength(0);
    expect(byClass('EmptyIcon')).toHaveLength(0);
    expect(byType(Text).map(textOf)).toEqual([
      'Todavía no hay rutinas',
      'Crea la primera para empezar.',
    ]);
  });

  it('con icono, lo pinta arriba y del set propio', () => {
    EmptyState({ icon: 'list', title: 'Sin sesiones' });

    expect(byClass('EmptyIcon')).toHaveLength(1);
    expect(byType(Icon)[0].props.name).toBe('list');
    expect(byType(Icon)[0].props.tone).toBe('textSecondary');
  });

  it('el título es el que manda y el cuerpo es texto de lectura', () => {
    EmptyState({ title: 'Sin datos', body: 'Cuando entrenes, aparece acá.' });

    const [title, body] = byType(Text);

    expect(title.props.role).toBe('title');
    expect(body.props.role).toBe('body');
  });

  it('lleva una sola acción, y sin acción no reserva el hueco', () => {
    EmptyState({ title: 'Sin rutinas' });

    expect(byClass('EmptyAction')).toHaveLength(0);

    resetNodes();
    EmptyState({ title: 'Sin rutinas', action: <Text>Crear rutina</Text> });

    expect(byClass('EmptyAction')).toHaveLength(1);

    // La acción se captura antes que los textos del componente (JSX evalúa los
    // hijos-como-prop primero): se afirma por contenido, no por orden.
    const labels = byType(Text).map(textOf);

    expect(labels).toHaveLength(2);
    expect(labels).toContain('Sin rutinas');
    expect(labels).toContain('Crear rutina');
  });
});
