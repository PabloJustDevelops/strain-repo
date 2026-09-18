import { useEffect, useState } from '@lynx-js/react';

import { Card } from '@components/Card';
import { EmptyState } from '@components/EmptyState';
import { ErrorNote, Loading } from '@components/Loading';
import { formatDateShort, formatNumber, formatWeight } from '@lib/format';
import { equipmentLabel, muscleGroupLabel } from '@lib/labels';
import { remountKey } from '@lib/reactKeys';
import { BORDER_WIDTH, px } from '@lib/theme';
import { useTheme } from '@lib/useTheme';
import { getRepos, type AnalyticsRepo } from '@db';
import type { Exercise } from '@/types/domain';
import { usePreferences } from '@stores/preferencesStore';
import type { RouteProps } from '@/app/routes';
import { Text } from '@components/Text';

type TimelineRow = Awaited<ReturnType<AnalyticsRepo['exerciseTimeline']>>[number];
type PrRow = Awaited<ReturnType<AnalyticsRepo['exercisePrHistory']>>[number];
type ExerciseStats = Awaited<ReturnType<AnalyticsRepo['exerciseStats']>>;

type Range = '1M' | '3M' | '6M' | '1A' | 'ALL';
type Metric = 'oneRm' | 'maxWeight' | 'volume';

const RANGE_DAYS: Record<Range, number> = {
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '1A': 365,
  ALL: 365 * 5,
};

const RANGES: Range[] = ['1M', '3M', '6M', '1A', 'ALL'];

const METRICS: { value: Metric; label: string }[] = [
  { value: 'oneRm', label: '1RM' },
  { value: 'maxWeight', label: 'Peso' },
  { value: 'volume', label: 'Volumen' },
];

/** Las barras más altas que se dibujan; el resto son sesiones viejas. */
const MAX_BARS = 40;

const MAX_BAR_HEIGHT = 120;

/**
 * Ficha de un ejercicio: datos, totales históricos, progresión y PRs.
 *
 * La progresión se dibuja como barras hechas con `<view>` (nada de librería de
 * gráficos: en Lynx no hay equivalente a `victory-native`). Los datos son los
 * mismos agregados que alimentarían al gráfico (`analytics.exerciseTimeline`).
 */
