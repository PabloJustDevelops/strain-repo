import { useEffect } from '@lynx-js/react';

import { getRepos } from '@db';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { Screen } from '@components/Screen';
import { formatDateLong, formatDuration } from '@lib/format';
import { useRouter, useTabs } from '@lib/router';
import { useLoad } from '@lib/useLoad';
import { useTheme } from '@lib/useTheme';
import { useActiveWorkout } from '@stores/activeWorkoutStore';

/**
 * Pantalla "Hoy": punto de entrada de la app.
 *
 * - Si hay un workout activo, un CTA para volver a él.
 * - Si no, arrancarlo vacío o elegir una rutina.
 * - La racha sale de `analytics`, que ya agrega sobre la seam KV.
 */
export function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { goToTab } = useTabs();

  const session = useActiveWorkout((s) => s.session);
  const loadActive = useActiveWorkout((s) => s.loadActive);
  const startEmpty = useActiveWorkout((s) => s.startEmpty);

  const streak = useLoad(0, () => getRepos().analytics.currentStreak());

  useEffect(() => {
    loadActive();
  }, []);

  const today = formatDateLong(new Date());

  async function handleStartEmpty() {
    await startEmpty(`Workout ${today}`);
    router.push('workout/active');
  }

  return (
    <Screen title="Hoy" subtitle={today}>
      {session ? (
        <view
          className="Hero"
          style={{ backgroundColor: colors.accent }}
          bindtap={() => router.push('workout/active')}
        >
          <text className="HeroLabel">Workout en curso</text>
          <text className="HeroTitle">{session.name}</text>
          <text className="HeroBody">
            {session.completedSets} series · {formatDuration(session.elapsedSeconds)}
          </text>
        </view>
      ) : (
        <Card>
          <text className="CardTitle" style={{ color: colors.textPrimary }}>
            Empieza un workout
          </text>
          <text className="CardBody" style={{ color: colors.textSecondary }}>
            Comienza uno vacío o elige una de tus rutinas.
          </text>
          <view className="RowActions">
            <Button title="Vacío" onPress={handleStartEmpty} />
            <Button
              title="Elegir rutina"
              variant="secondary"
              onPress={() => goToTab('routines')}
            />
          </view>
        </Card>
      )}

      <Card>
        <text className="CardLabel" style={{ color: colors.textSecondary }}>
          Racha actual
        </text>
        <text className="StatValue" style={{ color: colors.textPrimary }}>
          {streak.loading ? '—' : streak.data}
        </text>
        <text className="CardBody" style={{ color: colors.textSecondary }}>
          {streak.data === 1 ? 'día seguido entrenando' : 'días seguidos entrenando'}
        </text>
      </Card>

      <Card>
        <text className="CardTitle" style={{ color: colors.textPrimary }}>
          Acciones rápidas
        </text>
        <view className="RowActions">
          <Button
            title="Biblioteca"
            variant="secondary"
            onPress={() => goToTab('exercises')}
          />
          <Button title="Historial" variant="secondary" onPress={() => goToTab('history')} />
          <Button title="Progreso" variant="secondary" onPress={() => goToTab('progress')} />
        </view>
      </Card>
    </Screen>
  );
}
