import { getRepos } from '@db';
import { EmptyState } from '@components/EmptyState';
import { ErrorNote, Loading } from '@components/Loading';
import { Text } from '@components/Text';
import { formatDateTime, formatDuration } from '@lib/format';
import { remountKey } from '@lib/reactKeys';
import { useRouter } from '@lib/router';
import { useLoad } from '@lib/useLoad';
import { useTheme } from '@lib/useTheme';
import { usePreferences } from '@stores/preferencesStore';
import type { WorkoutSession } from '@/types/domain';

/**
 * Lista de workouts completados, sin la pantalla que la contiene.
 *
 * La v2 mostró que el historial no era una pestaña: es **contenido** de
 * Progreso, donde se lee junto a la racha y al volumen. Por eso la lista vive
 * como bloque propio —Progreso la pinta bajo su cabecera "Historial"— y la
 * pantalla de historial queda como un envoltorio de este mismo bloque.
 *
 * Cada fila ya trae los totales que la sesión cachea al cerrarse (volumen y
 * series), así que no hace falta releer los sets. Tocar una fila abre el detalle
 * de la sesión (`history/[id]`) con su desglose de series.
 */
interface HistoryListProps {
  /** Cuántas sesiones pedir, de la más reciente hacia atrás. */
  limit?: number;
}

export function HistoryList({ limit = 100 }: HistoryListProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const units = usePreferences((s) => s.units);

  const sessions = useLoad<WorkoutSession[]>([], () => getRepos().sessions.list(limit));

  return (
    <view className="HistoryList">
      {sessions.loading ? <Loading /> : null}
      {sessions.error ? <ErrorNote message={sessions.error} /> : null}

      {!sessions.loading && sessions.data.length === 0 ? (
        <EmptyState
          icon="clock"
          title="Aún no has completado ningún workout"
          body="Cuando termines el primero, aparecerá acá con su volumen y duración."
        />
      ) : null}

      {sessions.data.map((session) => (
        <view
          className="ListRow"
          key={remountKey('session', session.id)}
          style={{ borderColor: colors.border }}
          bindtap={() => router.push('history/[id]', { id: session.id })}
        >
          <view className="RowBetween">
            <Text role="title" tone="textPrimary">
              {session.name}
            </Text>
            <Text role="detail" tone="textSecondary">
              {formatDateTime(new Date(session.startedAt))}
            </Text>
          </view>

          <view className="StatRow">
            <Stat label="Volumen" value={`${Math.round(session.totalVolume)} ${units}`} />
            <Stat label="Series" value={String(session.totalSets)} />
            <Stat label="Duración" value={formatDuration(session.durationSeconds ?? 0)} />
          </view>
        </view>
      ))}
    </view>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <view className="Stat">
      <Text role="detail" tone="textSecondary">
        {label}
      </Text>
      <Text role="support" tone="textPrimary">
        {value}
      </Text>
    </view>
  );
}
