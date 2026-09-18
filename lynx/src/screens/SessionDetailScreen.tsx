import { Card } from '@components/Card';
import { EmptyState } from '@components/EmptyState';
import { ErrorNote, Loading } from '@components/Loading';
import { WorkoutSummaryCard } from '@components/WorkoutSummaryCard';
import { formatDateTime, formatDuration, formatNumber } from '@lib/format';
import { remountKey } from '@lib/reactKeys';
import { useTheme } from '@lib/useTheme';
import { useLoad } from '@lib/useLoad';
import { getRepos } from '@db';
import { toExerciseSummaries, type FullSessionRow } from '@db/shapes';
import { usePreferences } from '@stores/preferencesStore';
import type { RouteProps } from '@/app/routes';

/**
 * Detalle de una sesión ya terminada.
 *
 * Muestra la tarjeta compartible (`WorkoutSummaryCard`) y el desglose de series
 * por ejercicio. Sin botón de compartir: la captura de la tarjeta como imagen
 * necesita un native module, fuera del alcance de esta fase.
 */
export function SessionDetailScreen({ params }: RouteProps) {
  const { colors } = useTheme();
  const units = usePreferences((s) => s.units);
  const id = params.id ?? '';

  const loaded = useLoad<FullSessionRow | null>(null, () =>
    id ? getRepos().sessions.getFullSession(id) : Promise.resolve(null)
  );

  const session = loaded.data?.session ?? null;
  const exercises = loaded.data ? toExerciseSummaries(loaded.data) : [];

  if (loaded.loading) {
    return (
      <view className="Screen" style={{ backgroundColor: colors.background }}>
        <Loading />
      </view>
    );
  }

  if (loaded.error) {
    return (
      <view className="Screen" style={{ backgroundColor: colors.background }}>
        <ErrorNote message={loaded.error} />
      </view>
    );
  }

  if (!session) {
    return (
      <view className="Screen" style={{ backgroundColor: colors.background }}>
        <EmptyState
          title="Sesión no encontrada"
          body={`No hay ninguna sesión guardada con el id "${id}".`}
        />
      </view>
    );
  }

  return (
    <view className="Screen" style={{ backgroundColor: colors.background }}>
      <scroll-view className="ScreenScroll" scroll-orientation="vertical">
        <view className="ScreenContent">
          <text className="CardLabel" style={{ color: colors.textMuted }}>
            Resumen
          </text>
          <text className="ListSubtitle" style={{ color: colors.textMuted }}>
            {formatDateTime(new Date(session.startedAt))}
          </text>

          <view className="StatRow">
            <view className="Stat">
              <text className="StatLabel" style={{ color: colors.textMuted }}>
                Series
              </text>
              <text className="StatText" style={{ color: colors.text }}>
                {session.totalSets}
              </text>
            </view>
            <view className="Stat">
              <text className="StatLabel" style={{ color: colors.textMuted }}>
                Volumen
              </text>
              <text className="StatText" style={{ color: colors.text }}>
                {formatNumber(session.totalVolume)} {units}
              </text>
            </view>
            <view className="Stat">
              <text className="StatLabel" style={{ color: colors.textMuted }}>
                Duración
              </text>
              <text className="StatText" style={{ color: colors.text }}>
                {formatDuration(session.durationSeconds ?? 0)}
              </text>
            </view>
          </view>

          <WorkoutSummaryCard session={{ ...session, exercises }} />

          {exercises.map((exercise) => {
            const completed = exercise.sets.filter((set) => set.isCompleted);

            if (completed.length === 0) return null;

            return (
              <Card key={remountKey('sessionExercise', exercise.id)}>
                <text className="ListTitle" style={{ color: colors.text }}>
                  {exercise.name}
                </text>
                <text className="Meta" style={{ color: colors.textMuted }}>
                  {completed.length} series
                </text>
                {completed.map((set, index) => (
                  <text
                    className="ListSubtitle"
                    key={remountKey('set', set.id)}
                    style={{ color: colors.text }}
                  >
                    {index + 1}. {set.weight} {units} × {set.reps} reps
                  </text>
                ))}
              </Card>
            );
          })}
        </view>
      </scroll-view>
    </view>
  );
}
