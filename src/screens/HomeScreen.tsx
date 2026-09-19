import { useEffect } from '@lynx-js/react';

import { getRepos } from '@db';
import { Button } from '@components/Button';
import { ListRow } from '@components/ListRow';
import { Screen } from '@components/Screen';
import { SectionHeader } from '@components/SectionHeader';
import { StatBlock } from '@components/StatBlock';
import { Text } from '@components/Text';
import {
  diffDays,
  formatDateTime,
  formatDateLong,
  formatDuration,
  formatNumber,
} from '@lib/format';
import { remountKey } from '@lib/reactKeys';
import { space } from '@lib/theme';
import { useRouter, useTabs } from '@lib/router';
import { useLoad } from '@lib/useLoad';
import { useTheme } from '@lib/useTheme';
import { useActiveWorkout } from '@stores/activeWorkoutStore';
import { usePreferences } from '@stores/preferencesStore';
import type { Routine, WorkoutSession } from '@/types/domain';

/** Filas por sección: la pantalla resume, el detalle vive en cada destino. */
const RECENT_SESSIONS = 3;
const TOP_ROUTINES = 3;
/** Cuántas sesiones se piden para las filas y el contador de la semana. */
const SESSION_WINDOW = 30;
/** Ventana (en días) del contador «Esta semana». */
const WEEK_DAYS = 7;

/**
 * Pantalla "Hoy": punto de entrada de la app, sin tarjetas.
 *
 * - Si hay un workout activo, un bloque de acento para volver a él.
 * - Si no, el bloque de acción a sangre: una primaria («Entrenamiento vacío»)
 *   y una secundaria («Elegir rutina»); con cero rutinas la lista estaría
 *   vacía, así que no puede ser la primaria.
 * - La racha y los entrenos de la semana van en una fila de cifras pequeñas,
 *   no como número gigante.
 * - Últimos entrenos y rutinas son filas navegables; sin historial, una línea;
 *   sin rutinas, la sección no aparece.
 * - Biblioteca y Progreso no se duplican: ya están en la tab bar.
 */
export function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { goToTab } = useTabs();
  const units = usePreferences((s) => s.units);

  const session = useActiveWorkout((s) => s.session);
  const loadActive = useActiveWorkout((s) => s.loadActive);
  const startEmpty = useActiveWorkout((s) => s.startEmpty);

  const streak = useLoad(0, () => getRepos().analytics.currentStreak());
  const sessions = useLoad<WorkoutSession[]>([], () => getRepos().sessions.list(SESSION_WINDOW));
  const routines = useLoad<Routine[]>([], () => getRepos().routines.list());

  useEffect(() => {
    loadActive();
  }, []);

  const today = formatDateLong(new Date());

  async function handleStartEmpty() {
    await startEmpty(`Entrenamiento ${today}`);
    router.push('workout/active');
  }

  const recent = sessions.data.slice(0, RECENT_SESSIONS);
  const thisWeek = sessions.data.filter(
    (s) => diffDays(new Date(), new Date(s.startedAt)) < WEEK_DAYS,
  ).length;
  const hasRoutines = routines.data.length > 0;

  return (
    <Screen title="Hoy" subtitle={today}>
      {session ? (
        <view
          className="Hero"
          style={{ backgroundColor: colors.accent }}
          bindtap={() => router.push('workout/active')}
        >
          <Text role="detail" tone="onAccent">Entrenamiento en curso</Text>
          <Text role="title" tone="onAccent">{session.name}</Text>
          <Text role="support" tone="onAccent">
            {session.completedSets} series · {formatDuration(session.elapsedSeconds)}
          </Text>
        </view>
      ) : (
        <>
          <Text role="title" tone="textPrimary">
            Empieza un entrenamiento
          </Text>
          <Text role="support" tone="textSecondary" style={{ marginTop: space.xs }}>
            Empieza desde cero o elige una rutina.
          </Text>
          <view className="RowActions">
            <Button title="Entrenamiento vacío" onPress={handleStartEmpty} />
            <Button
              title="Elegir rutina"
              variant="secondary"
              onPress={() => goToTab('routines')}
            />
          </view>
        </>
      )}

      <view className="StatRow">
        <StatBlock
          label="Racha"
          value={streak.loading ? '—' : String(streak.data)}
          unit={streak.loading ? undefined : streak.data === 1 ? 'día' : 'días'}
        />
        <StatBlock label="Esta semana" value={String(thisWeek)} />
      </view>

      <SectionHeader title="Últimos entrenos" />
      {recent.length === 0 ? (
        <Text role="support" tone="textSecondary" style={{ marginTop: space.xs }}>
          Aún no hay entrenos
        </Text>
      ) : (
        recent.map((s) => (
          <ListRow
            key={remountKey('session', s.id)}
            title={s.name}
            meta={`${formatDateTime(new Date(s.startedAt))} · ${s.totalSets} series · ${formatNumber(Math.round(s.totalVolume))} ${units}`}
            chevron
            onPress={() => router.push('history/[id]', { id: s.id })}
          />
        ))
      )}

      {hasRoutines ? <SectionHeader title="Tus rutinas" /> : null}
      {hasRoutines
        ? routines.data.slice(0, TOP_ROUTINES).map((r) => (
            <ListRow
              key={remountKey('routine', r.id)}
              title={r.name}
              meta={r.description ?? undefined}
              chevron
              onPress={() => router.push('routines/[id]', { id: r.id })}
            />
          ))
        : null}
    </Screen>
  );
}
