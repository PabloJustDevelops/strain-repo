import { describe, expect, it } from 'vitest';

import { restEndsAt, restRemainingSeconds } from './rest';

/**
 * La cuenta atrás del descanso.
 *
 * Lo que importa acá es que sea idempotente (dos ticks en el mismo segundo dan
 * lo mismo) y que nunca baje de 0: era el defecto del cálculo anterior, que
 * descontaba el tiempo transcurrido de un valor ya descontado.
 */
describe('restRemainingSeconds', () => {
  it('devuelve el total en el instante inicial', () => {
    expect(restRemainingSeconds(90_000, 0)).toBe(90);
  });

  it('baja con el reloj y llega a 0 exacto sin negativos', () => {
    expect(restRemainingSeconds(90_000, 30_000)).toBe(60);
    expect(restRemainingSeconds(90_000, 89_999)).toBe(1);
    expect(restRemainingSeconds(90_000, 90_000)).toBe(0);
    expect(restRemainingSeconds(90_000, 120_000)).toBe(0);
  });

  it('es idempotente: dos llamadas en el mismo instante dan el mismo valor', () => {
    const first = restRemainingSeconds(90_000, 12_345);
    const second = restRemainingSeconds(90_000, 12_345);

    expect(second).toBe(first);
  });
});

describe('restEndsAt', () => {
  it('suma los segundos al instante actual', () => {
    expect(restEndsAt(90, 1_000)).toBe(91_000);
    expect(restEndsAt(0, 1_000)).toBe(1_000);
  });

  it('trata los segundos negativos como un descanso nulo', () => {
    expect(restEndsAt(-10, 1_000)).toBe(1_000);
  });
});
