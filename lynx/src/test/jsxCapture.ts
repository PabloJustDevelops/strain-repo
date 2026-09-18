import { lightTheme } from '@lib/theme';

/**
 * Arnés de render para los tests de componentes.
 *
 * El runtime de ReactLynx no carga en Node (pide el global `lynx`), y el repo no
 * trae un renderer. Así que los tests reemplazan el runtime de JSX por uno que
 * **captura** cada elemento creado, en plano: como los hijos se crean antes que
 * los padres, al final de un render están todos. Con eso se puede afirmar sobre
 * el árbol que el componente **escribió** —tipos, props, clases— sin montarlo.
 *
 * Los `vi.mock` de cada archivo de test devuelven estos objetos; por eso viven
 * acá y no en cada test: así el arnés es uno solo y los tests se leen cortos.
 */

/** Un elemento tal como lo produce el runtime de JSX: tipo + props. */
export interface CapturedNode {
  type: unknown;
  props: Record<string, unknown>;
}

const captured: CapturedNode[] = [];

function record(type: unknown, props: Record<string, unknown> | null): CapturedNode {
  const node: CapturedNode = { type, props: props ?? {} };
  captured.push(node);

  return node;
}

const FRAGMENT = 'Fragment';

/** El runtime de `@lynx-js/react/jsx-runtime` (producción). */
export const jsxRuntimeMock = { Fragment: FRAGMENT, jsx: record, jsxs: record };

/** El runtime de `@lynx-js/react/jsx-dev-runtime` (los tests corren en dev). */
export const jsxDevRuntimeMock = { Fragment: FRAGMENT, jsxDEV: record };

/** Lo que los componentes usan del runtime de ReactLynx, sin el nativo detrás. */
export const reactRuntimeMock = {
  createContext: (defaultValue: unknown) => ({
    defaultValue,
    Provider: () => null,
    Consumer: () => null,
  }),
  useContext: () => ({}),
  // Al llamar a un componente a mano no hay re-render, así que un `useState`
  // inmóvil (valor inicial + setter no-op) es suficiente: el estado pulsado se
  // verifica aparte, sobre la receta pura `pressedStyle()`.
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
};

/**
 * El tema, fijo en claro.
 *
 * Los componentes piden `useTheme()`, que en la app lee un store de zustand y
 * fuera de un render no se puede llamar. Acá se fija el tema claro real (no un
 * objeto inventado) para que las afirmaciones sobre colores sean sobre los
 * tokens de verdad.
 */
export const themeMock = {
  useTheme: () => ({ colors: lightTheme, isDark: false }),
};

/** Todo lo capturado desde el último `resetNodes()`. */
export function nodes(): readonly CapturedNode[] {
  return captured;
}

/** Vacía la captura. Va en un `beforeEach`, para que un test no vea el anterior. */
export function resetNodes(): void {
  captured.length = 0;
}

/** Los nodos cuya `className` incluye la clase pedida (token exacto). */
export function byClass(className: string): CapturedNode[] {
  return captured.filter((node) => {
    const value = node.props.className;

    return typeof value === 'string' && value.split(/\s+/).includes(className);
  });
}

/** Los nodos de un tipo: un elemento (`'view'`) o un componente (`Text`). */
export function byType(type: unknown): CapturedNode[] {
  return captured.filter((node) => node.type === type);
}

/** El texto de un nodo, tal como lo vería un `<text>`. */
export function textOf(node: CapturedNode): string {
  return String(node.props.children ?? '');
}

function isNode(value: unknown): value is CapturedNode {
  return typeof value === 'object' && value !== null && 'type' in value && 'props' in value;
}

/**
 * Los hijos directos de un nodo, como lista.
 *
 * Sale de `props.children`, así que sirve para leer lo que un componente
 * devolvió sin recorrer toda la captura.
 */
export function childrenOf(node: CapturedNode): CapturedNode[] {
  const children = node.props.children;

  return (Array.isArray(children) ? children : [children]).filter(isNode);
}

/**
 * Invoca un nodo de componente para que produzca sus propios nodos.
 *
 * El arnés captura sin montar, así que un hijo (`<Segment/>`) queda como
 * elemento suelto: su cuerpo —y por lo tanto su markup— sólo existe si se lo
 * llama. Los elementos nativos (`view`, `text`) no son funciones y se ignoran.
 */
export function render(node: CapturedNode): void {
  if (typeof node.type === 'function') {
    (node.type as (props: Record<string, unknown>) => unknown)(node.props);
  }
}
