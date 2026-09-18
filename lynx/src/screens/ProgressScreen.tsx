import { getRepos } from '@db';
import { Card } from '@components/Card';
import { EmptyState } from '@components/EmptyState';
import { ErrorNote, Loading } from '@components/Loading';
import { Heatmap, type HeatmapDay } from '@components/Heatmap';
import { Screen } from '@components/Screen';
import { formatDateShort } from '@lib/format';
import { topPersonalRecords, type PersonalRecordSummary } from '@lib/personalRecords';
import { remountKey } from '@lib/reactKeys';
import { useLoad } from '@lib/useLoad';
import { useTheme } from '@lib/useTheme';
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
 */
export function ProgressScreen() {
  const { colors } = useTheme();
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
        <text className="CardLabel" style={{ color: colors.textSecondary }}>
          Racha actual
        </text>
        <text className="StatValue" style={{ color: colors.textPrimary }}>
          {streak.loading ? '—' : `${streak.data} ${streak.data === 1 ? 'día' : 'días'}`}
        </text>
      </Card>

      <Card>
        <text className="CardTitle" style={{ color: colors.textPrimary }}>
          Consistencia
        </text>
        <text className="CardBody" style={{ color: colors.textSecondary }}>
          Últimas 13 semanas, más oscuro = más volumen.
        </text>

        {days.error ? <ErrorNote message={days.error} /> : null}

        <Heatmap data={days.data} weeks={13} />
      </Card>

      <Card>
        <text className="CardTitle" style={{ color: colors.textPrimary }}>
          Volumen semanal
        </text>
        <text className="CardBody" style={{ color: colors.textSecondary }}>
          Últimas 12 semanas, en {units}.
        </text>

        {volume.error ? <ErrorNote message={volume.error} /> : null}

        {!volume.loading && volume.data.length === 0 ? (
          <text className="CardBody" style={{ color: colors.textSecondary }}>
            Aún no hay datos suficientes.
          </text>
        ) : null}

        {volume.data.map((week) => (
          <view className="RowBetween" key={remountKey('week', week.weekStart)}>
            <text className="ListSubtitle" style={{ color: colors.textSecondary }}>
              {formatDateShort(weekMonday(week.weekStart))}
            </text>
            <text className="ListTitle" style={{ color: colors.textPrimary }}>
              {Math.round(week.volume)} {units}
            </text>
          </view>
        ))}
      </Card>

      <Card>
        <text className="CardTitle" style={{ color: colors.textPrimary }}>
          Récords personales (1RM estimado)
        </text>

        {records.error ? <ErrorNote message={records.error} /> : null}

        {!records.loading && top.length === 0 ? (
          <text className="CardBody" style={{ color: colors.textSecondary }}>
            Completa tu primer workout para empezar a registrar PRs.
          </text>
        ) : null}

        {top.map((pr) => (
          <view className="RowBetween" key={remountKey('pr', pr.exerciseId)}>
            <text className="ListTitle" style={{ color: colors.textPrimary }}>
              {pr.exerciseName}
            </text>
            <text className="ListTitle" style={{ color: colors.accent }}>
              {pr.oneRm.toFixed(1)} {units}
            </text>
          </view>
        ))}
      </Card>

      {loading ? <Loading /> : null}
    </Screen>
  );
}
