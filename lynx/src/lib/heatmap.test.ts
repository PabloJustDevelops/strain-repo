import { describe, expect, it } from 'vitest';

import { buildHeatmapGrid, type HeatmapDay } from './heatmap';

/**
 * La grilla del heatmap.
 *
 * `today` entra como parámetro justamente para esto: la ventana se calcula
 * siempre sobre el lunes de esa semana, así que el test no depende de cuándo
 * corra. El 18 de septiembre de 2026 es viernes (el día del run).
 */
const TODAY = new Date(2026, 8, 18);

function day(date: string, count: number, volume: number): HeatmapDay {
  return { date, count, volume };
}

describe('buildHeatmapGrid', () => {
  it('arma una columna por semana, con siete días cada una', () => {
    const grid = buildHeatmapGrid([], 3, TODAY);

    expect(grid.columns).toHaveLength(3);

    for (const column of grid.columns) {
      expect(column).toHaveLength(7);
    }
  });

  it('la última columna termina hoy y los días futuros quedan vacíos', () => {
    const grid = buildHeatmapGrid([], 3, TODAY);
    const last = grid.columns[2];

    // Lunes 14 → viernes 18: los cinco primeros días; sábado y domingo, null.
    expect(last[0]?.date).toBe('2026-09-14');
    expect(last[4]?.date).toBe('2026-09-18');
    expect(last[5]).toBeNull();
    expect(last[6]).toBeNull();
  });

  it('arranca en el lunes de hace `weeks` semanas', () => {
    const grid = buildHeatmapGrid([], 3, TODAY);

    expect(grid.columns[0][0]?.date).toBe('2026-08-31');
  });

  it('marca los días con datos y deja los demás en cero', () => {
    const grid = buildHeatmapGrid([day('2026-09-16', 1, 500)], 3, TODAY);

    // Miércoles 16 → índice 2 de la última columna.
    expect(grid.columns[2][2]).toEqual({ date: '2026-09-16', count: 1, volume: 500 });
    expect(grid.columns[2][3]).toEqual({ date: '2026-09-17', count: 0, volume: 0 });
    expect(grid.maxVolume).toBe(500);
  });

  it('no depende del orden de los datos', () => {
    const rows = [day('2026-09-16', 1, 500), day('2026-09-14', 1, 900)];

    expect(buildHeatmapGrid(rows, 3, TODAY).columns).toEqual(
      buildHeatmapGrid([...rows].reverse(), 3, TODAY).columns
    );
  });

  it('etiqueta la primera columna de cada mes', () => {
    const grid = buildHeatmapGrid([], 3, TODAY);

    expect(grid.monthMarkers).toEqual([
      { col: 0, label: 'ago' },
      { col: 1, label: 'sep' },
    ]);
  });

  it('sin datos, el volumen máximo es 0', () => {
    expect(buildHeatmapGrid([], 3, TODAY).maxVolume).toBe(0);
  });
});
