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
import { Text } from '@components/Text';

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
          <Text role="detail" tone="onAccent">Workout en curso</Text>
          <Text role="title" tone="onAccent">{session.name}</Text>
          <Text role="support" tone="onAccent">
            {session.completedSets} series · {formatDuration(session.elapsedSeconds)}
          </Text>
        </view>
      ) : (
        <Card>
          <Text role="title" tone="textPrimary">
            Empieza un workout
          </Text>
          <Text role="support" tone="textSecondary">
            Comienza uno vacío o elige una de tus rutinas.
          </Text>
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
        <Text role="detail" tone="textSecondary">
          Racha actual
        </Text>
        <Text role="display" tone="textPrimary">
          {streak.loading ? '—' : streak.data}
        </Text>
        <Text role="support" tone="textSecondary">
          {streak.data === 1 ? 'día seguido entrenando' : 'días seguidos entrenando'}
        </Text>
      </Card>

      <Card>
        <Text role="title" tone="textPrimary">
          Acciones rápidas
        </Text>
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
