import { useMemo } from '@lynx-js/react';

import { buildHeatmapGrid, type HeatmapDay } from '@lib/heatmap';
import { remountKey } from '@lib/reactKeys';
import { withAlpha } from '@lib/theme';
import { useTheme } from '@lib/useTheme';

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
 * Lynx no acepta el hex de 8 dígitos (`#rrggbbaa`) que usaba la app Expo.
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
          <text
            className="HeatmapMonth"
            key={remountKey('month', `${marker.col}-${marker.label}`)}
            style={{ color: colors.textSecondary, left: marker.col * (cellSize + 3) }}
          >
            {marker.label}
          </text>
        ))}
      </view>

      <view className="HeatmapBody">
        <view className="HeatmapDayLabels">
          {DAY_LABELS.map((label) => (
            <text
              className="HeatmapDayLabel"
              key={remountKey('day', label)}
              style={{ color: colors.textSecondary, height: cellSize + 3, lineHeight: cellSize + 3 }}
            >
              {label}
            </text>
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
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: intensity(day.volume),
                    }}
                    bindtap={onDayPress ? () => onDayPress(day) : undefined}
                  />
                ) : (
                  <view
                    className="HeatmapCell HeatmapCellEmpty"
                    key={remountKey('future', `${weekIndex}-${dayIndex}`)}
                    style={{ width: cellSize, height: cellSize }}
                  />
                )
              )}
            </view>
          ))}
        </view>
      </view>

      <view className="HeatmapLegend">
        <text className="HeatmapDayLabel" style={{ color: colors.textSecondary }}>
          Menos
        </text>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <view
            className="HeatmapLegendCell"
            key={remountKey('legend', ratio)}
            style={{
              backgroundColor: ratio === 0 ? colors.surface : withAlpha(colors.accent, ratio * 0.8),
            }}
          />
        ))}
        <text className="HeatmapDayLabel" style={{ color: colors.textSecondary }}>
          Más
        </text>
      </view>
    </view>
  );
}
