import { getRepos } from '@db';
import { Card } from '@components/Card';
import { EmptyState } from '@components/EmptyState';
import { ErrorNote, Loading } from '@components/Loading';
import { Screen } from '@components/Screen';
import { formatDateTime, formatDuration } from '@lib/format';
import { remountKey } from '@lib/reactKeys';
import { useLoad } from '@lib/useLoad';
import { useTheme } from '@lib/useTheme';
import { usePreferences } from '@stores/preferencesStore';
import type { WorkoutSession } from '@/types/domain';

/**
 * Historial de workouts completados, desde `sessionsRepo.list()`.
 *
 * Cada fila ya trae los totales que la sesión cachea al cerrarse (volumen y
 * series), así que no hace falta releer los sets. El detalle de una sesión
 * queda para la Fase 3, por eso las filas todavía no navegan.
 */
export function HistoryScreen() {
  const { colors } = useTheme();
  const units = usePreferences((s) => s.units);

  const sessions = useLoad<WorkoutSession[]>([], () => getRepos().sessions.list(100));

  return (
    <Screen
      title="Historial"
      subtitle={sessions.loading ? undefined : `${sessions.data.length} workouts`}
    >
      {sessions.loading ? <Loading /> : null}
      {sessions.error ? <ErrorNote message={sessions.error} /> : null}

      {!sessions.loading && sessions.data.length === 0 ? (
        <EmptyState
          title="Aún no has completado ningún workout"
          body="Cuando termines el primero, aparecerá acá con su volumen y duración."
        />
      ) : null}

      {sessions.data.map((session) => (
        <Card key={remountKey('session', session.id)}>
          <view className="RowBetween">
            <text className="ListTitle" style={{ color: colors.text }}>
              {session.name}
            </text>
            <text className="Meta" style={{ color: colors.textMuted }}>
              {formatDateTime(new Date(session.startedAt))}
            </text>
          </view>

          <view className="StatRow">
            <Stat label="Volumen" value={`${Math.round(session.totalVolume)} ${units}`} />
            <Stat label="Series" value={String(session.totalSets)} />
            <Stat label="Duración" value={formatDuration(session.durationSeconds ?? 0)} />
          </view>
        </Card>
      ))}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();

  return (
    <view className="Stat">
      <text className="StatLabel" style={{ color: colors.textMuted }}>
        {label}
      </text>
      <text className="StatText" style={{ color: colors.text }}>
        {value}
      </text>
    </view>
  );
}
