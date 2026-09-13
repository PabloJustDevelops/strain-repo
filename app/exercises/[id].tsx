import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, useWindowDimensions , useColorScheme } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VictoryLine, VictoryChart, VictoryAxis, VictoryArea } from 'victory-native';
import * as Haptics from 'expo-haptics';

import { getRepos } from '@db';
import { usePreferences } from '@stores/preferencesStore';
import { darkTheme, lightTheme, spacing, radius, fontSize } from '@lib/theme';
import { type Exercise } from '@/types/domain';
import { muscleGroupLabel, equipmentLabel } from '@lib/labels';
import { Card } from '@components/Card';
import { Button } from '@components/Button';
import { Sidebar } from '@components/Sidebar';
import { formatDateShort, formatWeight } from '@lib/format';

/**
 * Detalle de un ejercicio con drill-down analítico completo.
 *
 * Secciones:
 * - Datos básicos (músculos, equipo, mecánica)
 * - Instrucciones
 * - Stats globales (sesiones, sets totales, volumen acumulado)
 * - Gráfico de progresión de 1RM estimado (victory-native)
 * - Selector de rango temporal (1M / 3M / 6M / 1A / Todo)
 * - Selector de métrica (1RM / Peso máx / Volumen)
 * - Lista de PRs históricos
 */

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

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 1024;

  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const units = usePreferences((s) => s.units);
  const haptics = usePreferences((s) => s.hapticsEnabled);

  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';

  const colors = isDark ? darkTheme : lightTheme;

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [stats, setStats] = useState<{ sessions: number; totalSets: number; totalVolume: number } | null>(null);
  const [prs, setPrs] = useState<any[]>([]);
  const [range, setRange] = useState<Range>('3M');
  const [metric, setMetric] = useState<Metric>('oneRm');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const [ex, tl, st, prHistory] = await Promise.all([
        getRepos().exercises.byId(id),
        getRepos().analytics.exerciseTimeline(id, RANGE_DAYS[range]),
        getRepos().analytics.exerciseStats(id),
        getRepos().analytics.exercisePrHistory(id),
      ]);

      if (cancelled) return;
      setExercise(ex ?? null);
      setTimeline(tl);
      setStats(st);
      setPrs(prHistory);
    })();

    return () => {
      cancelled = true;
    };
  }, [id, range]);

  const handleRangeChange = (r: Range) => {
    if (haptics) Haptics.selectionAsync();
    setRange(r);
  };

  const handleMetricChange = (m: Metric) => {
    if (haptics) Haptics.selectionAsync();
    setMetric(m);
  };

  if (!exercise) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.textMuted }}>Cargando…</Text>
      </SafeAreaView>
    );
  }

  // Prepara datos para Victory
  const chartData = timeline.map((row, idx) => ({
    x: idx,
    y: metric === 'oneRm' ? row.bestOneRm : metric === 'maxWeight' ? row.maxWeight : row.totalVolume,
    date: row.date,
  }));

  const chartWidth = isWide ? Math.min(700, width - 400) : width - 64;
  const chartHeight = 220;

  const latestPr = prs.find((p) => p.recordType === 'one_rm');

  const content = (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <Stack.Screen options={{ title: exercise.name }} />

      {/* Cabecera */}
      <View style={{ gap: spacing.xs }}>
        <Text style={{ color: colors.text, fontSize: fontSize.xxl, fontWeight: '800' }}>
          {exercise.name}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Tag text={muscleGroupLabel(exercise.muscleGroup)} />
          <Tag text={equipmentLabel(exercise.equipment)} />
          <Tag text={exercise.mechanic === 'compound' ? 'Compuesto' : 'Aislamiento'} />
        </View>
      </View>

      {/* Stats globales */}
      <Card>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
          Estadísticas totales
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm }}>
          <StatBlock label="Sesiones" value={String(stats?.sessions ?? 0)} />
          <StatBlock label="Sets" value={String(stats?.totalSets ?? 0)} />
          <StatBlock label="Volumen" value={formatWeight(stats?.totalVolume ?? 0, units)} />
        </View>
      </Card>

      {/* Gráfico de progresión */}
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm }}>
          <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '700' }}>Progresión</Text>
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            <MetricToggle current={metric} value="oneRm" label="1RM" onPress={handleMetricChange} />
            <MetricToggle current={metric} value="maxWeight" label="Peso" onPress={handleMetricChange} />
            <MetricToggle current={metric} value="volume" label="Vol." onPress={handleMetricChange} />
          </View>
        </View>

        {chartData.length < 2 ? (
          <View style={{ padding: spacing.xl, alignItems: 'center', gap: spacing.sm }}>
            <Ionicons name="trending-up-outline" size={48} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, textAlign: 'center', fontSize: fontSize.sm }}>
              Necesitas al menos 2 sesiones con este ejercicio para ver la progresión.
            </Text>
          </View>
        ) : (
          <VictoryChart
            width={chartWidth}
            height={chartHeight}
            padding={{ top: 16, bottom: 36, left: 50, right: 16 }}
            domainPadding={{ y: 8 }}
          >
            <VictoryAxis
              tickFormat={(t: number) => {
                const d = chartData[t]?.date;

                return d ? formatDateShort(new Date(d)) : '';
              }}
              tickCount={Math.min(6, chartData.length)}
              style={{
                axis: { stroke: colors.border },
                tickLabels: { fill: colors.textMuted, fontSize: 10 },
                grid: { stroke: 'transparent' },
              }}
            />
            <VictoryAxis
              dependentAxis
              tickFormat={(t: number) => `${Math.round(t)}`}
              style={{
                axis: { stroke: colors.border },
                tickLabels: { fill: colors.textMuted, fontSize: 10 },
                grid: { stroke: colors.border, strokeDasharray: '4,4' },
              }}
            />
            <VictoryArea
              data={chartData}
              style={{
                data: {
                  fill: colors.primary + '33',
                  stroke: colors.primary,
                  strokeWidth: 2,
                },
              }}
              interpolation="monotoneX"
            />
            <VictoryLine
              data={chartData}
              style={{
                data: { stroke: colors.primary, strokeWidth: 0 },
              }}
              interpolation="monotoneX"
            />
          </VictoryChart>
        )}

        {/* Selector de rango */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.md }}>
          {RANGES.map((r) => (
            <Pressable
              key={r}
              onPress={() => handleRangeChange(r)}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: radius.full,
                backgroundColor: range === r ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: range === r ? colors.primary : colors.border,
              }}
            >
              <Text style={{ color: range === r ? '#fff' : colors.text, fontSize: fontSize.sm, fontWeight: '600' }}>
                {r}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      {/* PR actual */}
      {latestPr && (
        <Card>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
            Récord personal
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginTop: spacing.sm }}>
            <Text style={{ color: colors.primary, fontSize: fontSize.display, fontWeight: '900' }}>
              {latestPr.value.toFixed(1)}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.lg, fontWeight: '600' }}>{units}</Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
              1RM estimado
            </Text>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, marginTop: spacing.xs }}>
            {formatWeight(latestPr.weight ?? 0, units)} × {latestPr.reps ?? '?'} reps · {formatDateShort(new Date(latestPr.achievedAt))}
          </Text>
        </Card>
      )}

      {/* Lista de PRs históricos */}
      {prs.length > 0 && (
        <Card>
          <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '700' }}>
            Historial de récords
          </Text>
          {prs.map((pr) => (
            <View key={pr.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border }}>
              <View>
                <Text style={{ color: colors.text, fontWeight: '600' }}>{pr.recordType === 'one_rm' ? '1RM estimado' : pr.recordType}</Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>{formatDateShort(new Date(pr.achievedAt))}</Text>
              </View>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>
                {pr.value.toFixed(1)} {units}
              </Text>
            </View>
          ))}
        </Card>
      )}

      {/* Instrucciones */}
      {exercise.instructions && (
        <Card>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: fontSize.lg }}>Instrucciones</Text>
          <Text style={{ color: colors.text, marginTop: spacing.xs, lineHeight: 22 }}>
            {exercise.instructions}
          </Text>
        </Card>
      )}

      <Button title="Empezar workout con este ejercicio" onPress={() => router.push('/workout/active')} />
    </ScrollView>
  );

  if (isWide) {
    return (
      <SafeAreaView style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.background }}>
        <Sidebar />
        {content}
      </SafeAreaView>
    );
  }

  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>{content}</SafeAreaView>;
}

function Tag({ text }: { text: string }) {
  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);

  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';

  const colors = isDark ? darkTheme : lightTheme;

  return (
    <View style={{ backgroundColor: colors.primaryMuted, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full }}>
      <Text style={{ color: colors.primary, fontSize: fontSize.xs, fontWeight: '700' }}>{text}</Text>
    </View>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);

  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';

  const colors = isDark ? darkTheme : lightTheme;

  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, textTransform: 'uppercase', fontWeight: '700' }}>
        {label}
      </Text>
      <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '800' }}>{value}</Text>
    </View>
  );
}

function MetricToggle({
  current,
  value,
  label,
  onPress,
}: {
  current: Metric;
  value: Metric;
  label: string;
  onPress: (m: Metric) => void;
}) {
  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);

  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';

  const colors = isDark ? darkTheme : lightTheme;
  const active = current === value;

  return (
    <Pressable
      onPress={() => onPress(value)}
      style={{
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radius.sm,
        backgroundColor: active ? colors.primaryMuted : 'transparent',
      }}
    >
      <Text style={{ color: active ? colors.primary : colors.textMuted, fontSize: fontSize.xs, fontWeight: '700' }}>
        {label}
      </Text>
    </Pressable>
  );
}
