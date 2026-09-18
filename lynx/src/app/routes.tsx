import type { ComponentType } from '@lynx-js/react';

import { Shell } from '@components/Shell';
import { ExercisesScreen } from '@/screens/ExercisesScreen';
import { ExerciseDetailScreen } from '@/screens/ExerciseDetailScreen';
import { HealthScreen } from '@/screens/HealthScreen';
import { HistoryScreen } from '@/screens/HistoryScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { ProgressScreen } from '@/screens/ProgressScreen';
import { RoutineNewScreen } from '@/screens/RoutineNewScreen';
import { RoutinesScreen } from '@/screens/RoutinesScreen';
import { SessionDetailScreen } from '@/screens/SessionDetailScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { RoutineDetailScreen } from '@/screens/StubScreens';
import { WorkoutActiveScreen } from '@/screens/WorkoutActiveScreen';
import { WorkoutFinishScreen } from '@/screens/WorkoutFinishScreen';

/**
 * Registro de rutas de la migración a Lynx.
 *
 * Lynx no trae file-based routing, así que el nombre de ruta que guarda
 * `@lib/router` se resuelve acá contra un componente. Los nombres son los de la
 * app Expo (`app/(tabs)` y las rutas de pila) para que migrar pantallas no
 * obligue a reescribir los `push` de los llamadores.
 *
 * `(tabs)` no es una pantalla sino el contenedor: su componente es el `Shell`,
 * que pinta la pestaña activa y la tab bar.
 */

/** Parámetros de ruta, tal como los entrega `@lib/router`. */
export type RouteParams = Record<string, string>;

/** Props que recibe toda pantalla registrada. */
export interface RouteProps {
  params: RouteParams;
}

/** Nombre de la ruta contenedora de las pestañas (equivalente a `app/(tabs)`). */
export const TABS_ROUTE = '(tabs)';

/** Pestaña a la que cae `(tabs)` cuando no trae `tab` en los params. */
export const DEFAULT_TAB = 'home';

/** Las siete pestañas, con los mismos nombres que `app/(tabs)` en Expo. */
export const TAB_ROUTES = [
  'home',
  'routines',
  'exercises',
  'history',
  'progress',
  'health',
  'settings',
] as const;

export type TabRoute = (typeof TAB_ROUTES)[number];

export const TAB_LABELS: Record<TabRoute, string> = {
  home: 'Hoy',
  routines: 'Rutinas',
  exercises: 'Ejercicios',
  history: 'Historial',
  progress: 'Progreso',
  health: 'Salud',
  settings: 'Ajustes',
};

export const TAB_COMPONENTS: Record<TabRoute, ComponentType<RouteProps>> = {
  home: HomeScreen,
  routines: RoutinesScreen,
  exercises: ExercisesScreen,
  history: HistoryScreen,
  progress: ProgressScreen,
  health: HealthScreen,
  settings: SettingsScreen,
};

/** Rutas de pila: viven por encima de las pestañas. */
export const STACK_ROUTES = [
  'routines/new',
  'routines/[id]',
  'exercises/[id]',
  'history/[id]',
  'workout/active',
  'workout/finish',
] as const;

export type StackRoute = (typeof STACK_ROUTES)[number];

export const STACK_COMPONENTS: Record<StackRoute, ComponentType<RouteProps>> = {
  'routines/new': RoutineNewScreen,
  'routines/[id]': RoutineDetailScreen,
  'exercises/[id]': ExerciseDetailScreen,
  'history/[id]': SessionDetailScreen,
  'workout/active': WorkoutActiveScreen,
  'workout/finish': WorkoutFinishScreen,
};

/**
 * Título humano de cada ruta de pila, para la cabecera del `Shell`.
 *
 * El nombre de ruta (`workout/active`) es un identificador técnico: sirve para
 * el registro y los `push`, no para leerlo en pantalla. Esta tabla es la
 * traducción, en un solo sitio y con un test que exige que ninguna ruta de pila
 * se quede sin título.
 */
export const STACK_TITLES: Record<StackRoute, string> = {
  'routines/new': 'Nueva rutina',
  'routines/[id]': 'Detalle de la rutina',
  'exercises/[id]': 'Detalle del ejercicio',
  'history/[id]': 'Detalle de la sesión',
  'workout/active': 'Entrenamiento activo',
  'workout/finish': 'Resumen del entrenamiento',
};

/**
 * Título a mostrar para un nombre de ruta.
 *
 * Las pestañas usan su etiqueta (`TAB_LABELS`), las rutas de pila su título, y
 * lo que no esté en el registro cae al propio nombre: es preferible un
 * identificador crudo a una cabecera vacía.
 */
export function routeTitle(name: string): string {
  if (name === TABS_ROUTE) return TAB_LABELS[DEFAULT_TAB];

  if (name in TAB_LABELS) return TAB_LABELS[name as TabRoute];

  if (name in STACK_TITLES) return STACK_TITLES[name as StackRoute];

  return name;
}

const REGISTRY: Record<string, ComponentType<RouteProps>> = {
  ...TAB_COMPONENTS,
  ...STACK_COMPONENTS,
};

/** Todo nombre de ruta navegable. El test de rutas recorre esta lista. */
export const ROUTE_NAMES: readonly string[] = [
  TABS_ROUTE,
  ...TAB_ROUTES,
  ...STACK_ROUTES,
];

/**
 * Resuelve un nombre de ruta al componente que la pinta.
 *
 * `(tabs)` devuelve el `Shell`. Importarlo acá forma un ciclo routes ↔ Shell,
 * inofensivo porque cada lado sólo lee los datos del otro dentro del render y
 * nunca al evaluar el módulo.
 */
export function resolveRoute(name: string): ComponentType<RouteProps> | undefined {
  if (name === TABS_ROUTE) return Shell;

  return REGISTRY[name];
}

/** Pestaña activa a partir de los params de `(tabs)`, con `home` de reserva. */
export function tabFromParams(params: RouteParams): TabRoute {
  const tab = params.tab;

  return (TAB_ROUTES as readonly string[]).includes(tab) ? (tab as TabRoute) : DEFAULT_TAB;
}
