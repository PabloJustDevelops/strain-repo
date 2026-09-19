import { useMemo } from '@lynx-js/react';

import { buildHeatmapGrid, type HeatmapDay } from '@lib/heatmap';
import { remountKey } from '@lib/reactKeys';
import { px, withAlpha } from '@lib/theme';
import { useTheme } from '@lib/useTheme';
import { Text } from '@components/Text';

export type { HeatmapDay };

/**
 * Heatmap de consistencia estilo "contributions" de GitHub.
 *
 * Cada columna es una semana (lunes → domingo) y cada celda un día, más oscura
 * cuanto más volumen. Se dibuja a mano con `<view>`: Lynx no trae librería de
 * gráficos y no se suman dependencias. La aritmética de fechas vive en
 * `@lib/heatmap` (pura y testeada); acá sólo se pinta.
 *
 * El rango de color usa `withAlpha` sobre el primario del tema, porque el CSS de
 * Lynx no acepta el hex de 8 dígitos (`#rrggbbaa`) que usaba la app anterior.
 */
interface HeatmapProps {
  data: readonly HeatmapDay[];
  weeks?: number;
  cellSize?: number;
  onDayPress?: (day: HeatmapDay) => void;
}

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export function Heatmap({ data, weeks = 26, cellSize = 14, onDayPress }: HeatmapProps) {
  const { colors } = useTheme();

  const grid = useMemo(() => buildHeatmapGrid(data, weeks, new Date()), [data, weeks]);

  function intensity(volume: number): string {
    if (volume <= 0 || grid.maxVolume <= 0) return colors.surface;

    const ratio = volume / grid.maxVolume;

    if (ratio < 0.25) return withAlpha(colors.accent, 0.25);

    if (ratio < 0.5) return withAlpha(colors.accent, 0.5);

    if (ratio < 0.75) return withAlpha(colors.accent, 0.75);

    return colors.accent;
  }

  return (
    <view>
      <view className="HeatmapMonths">
        {grid.monthMarkers.map((marker) => (
          <Text
            role="detail"
            tone="textSecondary"
            className="HeatmapMonth"
            key={remountKey('month', `${marker.col}-${marker.label}`)}
            style={{ left: px(marker.col * (cellSize + 3)) }}
          >
            {marker.label}
          </Text>
        ))}
      </view>

      <view className="HeatmapBody">
        <view className="HeatmapDayLabels">
          {DAY_LABELS.map((label) => (
            <Text
              role="detail"
              tone="textSecondary"
              key={remountKey('day', label)}
              style={{ height: px(cellSize + 3), lineHeight: px(cellSize + 3) }}
            >
              {label}
            </Text>
          ))}
        </view>

        <view className="HeatmapGrid">
          {grid.columns.map((column, weekIndex) => (
            <view className="HeatmapColumn" key={remountKey('week', weekIndex)}>
              {column.map((day, dayIndex) =>
                day ? (
                  <view
                    className="HeatmapCell"
                    key={remountKey('cell', day.date)}
                    style={{
                      width: px(cellSize),
                      height: px(cellSize),
                      backgroundColor: intensity(day.volume),
                    }}
                    bindtap={onDayPress ? () => onDayPress(day) : undefined}
                  />
                ) : (
                  <view
                    className="HeatmapCell HeatmapCellEmpty"
                    key={remountKey('future', `${weekIndex}-${dayIndex}`)}
                    style={{ width: px(cellSize), height: px(cellSize) }}
                  />
                )
              )}
            </view>
          ))}
        </view>
      </view>

      <view className="HeatmapLegend">
        <Text role="detail" tone="textSecondary">
          Menos
        </Text>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <view
            className="HeatmapLegendCell"
            key={remountKey('legend', ratio)}
            style={{
              backgroundColor: ratio === 0 ? colors.surface : withAlpha(colors.accent, ratio * 0.8),
            }}
          />
        ))}
        <Text role="detail" tone="textSecondary">
          Más
        </Text>
      </view>
    </view>
  );
}
