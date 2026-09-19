import { describe, expect, it } from 'vitest';

import { exerciseCountLabel } from './labels';

describe('exerciseCountLabel', () => {
  it('sin recorte es una cuenta, no una fracción', () => {
    expect(exerciseCountLabel(47, 47)).toBe('47 ejercicios');
    expect(exerciseCountLabel(1, 1)).toBe('1 ejercicio');
    expect(exerciseCountLabel(0, 0)).toBe('0 ejercicios');
  });

  it('con la búsqueda o el filtro activos, lo que se ve sobre el total', () => {
    expect(exerciseCountLabel(12, 47)).toBe('12 de 47');
    expect(exerciseCountLabel(1, 47)).toBe('1 de 47');
  });
});
