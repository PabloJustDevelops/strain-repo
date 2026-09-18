import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { EmptyState } from '@components/EmptyState';
import { formatDuration, formatNumber, formatWeight } from '@lib/format';
import { remountKey } from '@lib/reactKeys';
import { useRouter, useTabs } from '@lib/router';
import { useTheme } from '@lib/useTheme';
import { useActiveWorkout } from '@stores/activeWorkoutStore';
import { usePreferences } from '@stores/preferencesStore';
import { Text } from '@components/Text';

/**
 * Cierre del workout: resumen de lo que acaba de pasar.
 *
 * Lee `lastFinished` del store y no la sesión activa: `finishWorkout()` limpia
 * `session`, así que en esta pantalla ya no hay nada que leer de ahí. El resumen
 * lo arma el store antes de limpiar, con los PRs que acaba de escribir
 * `sessions.finish()`.
 *
 * Los PRs son los de esta sesión (mismo ejercicio y dentro de la ventana
 * arranque→cierre), no el histórico completo.
 */
export function WorkoutFinishScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { goToTab } = useTabs();
  const units = usePreferences((s) => s.units);

  const summary = useActiveWorkout((s) => s.lastFinished);

  if (!summary) {
    return (
      <view className="Screen" style={{ backgroundColor: colors.bg }}>
        <EmptyState
          title="Buen trabajo"
          body="No hay un resumen reciente para mostrar."
          action={<Button title="Volver al inicio" onPress={() => goToTab('home')} />}
        />
      </view>
    );
  }

  return (
    <view className="Screen" style={{ backgroundColor: colors.bg }}>
      <scroll-view className="ScreenScroll" scroll-orientation="vertical">
        <view className="ScreenContent">
          <view className="FinishHero">
            <view className="FinishBadge" style={{ backgroundColor: colors.success }}>
              <Text role="display" tone="onAccent">✓</Text>
            </view>
            <Text role="display" tone="textPrimary">
              Workout completado
            </Text>
            <Text role="support" tone="textSecondary">
              {summary.name}
            </Text>
          </view>

          <Card>
            <view className="RowBetween">
              <Text role="support" tone="textSecondary">
                Duración
              </Text>
              <Text role="title" tone="textPrimary">
                {formatDuration(summary.durationSeconds)}
              </Text>
            </view>
            <view className="RowBetween">
              <Text role="support" tone="textSecondary">
                Volumen total
              </Text>
              <Text role="title" tone="textPrimary">
                {formatNumber(summary.totalVolume)} {units}
              </Text>
            </view>
            <view className="RowBetween">
              <Text role="support" tone="textSecondary">
                Series completadas
              </Text>
              <Text role="title" tone="textPrimary">
                {summary.completedSets} / {summary.totalSets}
              </Text>
            </view>
            <view className="RowBetween">
              <Text role="support" tone="textSecondary">
                Ejercicios
              </Text>
              <Text role="title" tone="textPrimary">
                {summary.exercises.length}
              </Text>
            </view>
          </Card>

          {summary.prs.length > 0 ? (
            <Card>
              <Text role="title" tone="textPrimary">
                Récords de la sesión
              </Text>
              {summary.prs.map((pr) => (
                <view className="RowBetween" key={remountKey('pr', pr.exerciseId)}>
                  <Text role="title" tone="textPrimary">
                    {pr.exerciseName}
                  </Text>
                  <Text role="title" tone="accent">
                    {pr.value.toFixed(1)} {units}
                  </Text>
                </view>
              ))}
            </Card>
          ) : null}

          <Card>
            <Text role="title" tone="textPrimary">
              Resumen por ejercicio
            </Text>
            {summary.exercises.map((exercise) => (
              <view className="RowBetween" key={remountKey('summaryExercise', exercise.id)}>
                <view className="RowFill">
                  <Text role="title" tone="textPrimary">
                    {exercise.name}
                  </Text>
                  <Text role="support" tone="textSecondary">
                    {exercise.completedSets} series · {formatNumber(exercise.volume)} {units}
                  </Text>
                </view>
                {exercise.best ? (
                  <Text role="title" tone="accent">
                    {formatWeight(exercise.best.weight, units)} × {exercise.best.reps}
                  </Text>
                ) : null}
              </view>
            ))}
          </Card>

          <Button
            title="Ver detalle de la sesión"
            variant="secondary"
            onPress={() => router.push('history/[id]', { id: summary.sessionId })}
          />
          <Button title="Volver al inicio" onPress={() => goToTab('home')} />
        </view>
      </scroll-view>
    </view>
  );
}
