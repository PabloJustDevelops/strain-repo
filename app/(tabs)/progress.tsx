import { useCallback, useState } from 'react';
import { View, Text, ScrollView, Dimensions, useWindowDimensions , useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';

import { getRepos } from '@db';
import { usePreferences } from '@stores/preferencesStore';
import { darkTheme, lightTheme, spacing, radius, fontSize } from '@lib/theme';
import { Card } from '@components/Card';
import { Sidebar } from '@components/Sidebar';
import { Heatmap, type HeatmapDay } from '@components/Heatmap';

/**
 * Pantalla de progreso:
 * - Gráfico de volumen semanal (últimas 12 semanas)
 * - Streak actual
 * - Lista de PRs por ejercicio
 */
export default function ProgressScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 1024;

  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const units = usePreferences((s) => s.units);

  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';

  const colors = isDark ? darkTheme : lightTheme;

  const [weeklyVolume, setWeeklyVolume] = useState<{ weekStart: string; volume: number }[]>([]);
  const [streak, setStreak] = useState(0);
  const [prs, setPrs] = useState<{ exerciseName: string; oneRm: number }[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapDay[]>([]);

  // Recarga al recuperar el foco y arma los PRs con el catálogo del mismo fetch,
  // en vez de depender de que `exercises` ya esté en el estado.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const [volume, current, heatmap, catalog, records] = await Promise.all([
          getRepos().analytics.volumePerWeek(12),
          getRepos().analytics.currentStreak(),
          getRepos().analytics.dailyVolume(365),
          getRepos().exercises.list(),
          getRepos().analytics.personalRecords(),
        ]);

        if (cancelled) return;
        setWeeklyVolume(volume);
        setStreak(current);
        setHeatmapData(heatmap);
        const names = new Map(catalog.map((e) => [e.id, e.name]));
        setPrs(
          records
            .filter((r) => r.recordType === 'one_rm')
            .map((r) => ({
              exerciseName: names.get(r.exerciseId) ?? 'Ejercicio',
              oneRm: r.value,
            }))
        );
      })();

      return () => {
        cancelled = true;
      };
    }, [])
  );

  const chartData = {
    labels: weeklyVolume.slice(-6).map((w) => w.weekStart.split('-')[1]),
    datasets: [{ data: weeklyVolume.slice(-6).map((w) => Math.round(w.volume)) }],
  };

  const content = (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <Text style={{ color: colors.text, fontSize: fontSize.xxl, fontWeight: '800' }}>Progreso</Text>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Ionicons name="flame" size={32} color={colors.warning} />
          <View>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>Racha actual</Text>
            <Text style={{ color: colors.text, fontSize: fontSize.xxl, fontWeight: '800' }}>
              {streak} {streak === 1 ? 'día' : 'días'}
            </Text>
          </View>
        </View>
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: fontSize.lg, marginBottom: spacing.sm }}>
          Consistencia (últimas 26 semanas)
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Heatmap data={heatmapData} weeks={26} cellSize={14} />
        </ScrollView>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, marginTop: spacing.sm }}>
          Más oscuro = más volumen ese día. Toca una celda para ver el detalle.
        </Text>
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: fontSize.lg }}>
          Volumen semanal
        </Text>
        {weeklyVolume.length === 0 ? (
          <Text style={{ color: colors.textMuted, marginTop: spacing.sm }}>
            Aún no hay datos suficientes.
          </Text>
        ) : (
          <LineChart
            data={chartData}
            width={Dimensions.get('window').width - 64}
            height={200}
            yAxisLabel=""
            yAxisSuffix={` ${units}`}
            chartConfig={{
              backgroundColor: colors.surface,
              backgroundGradientFrom: colors.surface,
              backgroundGradientTo: colors.surface,
              decimalPlaces: 0,
              color: () => colors.primary,
              labelColor: () => colors.textMuted,
              propsForDots: { r: '4', strokeWidth: '2', stroke: colors.primary },
            }}
            bezier
            style={{ borderRadius: radius.md, marginTop: spacing.md }}
          />
        )}
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: fontSize.lg }}>
          Records personales (1RM estimado)
        </Text>
        {prs.length === 0 ? (
          <Text style={{ color: colors.textMuted, marginTop: spacing.sm }}>
            Completa tu primer workout para empezar a registrar PRs.
          </Text>
        ) : (
          prs
            .sort((a, b) => b.oneRm - a.oneRm)
            .slice(0, 10)
            .map((pr) => (
              <View key={pr.exerciseName} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border }}>
                <Text style={{ color: colors.text }}>{pr.exerciseName}</Text>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>
                  {pr.oneRm.toFixed(1)} {units}
                </Text>
              </View>
            ))
        )}
      </Card>
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
