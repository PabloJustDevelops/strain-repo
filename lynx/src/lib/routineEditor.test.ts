import { describe, expect, it } from 'vitest';

import type { Exercise } from '@/types/domain';

import { MUSCLE_FILTERS, muscleFilterChip } from './labels';
import {
  ROUTINE_NAME_MAX,
  moveBy,
  moveItem,
  orderIds,
  orderRowsByIds,
  prescriptionLabel,
  removeById,
  selectorEmptyState,
  toggleId,
  validateRoutineName,
  withoutExisting,
} from './routineEditor';

const row = (id: string) => ({ id });

function exercise(id: string, name = id): Exercise {
  return {
    id,
    name,
    muscleGroup: 'chest',
    secondaryMuscles: [],
    equipment: 'barbell',
    mechanic: 'compound',
    instructions: null,
    isCustom: false,
    notes: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}

describe('validateRoutineName', () => {
  it('rechaza vacío y sólo espacios con un mensaje claro', () => {
    expect(validateRoutineName('')).toBeTypeOf('string');
    expect(validateRoutineName('   ')).toBeTypeOf('string');
  });

  it('acepta un nombre normal y recorta los bordes para medir', () => {
    expect(validateRoutineName('Empuje A')).toBeNull();
    expect(validateRoutineName('  Empuje A  ')).toBeNull();
  });

  it('corta en el tope de longitud', () => {
    expect(validateRoutineName('x'.repeat(ROUTINE_NAME_MAX))).toBeNull();
    expect(validateRoutineName('x'.repeat(ROUTINE_NAME_MAX + 1))).toBeTypeOf('string');
  });
});

describe('moveItem', () => {
  it('mueve hacia adelante reubicando el resto', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('mueve hacia atrás', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('recorta el destino fuera de rango', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 99)).toEqual(['b', 'c', 'a']);
    expect(moveItem(['a', 'b', 'c'], 2, -5)).toEqual(['c', 'a', 'b']);
  });

  it('no muta la lista original ni cambia nada si el origen no existe', () => {
    const original = ['a', 'b', 'c'];
    const moved = moveItem(original, 0, 2);

    expect(original).toEqual(['a', 'b', 'c']);
    expect(moved).not.toBe(original);
    expect(moveItem(original, 5, 0)).toEqual(['a', 'b', 'c']);
    expect(moveItem(original, 1, 1)).toEqual(['a', 'b', 'c']);
  });
});

describe('moveBy', () => {
  it('sube y baja un puesto, con los bordes fijos', () => {
    expect(moveBy(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveBy(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b']);
    expect(moveBy(['a', 'b', 'c'], 0, -1)).toEqual(['a', 'b', 'c']);
    expect(moveBy(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'b', 'c']);
  });
});

describe('orderIds / orderRowsByIds', () => {
  it('devuelve los ids en el orden de la lista', () => {
    expect(orderIds([row('a'), row('b'), row('c')])).toEqual(['a', 'b', 'c']);
  });

  it('reordena las filas según los ids', () => {
    const rows = [row('a'), row('b'), row('c')];
    expect(orderRowsByIds(rows, ['c', 'a', 'b']).map((r) => r.id)).toEqual(['c', 'a', 'b']);
  });

  it('deja al final las filas que no vienen en los ids, sin perderlas', () => {
    const rows = [row('a'), row('b'), row('c')];
    expect(orderRowsByIds(rows, ['c']).map((r) => r.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('removeById', () => {
  it('quita sólo la fila pedida', () => {
    const rows = [row('a'), row('b'), row('c')];
    expect(removeById(rows, 'b').map((r) => r.id)).toEqual(['a', 'c']);
    expect(removeById(rows, 'zzz')).toHaveLength(3);
  });
});

describe('withoutExisting / toggleId (selección múltiple)', () => {
  it('no ofrece ejercicios que la rutina ya tiene', () => {
    const catalog = [exercise('a'), exercise('b'), exercise('c')];
    expect(withoutExisting(catalog, ['b']).map((e) => e.id)).toEqual(['a', 'c']);
    expect(withoutExisting(catalog, [])).toHaveLength(3);
  });

  it('alterna un id conservando el orden de marcado', () => {
    expect(toggleId([], 'a')).toEqual(['a']);
    expect(toggleId(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleId(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
    expect(toggleId(['a'], 'a')).toEqual([]);
  });
});

describe('selectorEmptyState (estado vacío del selector)', () => {
  it('biblioteca vacía: manda a crear ejercicios, no dice que ya está todo', () => {
    const empty = selectorEmptyState(0, 0, 0);

    expect(empty?.title).toBe('Tu biblioteca está vacía');
    expect(empty?.body).toContain('pestaña Ejercicios');
    expect(empty?.title).not.toContain('Ya tenés');
  });

  it('catálogo con la rutina completa: avisa que ya tiene todo', () => {
    const empty = selectorEmptyState(47, 0, 0);

    expect(empty?.title).toBe('Ya tenés todos los ejercicios');
  });

  it('catálogo no vacío pero filtro sin coincidencias: sin resultados', () => {
    const empty = selectorEmptyState(47, 10, 0);

    expect(empty?.title).toBe('Sin resultados');
  });

  it('con resultados disponibles no hay estado vacío', () => {
    expect(selectorEmptyState(47, 10, 3)).toBeNull();
  });
});

describe('prescriptionLabel', () => {
  it('arma el resumen de series, reps y descanso', () => {
    expect(prescriptionLabel(3, '8-12', 90)).toBe('3 × 8-12 · 90s descanso');
  });

  it('omite el descanso cuando no hay', () => {
    expect(prescriptionLabel(5, 'AMRAP', 0)).toBe('5 × AMRAP');
  });
});

describe('filtro muscular compartido', () => {
  it('el chip "Todos" no depende de un grupo real', () => {
    expect(muscleFilterChip('all')).toEqual({ group: 'chest', label: 'Todos' });
    expect(muscleFilterChip('back')).toEqual({ group: 'back', label: 'Espalda' });
  });

  it('"all" está primero y no se repite', () => {
    expect(MUSCLE_FILTERS[0]).toBe('all');
    expect(new Set(MUSCLE_FILTERS).size).toBe(MUSCLE_FILTERS.length);
  });
});
