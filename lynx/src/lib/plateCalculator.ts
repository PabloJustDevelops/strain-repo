/**
 * Calculadora de discos para barra.
 *
 * Dado un peso objetivo, devuelve cuántos discos de cada peso poner en cada lado
 * de la barra. Usa una lista estándar de discos en kg (personalizable).
 */

const DEFAULT_BAR_WEIGHT_KG = 20;

const DEFAULT_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5];

export interface PlateCount {
  plateKg: number;
  perSide: number;
}

export interface PlateResult {
  barWeight: number;
  platesPerSide: PlateCount[];
  totalWeight: number;
  remainder: number;          // kg que faltan para llegar al objetivo
  achievable: boolean;
}

export function calculatePlates(
  targetWeight: number,
  barWeight = DEFAULT_BAR_WEIGHT_KG,
  availablePlates = DEFAULT_PLATES_KG
): PlateResult {
  if (targetWeight <= barWeight) {
    return {
      barWeight,
      platesPerSide: [],
      totalWeight: barWeight,
      remainder: targetWeight - barWeight,
      achievable: targetWeight === barWeight,
    };
  }

  const perSideTarget = (targetWeight - barWeight) / 2;
  const sorted = [...availablePlates].sort((a, b) => b - a);
  const used: PlateCount[] = [];
  let remaining = perSideTarget;

  for (const plate of sorted) {
    const count = Math.floor(remaining / plate);

    if (count > 0) {
      used.push({ plateKg: plate, perSide: count });
      remaining -= count * plate;
    }
  }

  const achieved = barWeight + 2 * (perSideTarget - remaining);

  return {
    barWeight,
    platesPerSide: used,
    totalWeight: achieved,
    remainder: targetWeight - achieved,
    achievable: remaining === 0,
  };
}

/**
 * Aviso de discos insuficientes, o `null` si no hay objetivo que cumplir.
 *
 * No avisa cuando el objetivo es 0 o está por debajo de la barra: ahí no "faltan"
 * kilos (el remanente saldría negativo), simplemente no se pone peso.
 */
export function plateShortfallMessage(result: PlateResult): string | null {
  if (result.remainder <= 0) return null;

  return `Faltan ${result.remainder.toFixed(2)} kg para el objetivo (usa discos más pequeños).`;
}
