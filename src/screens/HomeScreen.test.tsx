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
  push: vi.fn(),
  goToTab: vi.fn(),
  startEmpty: vi.fn(),
  streak: 0,
  sessions: [] as unknown[],
  routines: [] as unknown[],
  activeSession: null as unknown,
}));

vi.mock('@lib/router', () => ({
  useRouter: () => ({
    push: fixtures.push,
    replace: vi.fn(),
    back: vi.fn(),
    reset: vi.fn(),
    navigate: vi.fn(),
  }),
  useTabs: () => ({ goToTab: fixtures.goToTab }),
}));

// El arnés no monta: el loader se ejecuta aquí y ya, con los repos de prueba
// devolviendo valores en plano, `data` lleva lo que la pantalla pidió.
vi.mock('@lib/useLoad', () => ({
  useLoad: (initial: unknown, load: () => unknown) => ({
    loading: false,
    data: load() ?? initial,
    error: null,
  }),
}));

vi.mock('@db', () => ({
  getRepos: () => ({
    analytics: { currentStreak: () => fixtures.streak },
    sessions: { list: () => fixtures.sessions },
    routines: { list: () => fixtures.routines },
  }),
}));

vi.mock('@stores/activeWorkoutStore', () => ({
  useActiveWorkout: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      session: fixtures.activeSession,
      loadActive: vi.fn(),
      startEmpty: fixtures.startEmpty,
    }),
}));

vi.mock('@stores/preferencesStore', () => ({
  usePreferences: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ units: 'kg' }),
}));

import { Button } from '@components/Button';
import { ListRow } from '@components/ListRow';
import { SectionHeader } from '@components/SectionHeader';
import { StatBlock } from '@components/StatBlock';
import { Text } from '@components/Text';
import { formatDateLong } from '@lib/format';
import { lightTheme } from '@lib/theme';
import { byClass, byType, resetNodes, textOf } from '@/test/jsxCapture';
import { HomeScreen } from './HomeScreen';

const DAY_MS = 24 * 60 * 60 * 1000;

function sessionFixture(id: string, daysAgo: number, totalSets: number, totalVolume: number) {
  return {
    id,
    name: `Entrenamiento ${id}`,
    startedAt: new Date(Date.now() - daysAgo * DAY_MS),
    totalSets,
    totalVolume,
  };
}

function routineFixture(id: string, name: string, description: string | null) {
  return { id, name, description };
}

/** Invoca el handler capturado y espera a que termine (los hay asíncronos). */
async function invoke(node: { props: Record<string, unknown> }, prop: string): Promise<void> {
  await (node.props[prop] as () => unknown)();
}

