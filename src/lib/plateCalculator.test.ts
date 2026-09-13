import { describe, expect, it } from 'vitest';

import { calculatePlates, plateShortfallMessage } from './plateCalculator';

/**
 * El aviso de la calculadora no puede decir "faltan -20 kg": con objetivo 0 o por
 * debajo de la barra no falta nada, simplemente no se pone peso.
 */
describe('plateShortfallMessage', () => {
  it('no avisa cuando no hay objetivo (peso 0)', () => {
    expect(plateShortfallMessage(calculatePlates(0))).toBeNull();
  });

  it('no avisa cuando el objetivo está por debajo de la barra', () => {
    expect(plateShortfallMessage(calculatePlates(15))).toBeNull();
  });

  it('no avisa cuando el objetivo es alcanzable', () => {
    expect(plateShortfallMessage(calculatePlates(100))).toBeNull();
  });

  it('avisa, en positivo, cuando falta peso para un objetivo inalcanzable', () => {
    const message = plateShortfallMessage(calculatePlates(20.5));

    expect(message).toContain('Faltan 0.50');
    expect(message).not.toContain('-');
  });
});
