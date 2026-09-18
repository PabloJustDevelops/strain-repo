import { describe, expect, it, vi } from 'vitest';

/**
 * `@lynx-js/react` no se puede cargar en Node: su runtime pide el global `lynx`
 * (backend nativo) al evaluarse. Este test sólo recorre el registro de rutas y
 * no renderiza nada, así que se reemplazan el runtime y los hooks por stubs.
 *
 * El stub tiene que cubrir también lo que usan al evaluarse los componentes de
 * `@lynx-js/lynx-ui` (`createContext` para los contextos de Button y Switch),
 * no sólo lo que usa nuestro código.
 */
vi.mock('@lynx-js/react', () => ({
  createContext: (defaultValue: unknown) => ({
    defaultValue,
    Provider: () => null,
    Consumer: () => null,
  }),
  useContext: () => ({}),
  useState: (initial: unknown) => [initial, () => {}],
  useEffect: () => {},
  useLayoutEffect: () => {},
  useCallback: (fn: unknown) => fn,
  useMemo: (fn: () => unknown) => fn(),
  useRef: (initial: unknown) => ({ current: initial }),
  useReducer: (_reducer: unknown, initial: unknown) => [initial, () => {}],
  useImperativeHandle: () => {},
  useSyncExternalStore: (subscribe: unknown) => subscribe,
  memo: (component: unknown) => component,
  forwardRef: (component: unknown) => component,
  createRef: () => ({ current: null }),
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

  it('cubre las 7 pestañas, las 5 rutas de pila y el contenedor (tabs)', () => {
    expect(TAB_ROUTES).toHaveLength(7);
    expect(STACK_ROUTES).toHaveLength(5);
    expect(ROUTE_NAMES).toHaveLength(13);
    expect(ROUTE_NAMES).toContain(TABS_ROUTE);
  });

  it('el flujo de entrenamiento ya no resuelve a los stubs', () => {
    const stub = resolveRoute('routines/[id]');

    for (const name of ['workout/active', 'workout/finish', 'exercises/[id]', 'history/[id]']) {
      expect(resolveRoute(name)).not.toBe(stub);
    }

    expect(resolveRoute('history/[id]')).toBeTypeOf('function');
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
