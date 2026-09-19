import { describe, expect, it } from 'vitest';

import { dayKey, formatNumber, shortMonth } from './format';

/**
 * Los formateos que reemplazan a `Intl`.
 *
 * Lynx no implementa la API de internacionalización, así que estos formatos a
 * mano son los que se ven en pantalla: si cambian, cambia lo que lee el usuario.
 */
describe('formatNumber', () => {
  it('agrupa los miles con punto y sin decimales por defecto', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(1234)).toBe('1.234');
    expect(formatNumber(1234567)).toBe('1.234.567');
  });

  it('redondea cuando no se piden decimales', () => {
    expect(formatNumber(999.6)).toBe('1.000');
  });

  it('usa la coma como separador decimal, como es-ES', () => {
    expect(formatNumber(1234.56, 2)).toBe('1.234,56');
    expect(formatNumber(0.5, 1)).toBe('0,5');
  });

  it('mantiene el signo negativo', () => {
    expect(formatNumber(-1234)).toBe('-1.234');
    expect(formatNumber(-1234.5, 1)).toBe('-1.234,5');
  });
});

describe('dayKey', () => {
  it('formatea en local como YYYY-MM-DD, con ceros a la izquierda', () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(dayKey(new Date(2026, 8, 18))).toBe('2026-09-18');
  });
});

describe('shortMonth', () => {
  it('devuelve el mes abreviado en español', () => {
    expect(shortMonth(0)).toBe('ene');
    expect(shortMonth(8)).toBe('sep');
    expect(shortMonth(11)).toBe('dic');
  });

  it('devuelve vacío si el índice está fuera de rango', () => {
    expect(shortMonth(12)).toBe('');
    expect(shortMonth(-1)).toBe('');
  });
});
