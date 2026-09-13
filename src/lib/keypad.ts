/**
 * La edición del teclado numérico, en un solo lugar.
 *
 * El estado es un buffer de texto: es exactamente lo que se muestra y lo que
 * alimenta el valor efectivo que se confirma. Antes el componente guardaba la
 * parte entera en `value` y los decimales aparte en `decimals`, así que al
 * confirmar enviaba la parte entera y se guardaba un peso distinto del que se
 * veía (known-issue K). Con un único origen de verdad, lo mostrado y lo
 * calculado no pueden divergir.
 *
 * Funciones puras y sin RN, para poder testearlas en Vitest.
 */

export type KeypadField = 'weight' | 'reps';

export interface KeypadState {
  /** El texto editable tal cual se muestra, p. ej. "102.5" o "0". */
  buffer: string;
}

export const KEYPAD_MAX_INT = 999;
export const KEYPAD_MAX_DECIMALS = 2;

/** Redondeo a 2 decimales para evitar ruido de coma flotante en los steppers. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Número a texto sin ceros de cola: 102.50 → "102.5", 100.00 → "100". */
function formatValue(value: number): string {
  return String(round2(value));
}

export function initialKeypadState(initialValue: number, field: KeypadField): KeypadState {
  const safe = Math.max(0, initialValue);
  return { buffer: field === 'reps' ? String(Math.floor(safe)) : formatValue(safe) };
}

/** El valor que el teclado va a confirmar. Es el mismo número que se muestra. */
export function keypadValue({ buffer }: KeypadState): number {
  const value = Number.parseFloat(buffer);
  return Number.isFinite(value) ? value : 0;
}

/** El texto que se muestra. En reps siempre es un entero. */
export function keypadDisplay(state: KeypadState, field: KeypadField): string {
  return field === 'reps' ? String(Math.floor(keypadValue(state))) : state.buffer;
}

const DIGIT = /^[0-9]$/;

export function pressDigit(state: KeypadState, digit: string, field: KeypadField): KeypadState {
  if (!DIGIT.test(digit)) return state;

  const { buffer } = state;
  const dot = buffer.indexOf('.');

  // Con punto decimal: se escribe la fracción, hasta 2 dígitos.
  if (field === 'weight' && dot !== -1) {
    const decimals = buffer.length - dot - 1;
    if (decimals >= KEYPAD_MAX_DECIMALS) return state;
    return { buffer: buffer + digit };
  }

  const next = (Number.parseInt(buffer, 10) || 0) * 10 + Number(digit);
  if (next > KEYPAD_MAX_INT) return state;
  return { buffer: String(next) };
}

export function pressDecimal(state: KeypadState, field: KeypadField): KeypadState {
  if (field !== 'weight') return state;
  if (state.buffer.includes('.')) return state;
  return { buffer: state.buffer + '.' };
}

export function backspace(state: KeypadState): KeypadState {
  const { buffer } = state;
  if (buffer.length <= 1) return { buffer: '0' };
  return { buffer: buffer.slice(0, -1) };
}

export function stepKeypadValue(state: KeypadState, delta: number): KeypadState {
  return { buffer: formatValue(Math.max(0, keypadValue(state) + delta)) };
}

export function quickPickState(value: number, field: KeypadField): KeypadState {
  return initialKeypadState(value, field);
}
