import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { EmptyState } from '@components/EmptyState';
import { formatDuration, formatNumber, formatWeight } from '@lib/format';
import { remountKey } from '@lib/reactKeys';
import { useRouter, useTabs } from '@lib/router';
import { useTheme } from '@lib/useTheme';
import { useActiveWorkout } from '@stores/activeWorkoutStore';
import { usePreferences } from '@stores/preferencesStore';

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
          title="¡Buen trabajo!"
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
              <text className="FinishBadgeMark">✓</text>
            </view>
            <text className="FinishTitle" style={{ color: colors.textPrimary }}>
              ¡Workout completado!
            </text>
            <text className="FinishSubtitle" style={{ color: colors.textSecondary }}>
              {summary.name}
            </text>
          </view>

          <Card>
            <view className="RowBetween">
              <text className="ListSubtitle" style={{ color: colors.textSecondary }}>
                Duración
              </text>
              <text className="ListTitle" style={{ color: colors.textPrimary }}>
                {formatDuration(summary.durationSeconds)}
              </text>
            </view>
            <view className="RowBetween">
              <text className="ListSubtitle" style={{ color: colors.textSecondary }}>
                Volumen total
              </text>
              <text className="ListTitle" style={{ color: colors.textPrimary }}>
                {formatNumber(summary.totalVolume)} {units}
              </text>
            </view>
            <view className="RowBetween">
              <text className="ListSubtitle" style={{ color: colors.textSecondary }}>
                Series completadas
              </text>
              <text className="ListTitle" style={{ color: colors.textPrimary }}>
                {summary.completedSets} / {summary.totalSets}
              </text>
            </view>
            <view className="RowBetween">
              <text className="ListSubtitle" style={{ color: colors.textSecondary }}>
                Ejercicios
              </text>
              <text className="ListTitle" style={{ color: colors.textPrimary }}>
                {summary.exercises.length}
              </text>
            </view>
          </Card>

          {summary.prs.length > 0 ? (
            <Card>
              <text className="CardTitle" style={{ color: colors.textPrimary }}>
                Récords de la sesión
              </text>
              {summary.prs.map((pr) => (
                <view className="RowBetween" key={remountKey('pr', pr.exerciseId)}>
                  <text className="ListTitle" style={{ color: colors.textPrimary }}>
                    {pr.exerciseName}
                  </text>
                  <text className="ListTitle" style={{ color: colors.accent }}>
                    {pr.value.toFixed(1)} {units}
                  </text>
                </view>
              ))}
            </Card>
          ) : null}

          <Card>
            <text className="CardTitle" style={{ color: colors.textPrimary }}>
              Resumen por ejercicio
            </text>
            {summary.exercises.map((exercise) => (
              <view className="RowBetween" key={remountKey('summaryExercise', exercise.id)}>
                <view className="RowFill">
                  <text className="ListTitle" style={{ color: colors.textPrimary }}>
                    {exercise.name}
                  </text>
                  <text className="ListSubtitle" style={{ color: colors.textSecondary }}>
                    {exercise.completedSets} series · {formatNumber(exercise.volume)} {units}
                  </text>
                </view>
                {exercise.best ? (
                  <text className="ListTitle" style={{ color: colors.accent }}>
                    {formatWeight(exercise.best.weight, units)} × {exercise.best.reps}
                  </text>
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