describe('HomeScreen', () => {
  beforeEach(() => {
    resetNodes();
    fixtures.push.mockClear();
    fixtures.goToTab.mockClear();
    fixtures.startEmpty.mockClear();
    fixtures.streak = 3;
    fixtures.sessions = [];
    fixtures.routines = [];
    fixtures.activeSession = null;
  });

  it('sin tarjetas: el bloque de acción va a sangre, sin Card', () => {
    HomeScreen();

    expect(byClass('Card')).toHaveLength(0);
    expect(byType(Text).map(textOf)).toContain('Empieza un entrenamiento');
  });

  it('una sola acción primaria («Entrenamiento vacío») y una secundaria («Elegir rutina»)', () => {
    HomeScreen();

    const buttons = byType(Button);

    expect(buttons.map((b) => b.props.title)).toEqual(['Entrenamiento vacío', 'Elegir rutina']);
    expect(buttons[0].props.variant).toBeUndefined();
    expect(buttons[1].props.variant).toBe('secondary');
  });

  it('«Entrenamiento vacío» arranca la sesión y lleva al workout activo', async () => {
    HomeScreen();

    const [primary] = byType(Button);

    await invoke(primary, 'onPress');

    expect(fixtures.startEmpty).toHaveBeenCalledWith(
      `Entrenamiento ${formatDateLong(new Date())}`,
    );
    expect(fixtures.push).toHaveBeenCalledWith('workout/active');
  });

  it('«Elegir rutina» navega a la pestaña rutinas', async () => {
    HomeScreen();

    const [, secondary] = byType(Button);

    await invoke(secondary, 'onPress');

    expect(fixtures.goToTab).toHaveBeenCalledWith('routines');
  });

  it('la navegación no se duplica: nada de «Acciones rápidas», Biblioteca ni Progreso', () => {
    HomeScreen();

    const texts = byType(Text).map(textOf);

    expect(texts).not.toContain('Acciones rápidas');
    expect(texts).not.toContain('Biblioteca');
    expect(texts).not.toContain('Progreso');
    expect(byType(Button)).toHaveLength(2);
  });

  it('la racha es una cifra de una fila, no un número display protagonista', () => {
    HomeScreen();

    const stats = byType(StatBlock);

    expect(stats.map((s) => s.props.label)).toEqual(['Racha', 'Esta semana']);
    expect(stats[0].props.value).toBe('3');
    expect(stats[0].props.unit).toBe('días');
    expect(byType(Text).filter((t) => t.props.role === 'display')).toHaveLength(0);
  });

  it('«Esta semana» cuenta las sesiones de los últimos 7 días', () => {
    fixtures.sessions = [
      sessionFixture('a', 0, 12, 4321.6),
      sessionFixture('b', 2, 10, 3000),
      sessionFixture('c', 5, 8, 2500),
      sessionFixture('d', 20, 6, 1800),
    ];
    HomeScreen();

    expect(byType(StatBlock)[1].props.value).toBe('3');
  });

  it('los últimos entrenos son filas navegables al detalle, con fecha, series y volumen', async () => {
    fixtures.sessions = [
      sessionFixture('a', 0, 12, 4321.6),
      sessionFixture('b', 2, 10, 3000),
      sessionFixture('c', 5, 8, 2500),
      sessionFixture('d', 20, 6, 1800),
    ];
    HomeScreen();

    const rows = byType(ListRow);

    expect(rows).toHaveLength(3);
    expect(rows[0].props.title).toBe('Entrenamiento a');
    expect(rows[0].props.meta).toContain('· 12 series · 4.322 kg');
    expect(rows[0].props.chevron).toBe(true);

    await invoke(rows[0], 'onPress');

    expect(fixtures.push).toHaveBeenCalledWith('history/[id]', { id: 'a' });
  });

  it('sin historial, una línea y ninguna fila', () => {
    HomeScreen();

    expect(byType(ListRow)).toHaveLength(0);
    expect(byType(Text).map(textOf)).toContain('Aún no hay entrenos');
    expect(byType(SectionHeader).map((h) => h.props.title)).toEqual(['Últimos entrenos']);
  });

  it('con rutinas, las tres primeras son filas que llevan a su detalle', async () => {
    fixtures.routines = [
      routineFixture('r1', 'Push', 'Empuje'),
      routineFixture('r2', 'Pull', null),
      routineFixture('r3', 'Pierna', null),
      routineFixture('r4', 'Full body', null),
    ];
    HomeScreen();

    expect(byType(SectionHeader).map((h) => h.props.title)).toContain('Tus rutinas');

    const rows = byType(ListRow);

    expect(rows).toHaveLength(3);
    expect(rows[0].props.title).toBe('Push');
    expect(rows[0].props.meta).toBe('Empuje');
    expect(rows[1].props.meta).toBeUndefined();

    await invoke(rows[0], 'onPress');

    expect(fixtures.push).toHaveBeenCalledWith('routines/[id]', { id: 'r1' });
  });

  it('sin rutinas, la sección no aparece', () => {
    HomeScreen();

    expect(byType(SectionHeader).map((h) => h.props.title)).toEqual(['Últimos entrenos']);
    expect(byType(ListRow)).toHaveLength(0);
  });

  it('con workout activo, el bloque de acento lleva de vuelta a él y no hay arranque', async () => {
    fixtures.activeSession = { name: 'Empuje', completedSets: 9, elapsedSeconds: 1500 };
    HomeScreen();

    const [hero] = byClass('Hero');

    expect(hero.props.style).toMatchObject({ backgroundColor: lightTheme.accent });
    expect(byType(Text).some((t) => t.props.tone === 'onAccent')).toBe(true);
    expect(byType(Button)).toHaveLength(0);
    expect(byType(Text).map(textOf)).not.toContain('Empieza un entrenamiento');

    await invoke(hero, 'bindtap');

    expect(fixtures.push).toHaveBeenCalledWith('workout/active');
  });
});
