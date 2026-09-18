import { useEffect, useState } from '@lynx-js/react';

import { Card } from '@components/Card';
import { EmptyState } from '@components/EmptyState';
import { ErrorNote, Loading } from '@components/Loading';
import { formatDateShort, formatNumber, formatWeight } from '@lib/format';
import { equipmentLabel, muscleGroupLabel } from '@lib/labels';
import { remountKey } from '@lib/reactKeys';
import { useTheme } from '@lib/useTheme';
import { getRepos, type AnalyticsRepo } from '@db';
import type { Exercise } from '@/types/domain';
import { usePreferences } from '@stores/preferencesStore';
import type { RouteProps } from '@/app/routes';

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
      <view className="Screen" style={{ backgroundColor: colors.background }}>
        <Loading />
      </view>
    );
  }

  if (error) {
    return (
      <view className="Screen" style={{ backgroundColor: colors.background }}>
        <ErrorNote message={error} />
      </view>
    );
  }

  if (!exercise) {
    return (
      <view className="Screen" style={{ backgroundColor: colors.background }}>
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
    <view className="Screen" style={{ backgroundColor: colors.background }}>
      <scroll-view className="ScreenScroll" scroll-orientation="vertical">
        <view className="ScreenContent">
          <text className="ScreenTitle" style={{ color: colors.text }}>
            {exercise.name}
          </text>

          <view className="TagRow">
            <Tag text={muscleGroupLabel(exercise.muscleGroup)} />
            <Tag text={equipmentLabel(exercise.equipment)} />
            <Tag text={exercise.mechanic === 'compound' ? 'Compuesto' : 'Aislamiento'} />
          </view>

          <Card>
            <text className="CardLabel" style={{ color: colors.textMuted }}>
              Estadísticas totales
            </text>
            <view className="StatRow">
              <view className="Stat">
                <text className="StatLabel" style={{ color: colors.textMuted }}>
                  Sesiones
                </text>
                <text className="StatValue" style={{ color: colors.text }}>
                  {stats?.sessions ?? 0}
                </text>
              </view>
              <view className="Stat">
                <text className="StatLabel" style={{ color: colors.textMuted }}>
                  Sets
                </text>
                <text className="StatValue" style={{ color: colors.text }}>
                  {stats?.totalSets ?? 0}
                </text>
              </view>
              <view className="Stat">
                <text className="StatLabel" style={{ color: colors.textMuted }}>
                  Volumen
                </text>
                <text className="StatValue" style={{ color: colors.text }}>
                  {formatNumber(stats?.totalVolume ?? 0)} {units}
                </text>
              </view>
            </view>
          </Card>

          <Card>
            <text className="CardTitle" style={{ color: colors.text }}>
              Progresión
            </text>

            <view className="SegmentRow">
              {METRICS.map((option) => {
                const active = metric === option.value;

                return (
                  <view
                    className="SegmentItem"
                    key={remountKey('metric', option.value)}
                    style={{ backgroundColor: active ? colors.primaryMuted : 'transparent' }}
                    bindtap={() => setMetric(option.value)}
                  >
                    <text
                      className="SegmentLabel"
                      style={{ color: active ? colors.primary : colors.textMuted }}
                    >
                      {option.label}
                    </text>
                  </view>
                );
              })}
            </view>

            {visible.length < 2 ? (
              <text className="CardBody" style={{ color: colors.textMuted }}>
                Necesitás al menos 2 sesiones con este ejercicio para ver la progresión.
              </text>
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
                      <view className="BarFill" style={{ height, backgroundColor: colors.primary }} />
                    </view>
                  );
                })}
              </view>
            )}

            {visible.length >= 2 ? (
              <view className="RowBetween">
                <text className="Meta" style={{ color: colors.textMuted }}>
                  {formatDateShort(new Date(visible[0].date))}
                </text>
                <text className="Meta" style={{ color: colors.textMuted }}>
                  {formatDateShort(new Date(visible[visible.length - 1].date))}
                </text>
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
                      backgroundColor: active ? colors.primary : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                      borderWidth: 1,
                    }}
                    bindtap={() => setRange(option)}
                  >
                    <text
                      className="SegmentLabel"
                      style={{ color: active ? '#ffffff' : colors.text }}
                    >
                      {option}
                    </text>
                  </view>
                );
              })}
            </view>
          </Card>

          {latestPr ? (
            <Card>
              <text className="CardLabel" style={{ color: colors.textMuted }}>
                Récord personal
              </text>
              <text className="StatValue" style={{ color: colors.primary }}>
                {latestPr.value.toFixed(1)} {units}
              </text>
              <text className="CardBody" style={{ color: colors.textMuted }}>
                {formatWeight(latestPr.weight ?? 0, units)} × {latestPr.reps ?? '?'} reps ·{' '}
                {formatDateShort(new Date(latestPr.achievedAt))}
              </text>
            </Card>
          ) : null}

          {prs.length > 0 ? (
            <Card>
              <text className="CardTitle" style={{ color: colors.text }}>
                Historial de récords
              </text>
              {prs.map((pr) => (
                <view className="RowBetween" key={remountKey('pr', pr.id)}>
                  <view>
                    <text className="ListTitle" style={{ color: colors.text }}>
                      {pr.recordType === 'one_rm' ? '1RM estimado' : pr.recordType}
                    </text>
                    <text className="Meta" style={{ color: colors.textMuted }}>
                      {formatDateShort(new Date(pr.achievedAt))}
                    </text>
                  </view>
                  <text className="ListTitle" style={{ color: colors.primary }}>
                    {pr.value.toFixed(1)} {units}
                  </text>
                </view>
              ))}
            </Card>
          ) : null}

          {exercise.instructions ? (
            <Card>
              <text className="CardTitle" style={{ color: colors.text }}>
                Instrucciones
              </text>
              <text className="CardBody" style={{ color: colors.text }}>
                {exercise.instructions}
              </text>
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
    <view className="Tag" style={{ backgroundColor: colors.primaryMuted }}>
      <text className="TagText" style={{ color: colors.primary }}>
        {text}
      </text>
    </view>
  );
}
