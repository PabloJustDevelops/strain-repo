/**
 * Semanas tal como las produce `strftime('%Y-%W')`: la clave `YYYY-WW` es estable
 * para agrupar, pero para pintarla hay que volver al lunes real de esa semana.
 */

const DAY_MS = 86_400_000;

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Lunes (UTC) de una clave `YYYY-WW`. Tiene en cuenta la semana 00 de `%W`. */
export function weekMonday(weekStart: string): Date {
  const [yearStr, weekStr] = weekStart.split('-');
  const year = Number(yearStr);
  const week = Number(weekStr);
  const jan1 = Date.UTC(year, 0, 1);
  const daysBeforeMonday = (new Date(jan1).getUTCDay() + 6) % 7;
  const firstMonday = jan1 + ((7 - daysBeforeMonday) % 7) * DAY_MS;
  const offsetWeeks = week === 0 ? -1 : week - 1;

  return new Date(firstMonday + offsetWeeks * 7 * DAY_MS);
}

/**
 * Etiquetas de mes para una ventana de semanas. Añade el año (2 dígitos) solo
 * cuando la ventana cruza de año, para no repetir el año en todas las etiquetas.
 */
export function weekMonthLabels(weekStarts: string[]): string[] {
  const mondays = weekStarts.map(weekMonday);
  const years = new Set(mondays.map((d) => d.getUTCFullYear()));
  const withYear = years.size > 1;

  return mondays.map((d) => {
    const month = MONTHS_ES[d.getUTCMonth()];

    return withYear ? `${month} ${String(d.getUTCFullYear()).slice(-2)}` : month;
  });
}
