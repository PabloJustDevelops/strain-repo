/**
 * La cuenta atrás del descanso, en un solo lugar.
 *
 * El descanso se guarda como el instante en que termina, no como "segundos
 * restantes": restar de a un segundo en cada tick acumulaba el error de cada
 * llamada extra (dos ticks dentro del mismo segundo descontaban dos segundos).
 * Con un instante de fin, el cálculo depende solo del reloj y es idempotente:
 * llamar `tickRest()` dos veces seguidas da el mismo resultado.
 *
 * Función pura y sin Lynx, para poder testearla en Vitest.
 */

/** Segundos que quedan de un descanso que termina en `endsAt`, medido en `now`. */
export function restRemainingSeconds(endsAt: number, now: number): number {
  // `ceil` para que un descanso de 90s muestre 90 en el instante inicial y no
  // llegue a 0 antes de tiempo.
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

/** Instante de fin de un descanso de `seconds` segundos que arranca en `now`. */
export function restEndsAt(seconds: number, now: number): number {
  return now + Math.max(0, seconds) * 1000;
}
