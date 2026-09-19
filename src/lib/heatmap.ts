import { dayKey, shortMonth, startOfDay } from './format';

/**
 * La grilla del heatmap de consistencia, separada del pintado.
 *
 * El componente dibuja con `<view>`/CSS (Lynx no trae librería de gráficos),
 * pero la aritmética de fechas —qué día cae en qué columna, qué columnas abren
 * mes— es pura y se testea sin renderizar. Las claves de día salen de `dayKey`,
 * la misma que usan los agregados diarios, así que la celda de hoy no puede
 * quedar corrida por zona horaria.
 */

/** Datos de un día: `date` en `YYYY-MM-DD`, workouts y volumen de ese día. */
export interface HeatmapDay {
  date: string;
  count: number;
  volume: number;
}

export interface HeatmapMonthMarker {
  col: number;
  label: string;
}

export interface HeatmapGrid {
  /** Una columna por semana (lunes → domingo). `null` = día futuro. */
  columns: (HeatmapDay | null)[][];
  monthMarkers: HeatmapMonthMarker[];
  /** El volumen más alto de la ventana; el 0 si no hay datos. */
  maxVolume: number;
}

const DAY_MS = 86_400_000;

/**
 * Construye la grilla de las últimas `weeks` semanas hasta `today` (incluida).
 *
 * `today` es parámetro para que el cálculo sea determinista en los tests.
 */
export function buildHeatmapGrid(
  data: readonly HeatmapDay[],
  weeks: number,
  today: Date
): HeatmapGrid {
  const byDate = new Map(data.map((d) => [d.date, d]));
  const maxVolume = data.reduce((max, d) => Math.max(max, d.volume), 0);

  const todayStart = startOfDay(today);
  // Lunes de esta semana: `getDay()` dominga en 0 y nosotros arrancamos el lunes.
  const daysSinceMonday = (todayStart.getDay() + 6) % 7;
  const lastMonday = new Date(todayStart.getTime() - daysSinceMonday * DAY_MS);
  const firstMonday = new Date(lastMonday.getTime() - (weeks - 1) * 7 * DAY_MS);

  const columns: (HeatmapDay | null)[][] = [];
  const monthMarkers: HeatmapMonthMarker[] = [];
  let lastMonth = -1;

  for (let week = 0; week < weeks; week++) {
    const column: (HeatmapDay | null)[] = [];

    for (let day = 0; day < 7; day++) {
      const cellDate = new Date(firstMonday.getTime() + (week * 7 + day) * DAY_MS);

      if (cellDate > todayStart) {
        column.push(null);

        continue;
      }

      const key = dayKey(cellDate);
      column.push(byDate.get(key) ?? { date: key, count: 0, volume: 0 });
    }

    columns.push(column);

    const firstDayOfWeek = new Date(firstMonday.getTime() + week * 7 * DAY_MS);

    if (firstDayOfWeek.getMonth() !== lastMonth) {
      lastMonth = firstDayOfWeek.getMonth();
      monthMarkers.push({ col: week, label: shortMonth(firstDayOfWeek.getMonth()) });
    }
  }

  return { columns, monthMarkers, maxVolume };
}
