import { beforeEach, describe, expect, it } from 'vitest';

import { useRouterStore } from './router';

/**
 * El router es un store de Zustand puro (sin hooks de React), así que se puede
 * ejercitar con `getState()`. `useRouter()` / `useCurrentRoute()` son sólo
 * selectores sobre este mismo estado.
 */
const stack = () => useRouterStore.getState().stack;

function resetRouter() {
  useRouterStore.setState({ stack: [{ name: '(tabs)', params: {} }] });
}

describe('router store (Lynx)', () => {
  beforeEach(resetRouter);

  it('arranca en (tabs) sin params', () => {
    expect(stack()).toEqual([{ name: '(tabs)', params: {} }]);
  });

  it('push apila con params y back desapila', () => {
    const router = useRouterStore.getState();

    router.push('exercises/[id]', { id: 'ex-1' });

    expect(stack()).toHaveLength(2);
    expect(stack()[1]).toEqual({ name: 'exercises/[id]', params: { id: 'ex-1' } });

    router.back();

    expect(stack()).toEqual([{ name: '(tabs)', params: {} }]);
  });

  it('back sobre la raíz no deja la pila vacía', () => {
    useRouterStore.getState().back();

    expect(stack()).toHaveLength(1);
  });

  it('replace sustituye el tope sin crecer la pila', () => {
    const router = useRouterStore.getState();

    router.push('workout/active');
    router.replace('workout/finish');

    expect(stack().map((route) => route.name)).toEqual(['(tabs)', 'workout/finish']);
  });

  it('reset deja una sola entrada con sus params', () => {
    const router = useRouterStore.getState();

    router.push('workout/active');
    router.reset('(tabs)', { tab: 'progress' });

    expect(stack()).toEqual([{ name: '(tabs)', params: { tab: 'progress' } }]);
  });

  it('normaliza la barra inicial de la ruta', () => {
    useRouterStore.getState().push('/workout/active');

    expect(stack()[1].name).toBe('workout/active');
  });

  it('cada entrada conserva sus propios params', () => {
    const router = useRouterStore.getState();

    router.push('exercises/[id]', { id: 'a' });
    router.push('exercises/[id]', { id: 'b' });

    expect(stack().map((route) => route.params.id)).toEqual([undefined, 'a', 'b']);
  });
});
