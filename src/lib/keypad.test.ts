import { describe, expect, it } from 'vitest';

import { estimateOneRm, oneRmPreview } from './metrics';
import {
  backspace,
  initialKeypadState,
  keypadDisplay,
  keypadValue,
  pressDecimal,
  pressDigit,
  quickPickState,
  stepKeypadValue,
  type KeypadField,
  type KeypadState,
} from './keypad';

/** Aplica una secuencia de teclas ('.' = punto decimal) sobre un estado inicial. */
function type(keys: string[], field: KeypadField = 'weight', from = 0): KeypadState {
  return keys.reduce<KeypadState>(
    (state, key) => (key === '.' ? pressDecimal(state, field) : pressDigit(state, key, field)),
    initialKeypadState(from, field)
  );
}

describe('keypad · valor efectivo', () => {
  it('confirmar 102.5 devuelve 102.5 y no la parte entera (bug K)', () => {
    const state = type(['1', '0', '2', '.', '5']);

    expect(keypadDisplay(state, 'weight')).toBe('102.5');
    expect(keypadValue(state)).toBe(102.5);
    expect(keypadValue(state)).not.toBe(102);
  });

  it('construye el decimal dígito a dígito', () => {
    const state = type(['9', '5', '.', '2', '5']);

    expect(keypadDisplay(state, 'weight')).toBe('95.25');
    expect(keypadValue(state)).toBe(95.25);
  });

  it('borrar el decimal lo quita dígito a dígito y vuelve a la parte entera', () => {
    const typed = type(['1', '0', '2', '.', '5']);

    const oneBack = backspace(typed);
    expect(keypadDisplay(oneBack, 'weight')).toBe('102.');
    expect(keypadValue(oneBack)).toBe(102);

    const twoBack = backspace(oneBack);
    expect(keypadDisplay(twoBack, 'weight')).toBe('102');
    expect(keypadValue(twoBack)).toBe(102);
  });

  it('borrar desde un decimal corto deja el entero en 0, no vacío', () => {
    const typed = type(['0', '.', '5']); // "0.5"

    const oneBack = backspace(typed); // "0."
    expect(keypadDisplay(oneBack, 'weight')).toBe('0.');
    expect(keypadDisplay(backspace(oneBack), 'weight')).toBe('0');
    expect(keypadValue(backspace(oneBack))).toBe(0);
  });

  it('un solo dígito se borra a 0', () => {
    expect(keypadDisplay(backspace(initialKeypadState(0, 'weight')), 'weight')).toBe('0');
  });

  it('no admite un segundo punto ni más de dos decimales', () => {
    const state = type(['1', '0', '2', '.', '5', '.', '7', '8']);

    expect(keypadDisplay(state, 'weight')).toBe('102.57');
  });

  it('en reps el punto no hace nada y los dígitos son enteros', () => {
    const state = type(['1', '2', '.', '5'], 'reps');

    expect(keypadDisplay(state, 'reps')).toBe('125');
    expect(keypadValue(state)).toBe(125);
  });

  it('colapsa ceros a la izquierda', () => {
    expect(keypadDisplay(type(['0', '0', '5']), 'weight')).toBe('5');
  });

  it('limita la parte entera a 999', () => {
    expect(keypadDisplay(type(['9', '9', '9', '9']), 'weight')).toBe('999');
    expect(keypadDisplay(type(['9', '9', '9', '9'], 'reps'), 'reps')).toBe('999');
  });
});

describe('keypad · pasos y presets', () => {
  it('el stepper suma sobre el valor efectivo, decimales incluidos', () => {
    const typed = type(['1', '0', '2', '.', '5']); // 102.5
    const stepped = stepKeypadValue(typed, 2.5);

    expect(keypadDisplay(stepped, 'weight')).toBe('105');
    expect(keypadValue(stepped)).toBe(105);
  });

  it('el stepper no baja de 0', () => {
    expect(keypadValue(stepKeypadValue(initialKeypadState(0, 'weight'), -5))).toBe(0);
  });

  it('el preset reemplaza el valor', () => {
    expect(keypadDisplay(quickPickState(60, 'weight'), 'weight')).toBe('60');
    expect(keypadDisplay(quickPickState(8, 'reps'), 'reps')).toBe('8');
  });
});

describe('keypad · 1RM en vivo con decimales', () => {
  it('el preview usa el peso decimal confirmado, no el truncado', () => {
    const weight = keypadValue(type(['1', '0', '2', '.', '5'])); // 102.5 kg
    const reps = keypadValue(initialKeypadState(5, 'reps'));

    const preview = oneRmPreview(weight, reps);

    expect(preview).toBeCloseTo(estimateOneRm(102.5, 5), 10);
    expect(preview).not.toBeCloseTo(estimateOneRm(102, 5), 10);
  });
});
