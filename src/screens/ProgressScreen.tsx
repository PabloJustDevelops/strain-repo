import { getRepos } from '@db';
import { Card } from '@components/Card';
import { EmptyState } from '@components/EmptyState';
import { HistoryList } from '@components/HistoryList';
import { ErrorNote, Loading } from '@components/Loading';
import { Heatmap, type HeatmapDay } from '@components/Heatmap';
import { Screen } from '@components/Screen';
import { SectionHeader } from '@components/SectionHeader';
import { Text } from '@components/Text';
import { formatDateShort } from '@lib/format';
import { topPersonalRecords, type PersonalRecordSummary } from '@lib/personalRecords';
import { remountKey } from '@lib/reactKeys';
import { useLoad } from '@lib/useLoad';
import { weekMonday } from '@lib/weeks';
import { usePreferences } from '@stores/preferencesStore';

interface WeekVolume {
  weekStart: string;
  volume: number;
}

/**
 * Progreso: cifras y récords, sin gráficos.
 *
 * Lynx no tiene un equivalente a `victory-native`/`chart-kit` (y una librería
 * de gráficos traería SVG/canvas, fuera de esta fase), así que el volumen
 * semanal se muestra como lista de semanas. Los datos son los mismos que
 * alimentarían al gráfico: `analytics.volumePerWeek` y las etiquetas de mes de
 * `@lib/weeks`.
 *
 * Desde la v2 esta pantalla es también donde se lee el **historial**: la lista de
 * sesiones dejó de ser pestaña y se muestra como bloque al final, con los mismos
 * datos y el mismo destino (`history/[id]`).
 */
export function ProgressScreen() {
  const units = usePreferences((s) => s.units);

  const volume = useLoad<WeekVolume[]>([], () => getRepos().analytics.volumePerWeek(12));
  const streak = useLoad(0, () => getRepos().analytics.currentStreak());
  const days = useLoad<HeatmapDay[]>([], () => getRepos().analytics.dailyVolume(365));
  const records = useLoad<PersonalRecordSummary[]>([], async () => {
    const [stored, catalog] = await Promise.all([
      getRepos().analytics.personalRecords(),
      getRepos().exercises.list(),
    ]);
    const names = new Map(catalog.map((ex) => [ex.id, ex.name]));

    return stored
      .filter((pr) => pr.recordType === 'one_rm')
      .map((pr) => ({
        exerciseId: pr.exerciseId,
        exerciseName: names.get(pr.exerciseId) ?? 'Ejercicio',
        oneRm: pr.value,
      }));
  });

  const top = topPersonalRecords(records.data);
  const loading = volume.loading || streak.loading || records.loading || days.loading;

  return (
    <Screen title="Progreso">
      <Card>
        <Text role="detail" tone="textSecondary">
          Racha actual
        </Text>
        <Text role="display" tone="textPrimary">
          {streak.loading ? '—' : `${streak.data} ${streak.data === 1 ? 'día' : 'días'}`}
        </Text>
      </Card>

      <Card>
        <Text role="title" tone="textPrimary">
          Consistencia
        </Text>
        <Text role="support" tone="textSecondary">
          Últimas 13 semanas, más oscuro = más volumen.
        </Text>

        {days.error ? <ErrorNote message={days.error} /> : null}

        <Heatmap data={days.data} weeks={13} />
      </Card>

      <Card>
        <Text role="title" tone="textPrimary">
          Volumen semanal
        </Text>
        <Text role="support" tone="textSecondary">
          Últimas 12 semanas, en {units}.
        </Text>

        {volume.error ? <ErrorNote message={volume.error} /> : null}

        {!volume.loading && volume.data.length === 0 ? (
          <Text role="support" tone="textSecondary">
            Aún no hay datos suficientes.
          </Text>
        ) : null}

        {volume.data.map((week) => (
          <view className="RowBetween" key={remountKey('week', week.weekStart)}>
            <Text role="support" tone="textSecondary">
              {formatDateShort(weekMonday(week.weekStart))}
            </Text>
            <Text role="title" tone="textPrimary">
              {Math.round(week.volume)} {units}
            </Text>
          </view>
        ))}
      </Card>

      <Card>
        <Text role="title" tone="textPrimary">
          Récords personales (1RM estimado)
        </Text>

        {records.error ? <ErrorNote message={records.error} /> : null}

        {!records.loading && top.length === 0 ? (
          <Text role="support" tone="textSecondary">
            Completa tu primer entrenamiento para empezar a registrar PRs.
          </Text>
        ) : null}

        {top.map((pr) => (
          <view className="RowBetween" key={remountKey('pr', pr.exerciseId)}>
            <Text role="title" tone="textPrimary">
              {pr.exerciseName}
            </Text>
            <Text role="title" tone="accent">
              {pr.oneRm.toFixed(1)} {units}
            </Text>
          </view>
        ))}
      </Card>

      <SectionHeader title="Historial" />
      <HistoryList />

      {loading ? <Loading /> : null}
    </Screen>
  );
}
