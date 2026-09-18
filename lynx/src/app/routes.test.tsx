import { describe, expect, it, vi } from 'vitest';

/**
 * `@lynx-js/react` no se puede importar en Node (`__LEPUS__ is not defined`) y
 * este test sólo recorre el registro: no renderiza nada. Se reemplazan los hooks
 * y el runtime de JSX por stubs para poder importar las pantallas.
 */
vi.mock('@lynx-js/react', () => ({
  useState: (initial: unknown) => [initial, () => {}],
  useEffect: () => {},
  useCallback: (fn: unknown) => fn,
  useMemo: (fn: () => unknown) => fn(),
  useRef: (initial: unknown) => ({ current: initial }),
}));

vi.mock('@lynx-js/react/jsx-runtime', () => ({
  Fragment: null,
  jsx: () => null,
  jsxs: () => null,
}));

vi.mock('@lynx-js/react/jsx-dev-runtime', () => ({
  Fragment: null,
  jsxDEV: () => null,
}));

import {
  ROUTE_NAMES,
  STACK_ROUTES,
  TAB_COMPONENTS,
  TAB_LABELS,
  TAB_ROUTES,
  TABS_ROUTE,
  resolveRoute,
  tabFromParams,
} from './routes';

describe('registro de rutas (Lynx)', () => {
  it('todo nombre de ruta resuelve a un componente', () => {
    for (const name of ROUTE_NAMES) {
      expect(resolveRoute(name)).toBeTypeOf('function');
    }
  });

  it('cubre las 7 pestañas, las 4 rutas de pila y el contenedor (tabs)', () => {
    expect(TAB_ROUTES).toHaveLength(7);
    expect(STACK_ROUTES).toHaveLength(4);
    expect(ROUTE_NAMES).toHaveLength(12);
    expect(ROUTE_NAMES).toContain(TABS_ROUTE);
  });

  it('ninguna pestaña queda sin etiqueta ni sin componente', () => {
    for (const tab of TAB_ROUTES) {
      expect(TAB_LABELS[tab]).toBeTruthy();
      expect(TAB_COMPONENTS[tab]).toBeTypeOf('function');
    }
  });

  it('no hay componentes registrados fuera de ROUTE_NAMES', () => {
    for (const name of Object.keys(TAB_COMPONENTS)) {
      expect(ROUTE_NAMES).toContain(name);
    }
  });

  it('tabFromParams cae a home cuando el param no es una pestaña', () => {
    expect(tabFromParams({ tab: 'progress' })).toBe('progress');
    expect(tabFromParams({ tab: 'no-existe' })).toBe('home');
    expect(tabFromParams({})).toBe('home');
  });

  it('una ruta desconocida no resuelve a nada', () => {
    expect(resolveRoute('no/existe')).toBeUndefined();
  });
});
