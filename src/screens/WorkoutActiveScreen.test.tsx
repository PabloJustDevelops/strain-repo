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

const fixtures = vi.hoisted(() => ({
  back: vi.fn(),
  replace: vi.fn(),
  finishWorkout: vi.fn(),
  discardWorkout: vi.fn(),
  session: null as unknown,
}));

vi.mock('@lib/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: fixtures.replace,
    back: fixtures.back,
    reset: vi.fn(),
    navigate: vi.fn(),
  }),
}));

vi.mock('@stores/activeWorkoutStore', () => ({
  useActiveWorkout: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      loadActive: vi.fn(),
      completeSet: vi.fn(),
      uncompleteSet: vi.fn(),
      updateSet: vi.fn(),
      deleteSet: vi.fn(),
      addSet: vi.fn(),
      addExercise: vi.fn(),
      setSupersetGroup: vi.fn(),
      finishWorkout: fixtures.finishWorkout,
      discardWorkout: fixtures.discardWorkout,
      session: fixtures.session,
    }),
}));

vi.mock('@stores/preferencesStore', () => ({
  usePreferences: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ units: 'kg' }),
}));

import { EmptyState } from '@components/EmptyState';
import { PrimaryActionBar } from '@components/PrimaryActionBar';
import { Text } from '@components/Text';
import { byClass, byType, resetNodes, textOf } from '@/test/jsxCapture';
import { WorkoutActiveScreen } from './WorkoutActiveScreen';

/** Invoca el handler capturado y espera a que termine (los hay asíncronos). */
async function invoke(node: { props: Record<string, unknown> }, prop: string): Promise<void> {
  await (node.props[prop] as () => unknown)();
}

function exerciseFixture(id: string, completed: number, total: number) {
  return {
    id,
    name: `Ejercicio ${id}`,
    supersetGroup: null,
    sets: Array.from({ length: total }, (_, index) => ({
      id: `${id}-set-${index}`,
      setIndex: index,
      weight: 60,
      reps: 8,
      isCompleted: index < completed,
    })),
  };
}

function sessionFixture(completed: number, total: number) {
  return {
    id: 's1',
    name: 'Entrenamiento 19 sep 2026',
    startedAt: new Date(),
    completedSets: completed,
    exercises: total === 0 ? [] : [exerciseFixture('e1', completed, total)],
  };
}

describe('WorkoutActiveScreen', () => {
  beforeEach(() => {
    resetNodes();
    fixtures.back.mockClear();
    fixtures.replace.mockClear();
    fixtures.finishWorkout.mockClear();
    fixtures.discardWorkout.mockClear();
    fixtures.session = sessionFixture(0, 0);
  });

  it('sin ejercicios, el subtítulo dice «Sin series» en vez de «0 de 0»', () => {
    WorkoutActiveScreen();

    expect(byType(Text).map(textOf).some((t) => t.startsWith('Sin series'))).toBe(true);
  });

  it('con ejercicios, el subtítulo vuelve a «n de m series»', () => {
    fixtures.session = sessionFixture(2, 3);
    WorkoutActiveScreen();

    expect(byType(Text).map(textOf).some((t) => t.startsWith('2 de 3 series'))).toBe(true);
  });

  it('el título no parte en dos líneas: una sola, con elipsis si desborda', () => {
    WorkoutActiveScreen();

    const title = byType(Text).find((t) => t.props.children === 'Entrenamiento 19 sep 2026');

    expect(title?.props.maxLines).toBe(1);
    expect(String(title?.props.className)).toContain('WorkoutHeaderTitle');
  });

  it('sin series completadas, Finalizar no dispara y se ve deshabilitado', () => {
    WorkoutActiveScreen();

    const [finish] = byClass('WorkoutFinish');

    expect(finish.props.bindtap).toBeUndefined();
    expect(String(finish.props.className)).toContain('WorkoutFinishDisabled');
  });

  it('con series completadas, Finalizar cierra la sesión y va al resumen', async () => {
    fixtures.session = sessionFixture(3, 3);
    WorkoutActiveScreen();

    const [finish] = byClass('WorkoutFinish');

    expect(String(finish.props.className)).not.toContain('WorkoutFinishDisabled');

    await invoke(finish, 'bindtap');

    expect(fixtures.finishWorkout).toHaveBeenCalled();
    expect(fixtures.replace).toHaveBeenCalledWith('workout/finish');
  });

  it('añadir es la acción primaria en la barra inferior, no un FAB', () => {
    WorkoutActiveScreen();

    const [bar] = byType(PrimaryActionBar);

    expect(bar.props.label).toBe('Añadir ejercicio');
    expect(byClass('Fab')).toHaveLength(0);
  });

  it('descartar es texto discreto y el primer toque no descarta nada', async () => {
    WorkoutActiveScreen();

    expect(byType(Text).map(textOf)).toContain('Descartar entrenamiento');

    await invoke(byClass('WorkoutDiscard')[0], 'bindtap');

    expect(fixtures.discardWorkout).not.toHaveBeenCalled();
    expect(fixtures.back).not.toHaveBeenCalled();
  });

  it('sin sesión activa, el estado vacío manda a arrancar uno', () => {
    fixtures.session = null;
    WorkoutActiveScreen();

    expect(byType(EmptyState).map((e) => e.props.title)).toEqual(['No hay entrenamiento activo']);
    expect(byType(PrimaryActionBar)).toHaveLength(0);
  });
});
