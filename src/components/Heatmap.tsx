import { useMemo } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { usePreferences } from '@stores/preferencesStore';
import { darkTheme, lightTheme, spacing, radius, fontSize } from '@lib/theme';

/**
 * Datos de un día en el heatmap.
 * date: ISO yyyy-mm-dd, count: número de workouts ese día, volume: volumen total.
 */
export interface HeatmapDay {
  date: string;
  count: number;
  volume: number;
}

interface HeatmapProps {
  data: HeatmapDay[];
  weeks?: number;
  cellSize?: number;
  onDayPress?: (day: HeatmapDay) => void;
}

/**
 * Heatmap de consistencia estilo GitHub contributions.
 * - Cada columna = semana (lunes → domingo).
 * - Cada celda = día, intensidad del color según volumen.
 * - Toca un día para ver el detalle (callback opcional).
 */
export function Heatmap({ data, weeks = 26, cellSize = 14, onDayPress }: HeatmapProps) {
  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkTheme : lightTheme;

  const { grid, monthLabels, maxVolume } = useMemo(() => {
    const byDate = new Map(data.map((d) => [d.date, d]));
    const maxV = data.reduce((m, d) => Math.max(m, d.volume), 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = (today.getDay() + 6) % 7;
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - dayOfWeek);

    const startDate = new Date(lastSunday);
    startDate.setDate(lastSunday.getDate() - (weeks - 1) * 7);

    const gridData: (HeatmapDay | null)[][] = [];
    const monthMarkers: { col: number; label: string }[] = [];
    let lastMonth = -1;

    for (let w = 0; w < weeks; w++) {
      const column: (HeatmapDay | null)[] = [];
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(startDate);
        cellDate.setDate(startDate.getDate() + w * 7 + d);
        if (cellDate > today) {
          column.push(null);
          continue;
        }
        const iso = cellDate.toISOString().split('T')[0];
        const hit = byDate.get(iso);
        column.push(hit ?? { date: iso, count: 0, volume: 0 });
      }
      gridData.push(column);

      const firstDayOfCol = new Date(startDate);
      firstDayOfCol.setDate(startDate.getDate() + w * 7);
      if (firstDayOfCol.getMonth() !== lastMonth) {
        lastMonth = firstDayOfCol.getMonth();
        monthMarkers.push({
          col: w,
          label: firstDayOfCol.toLocaleDateString('es-ES', { month: 'short' }),
        });
      }
    }
    return { grid: gridData, monthLabels: monthMarkers, maxVolume: maxV };
  }, [data, weeks]);

  const intensity = (volume: number): string => {
    if (volume === 0) return colors.surface;
    const ratio = volume / maxVolume;
    if (ratio < 0.25) return colors.primary + '55';
    if (ratio < 0.5) return colors.primary + '99';
    if (ratio < 0.75) return colors.primary + 'cc';
    return colors.primary;
  };

  const gap = 3;
  const labelWidth = 28;

  return (
    <View>
      <View style={{ flexDirection: 'row', height: 18, marginLeft: labelWidth, marginBottom: 2 }}>
        {monthLabels.map((m) => (
          <Text
            key={`${m.col}-${m.label}`}
            style={{
              color: colors.textMuted,
              fontSize: fontSize.xs,
              position: 'absolute',
              left: m.col * (cellSize + gap),
            }}
          >
            {m.label}
          </Text>
        ))}
      </View>

      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: labelWidth, paddingTop: 0 }}>
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => (
            <Text
              key={i}
              style={{
                color: colors.textMuted,
                fontSize: fontSize.xs,
                height: cellSize + gap,
                lineHeight: cellSize + gap,
                opacity: i % 2 === 0 ? 1 : 0.4,
              }}
            >
              {d}
            </Text>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap }}>
          {grid.map((column, wi) => (
            <View key={wi} style={{ gap }}>
              {column.map((day, di) => (
                <Pressable
                  key={di}
                  onPress={() => day && onDayPress?.(day)}
                  disabled={!day || day.count === 0}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    borderRadius: 3,
                    backgroundColor: day ? intensity(day.volume) : 'transparent',
                  }}
                />
              ))}
            </View>
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm, justifyContent: 'flex-end' }}>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>Menos</Text>
        {[0, 0.25, 0.5, 0.75, 1].map((r) => (
          <View
            key={r}
            style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              backgroundColor: r === 0 ? colors.surface : colors.primary + '88',
            }}
          />
        ))}
        <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>Más</Text>
      </View>
    </View>
  );
}