import { create } from 'zustand';

/**
 * Router mínimo para Lynx, con la API que las pantallas esperan de expo-router
 * (`useRouter().push/back/replace`, `useLocalSearchParams`, `usePathname`).
 *
 * Lynx no trae file-based routing: cada "pantalla" es un componente registrado
 * por nombre de ruta, y este store mantiene la pila de navegación + params.
 * Las rutas se declaran en `src/app/routes.tsx`.
 */

export interface RouteState {
  /** Nombre de la ruta, ej. 'home', 'routines/[id]', 'workout/active'. */
  name: string;
  /** Parámetros de la ruta (ej. `{ id: '...' }`). */
  params: Record<string, string>;
}

interface RouterState {
  stack: RouteState[];
  push: (route: string, params?: Record<string, string>) => void;
  replace: (route: string, params?: Record<string, string>) => void;
  back: () => void;
  /** Reinicia la pila a una ruta raíz (tras login, finish workout, etc.). */
  reset: (route: string, params?: Record<string, string>) => void;
}

/** Normaliza `/routines/123` o `routines/[id]`+params a un RouteState. */
function toRouteState(route: string, params: Record<string, string> = {}): RouteState {
  const clean = route.replace(/^\//, '');
  return { name: clean, params };
}

const ROOT: RouteState = { name: '(tabs)', params: {} };

export const useRouterStore = create<RouterState>((set) => ({
  stack: [ROOT],
  push: (route, params) =>
    set((s) => ({ stack: [...s.stack, toRouteState(route, params)] })),
  replace: (route, params) =>
    set((s) => ({ stack: [...s.stack.slice(0, -1), toRouteState(route, params)] })),
  back: () => set((s) => ({ stack: s.stack.length > 1 ? s.stack.slice(0, -1) : s.stack })),
  reset: (route, params) => set({ stack: [toRouteState(route, params)] }),
}));

/** API compatible con `useRouter()` de expo-router. */
export function useRouter() {
  const push = useRouterStore((s) => s.push);
  const replace = useRouterStore((s) => s.replace);
  const back = useRouterStore((s) => s.back);
  const reset = useRouterStore((s) => s.reset);
  return {
    push: (route: string, params?: Record<string, string>) => push(route, params),
    replace: (route: string, params?: Record<string, string>) => replace(route, params),
    back,
    reset,
    /** expo-router permite `router.push({ pathname, params })`. */
    navigate: (route: string, params?: Record<string, string>) => push(route, params),
  };
}

/** Ruta actual (tope de la pila). */
export function useCurrentRoute(): RouteState {
  return useRouterStore((s) => s.stack[s.stack.length - 1]);
}

/** Params de la ruta actual, equivalente a `useLocalSearchParams()`. */
export function useLocalSearchParams<T extends Record<string, string> = Record<string, string>>(): T {
  return useRouterStore((s) => s.stack[s.stack.length - 1].params) as T;
}

/** Pathname de la ruta actual, equivalente a `usePathname()`. */
export function usePathname(): string {
  return useRouterStore((s) => '/' + s.stack[s.stack.length - 1].name);
}

/** Navega a una pestaña raíz y la deja como única entrada. */
export function useTabs() {
  const reset = useRouterStore((s) => s.reset);
  return { goToTab: (tab: string) => reset('(tabs)', { tab }) };
}