export function ExerciseDetailScreen({ params }: RouteProps) {
  const { colors } = useTheme();
  const units = usePreferences((s) => s.units);
  const id = params.id ?? '';

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [stats, setStats] = useState<ExerciseStats | null>(null);
  const [timeline, setTimeline] = useState<TimelineRow[]>([]);
  const [prs, setPrs] = useState<PrRow[]>([]);
  const [range, setRange] = useState<Range>('3M');
  const [metric, setMetric] = useState<Metric>('oneRm');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);

      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all([
      getRepos().exercises.byId(id),
      getRepos().analytics.exerciseTimeline(id, RANGE_DAYS[range]),
      getRepos().analytics.exerciseStats(id),
      getRepos().analytics.exercisePrHistory(id),
    ]).then(
      ([found, rows, totals, records]) => {
        if (cancelled) return;
        setExercise(found ?? null);
        setTimeline(rows);
        setStats(totals);
        setPrs(records);
        setError(null);
        setLoading(false);
      },
      (err) => {
        if (cancelled) return;
        setError(String(err));
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [id, range]);

  if (loading) {
    return (
      <view className="Screen" style={{ backgroundColor: colors.bg }}>
        <Loading />
      </view>
    );
  }

  if (error) {
    return (
      <view className="Screen" style={{ backgroundColor: colors.bg }}>
        <ErrorNote message={error} />
      </view>
    );
  }

  if (!exercise) {
    return (
      <view className="Screen" style={{ backgroundColor: colors.bg }}>
        <EmptyState
          title="Ejercicio no encontrado"
          body={`No hay ningún ejercicio con el id "${id}".`}
        />
      </view>
    );
  }

  const visible = timeline.slice(-MAX_BARS);
  const values = visible.map((row) => metricValue(row, metric));
  const maxValue = values.reduce((max, value) => Math.max(max, value), 0);
  const latestPr = prs.find((pr) => pr.recordType === 'one_rm');

  return (
    <view className="Screen" style={{ backgroundColor: colors.bg }}>
      <scroll-view className="ScreenScroll" scroll-orientation="vertical">
        <view className="ScreenContent">
          <Text role="heading" tone="textPrimary">
            {exercise.name}
          </Text>

          <view className="TagRow">
            <Tag text={muscleGroupLabel(exercise.muscleGroup)} />
            <Tag text={equipmentLabel(exercise.equipment)} />
            <Tag text={exercise.mechanic === 'compound' ? 'Compuesto' : 'Aislamiento'} />
          </view>

          <Card>
            <Text role="detail" tone="textSecondary">
              Estadísticas totales
            </Text>
            <view className="StatRow">
              <view className="Stat">
                <Text role="detail" tone="textSecondary">
                  Sesiones
                </Text>
                <Text role="display" tone="textPrimary">
                  {stats?.sessions ?? 0}
                </Text>
              </view>
              <view className="Stat">
                <Text role="detail" tone="textSecondary">
                  Sets
                </Text>
                <Text role="display" tone="textPrimary">
                  {stats?.totalSets ?? 0}
                </Text>
              </view>
              <view className="Stat">
                <Text role="detail" tone="textSecondary">
                  Volumen
                </Text>
                <Text role="display" tone="textPrimary">
                  {formatNumber(stats?.totalVolume ?? 0)} {units}
                </Text>
              </view>
            </view>
          </Card>

          <Card>
            <Text role="title" tone="textPrimary">
              Progresión
            </Text>

            <view className="SegmentRow">
              {METRICS.map((option) => {
                const active = metric === option.value;

                return (
                  <view
                    className="SegmentItem"
                    key={remountKey('metric', option.value)}
                    style={{ backgroundColor: active ? colors.accentSoft : 'transparent' }}
                    bindtap={() => setMetric(option.value)}
                  >
                    <Text
                      role="support"
                      tone={active ? 'accent' : 'textSecondary'}

                    >
                      {option.label}
                    </Text>
                  </view>
                );
              })}
            </view>

            {visible.length < 2 ? (
              <Text role="support" tone="textSecondary">
                Necesitás al menos 2 sesiones con este ejercicio para ver la progresión.
              </Text>
            ) : (
              <view className="BarChart">
                {visible.map((row, index) => {
                  const value = values[index] ?? 0;
                  const height = maxValue > 0 ? Math.max(2, (value / maxValue) * MAX_BAR_HEIGHT) : 2;

                  return (
                    <view
                      className="BarColumn"
                      key={remountKey('bar', row.sessionId)}
                    >
                      <view className="BarFill" style={{ height: px(height), backgroundColor: colors.accent }} />
                    </view>
                  );
                })}
              </view>
            )}

            {visible.length >= 2 ? (
              <view className="RowBetween">
                <Text role="detail" tone="textSecondary">
                  {formatDateShort(new Date(visible[0].date))}
                </Text>
                <Text role="detail" tone="textSecondary">
                  {formatDateShort(new Date(visible[visible.length - 1].date))}
                </Text>
              </view>
            ) : null}

            <view className="SegmentRow">
              {RANGES.map((option) => {
                const active = range === option;

                return (
                  <view
                    className="SegmentItem"
                    key={remountKey('range', option)}
                    style={{
                      backgroundColor: active ? colors.accent : colors.surface,
                      borderColor: active ? colors.accent : colors.line,
                      borderWidth: BORDER_WIDTH,
                    }}
                    bindtap={() => setRange(option)}
                  >
                    <Text
                      role="support"
                      tone={active ? 'onAccent' : 'textPrimary'}

                    >
                      {option}
                    </Text>
                  </view>
                );
              })}
            </view>
          </Card>

          {latestPr ? (
            <Card>
              <Text role="detail" tone="textSecondary">
                Récord personal
              </Text>
              <Text role="display" tone="accent">
                {latestPr.value.toFixed(1)} {units}
              </Text>
              <Text role="support" tone="textSecondary">
                {formatWeight(latestPr.weight ?? 0, units)} × {latestPr.reps ?? '?'} reps ·{' '}
                {formatDateShort(new Date(latestPr.achievedAt))}
              </Text>
            </Card>
          ) : null}

          {prs.length > 0 ? (
            <Card>
              <Text role="title" tone="textPrimary">
                Historial de récords
              </Text>
              {prs.map((pr) => (
                <view className="RowBetween" key={remountKey('pr', pr.id)}>
                  <view>
                    <Text role="title" tone="textPrimary">
                      {pr.recordType === 'one_rm' ? '1RM estimado' : pr.recordType}
                    </Text>
                    <Text role="detail" tone="textSecondary">
                      {formatDateShort(new Date(pr.achievedAt))}
                    </Text>
                  </view>
                  <Text role="title" tone="accent">
                    {pr.value.toFixed(1)} {units}
                  </Text>
                </view>
              ))}
            </Card>
          ) : null}

          {exercise.instructions ? (
            <Card>
              <Text role="title" tone="textPrimary">
                Instrucciones
              </Text>
              <Text role="support" tone="textPrimary">
                {exercise.instructions}
              </Text>
            </Card>
          ) : null}
        </view>
      </scroll-view>
    </view>
  );
}

function metricValue(row: TimelineRow, metric: Metric): number {
  if (metric === 'oneRm') return row.bestOneRm;

  if (metric === 'maxWeight') return row.maxWeight;

  return row.totalVolume;
}

function Tag({ text }: { text: string }) {
  const { colors } = useTheme();

  return (
    <view className="Tag" style={{ backgroundColor: colors.accentSoft }}>
      <Text role="detail" tone="accent">
        {text}
      </Text>
    </view>
  );
}
