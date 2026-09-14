import { describe, expect, it } from 'vitest';

import { weekMonthLabels, weekMonday } from './weeks';

describe('weekMonday', () => {
  it('devuelve el lunes de la semana', () => {
    expect(weekMonday('2026-10').toISOString().slice(0, 10)).toBe('2026-03-09');
    expect(weekMonday('2025-52').toISOString().slice(0, 10)).toBe('2025-12-29');
  });

  it('la semana 00 cae en el lunes anterior al primer lunes del año', () => {
    expect(weekMonday('2026-00').toISOString().slice(0, 10)).toBe('2025-12-29');
  });
});

describe('weekMonthLabels', () => {
  it('muestra el mes de cada semana, no el número de semana', () => {
    expect(weekMonthLabels(['2026-08', '2026-09', '2026-10'])).toEqual(['feb', 'mar', 'mar']);
  });

  it('añade el año solo cuando la ventana cruza de año', () => {
    expect(weekMonthLabels(['2025-48', '2026-05'])).toEqual(['dic 25', 'feb 26']);
    expect(weekMonthLabels(['2026-08', '2026-10'])).toEqual(['feb', 'mar']);
  });

  it('respeta el orden y la longitud de la ventana (primera y última incluidas)', () => {
    const labels = weekMonthLabels(['2026-01', '2026-02', '2026-03']);

    expect(labels).toHaveLength(3);
    expect(labels[0]).toBe('ene');
    expect(labels[2]).toBe('ene');
  });
});
