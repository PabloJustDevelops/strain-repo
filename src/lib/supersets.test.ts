import { describe, expect, it } from 'vitest';

import { nextSupersetLetter, supersetRestOwner, type SupersetCandidate } from './supersets';

/**
 * Tabla de casos de la regla de descanso en supersets. Corre sin sqlite ni store:
 * es la razón por la que la regla vive en `lib` y no inline en el store.
 */
describe('supersets', () => {
  /** Un ejercicio con sets identificados por posición: `A1`, `A2`, `B1`… */
  function exercise(group: string | null, label: string, completed: boolean[]): SupersetCandidate {
    return {
      supersetGroup: group,
      sets: completed.map((isCompleted, i) => ({ id: `${label}${i + 1}`, isCompleted })),
    };
  }

  describe('supersetRestOwner', () => {
    it('sin grupo, cada set arranca descanso', () => {
      const solo = exercise(null, 'A', [true, false]);

      expect(supersetRestOwner([solo], 'A1')).toBe(solo);
      expect(supersetRestOwner([solo], 'A2')).toBe(solo);
    });

    it('un grupo de uno se comporta como un ejercicio suelto', () => {
      const solo = exercise('A', 'A', [true]);

      expect(supersetRestOwner([solo], 'A1')).toBe(solo);
    });

    it('en A→B, el set del primero no cierra la ronda y el del último sí', () => {
      const a = exercise('A', 'A', [true, false, false]);
      const b = exercise('A', 'B', [true, false, false]);

      expect(supersetRestOwner([a, b], 'A1')).toBeNull();
      expect(supersetRestOwner([a, b], 'B1')).toBe(b);
    });

    it('con sets desparejos, el último set pendiente del grupo cierra la ronda', () => {
      // A(3) → B(2): después de B2, el A3 que queda suelto igual descansa.
      const a = exercise('A', 'A', [true, true, true]);
      const b = exercise('A', 'B', [true, true]);

      expect(supersetRestOwner([a, b], 'A3')).toBe(a);
    });

    it('con sets desparejos, un set del primero no cierra mientras el segundo tenga pendientes', () => {
      const a = exercise('A', 'A', [false, false, false]);
      const b = exercise('A', 'B', [false, false]);

      expect(supersetRestOwner([a, b], 'A1')).toBeNull();
    });

    it('en un tri-set, cierra el último del grupo', () => {
      const a = exercise('A', 'A', [true]);
      const b = exercise('A', 'B', [true]);
      const c = exercise('A', 'C', [false]);

      expect(supersetRestOwner([a, b, c], 'B1')).toBeNull();
      expect(supersetRestOwner([a, b, c], 'C1')).toBe(c);
    });

    it('los grupos no se pisan entre sí', () => {
      const a = exercise('A', 'A', [true]);
      const b = exercise('A', 'B', [true]);
      const c = exercise('B', 'C', [false]);
      const d = exercise('B', 'D', [false]);

      // Los pendientes del grupo B no bloquean al A, ni al revés.
      expect(supersetRestOwner([a, b, c, d], 'B1')).toBe(b);
      expect(supersetRestOwner([a, b, c, d], 'C1')).toBeNull();
      expect(supersetRestOwner([a, b, c, d], 'D1')).toBe(d);
    });

    it('un grupo no contiguo mira al siguiente miembro, no al vecino de la lista', () => {
      const a1 = exercise('A', 'A', [true]);
      const suelto = exercise(null, 'S', [false]);
      const a2 = exercise('A', 'B', [false]);

      expect(supersetRestOwner([a1, suelto, a2], 'A1')).toBeNull();
    });

    it('un set que no existe no arranca descanso', () => {
      const solo = exercise(null, 'A', [true]);

      expect(supersetRestOwner([solo], 'no-existe')).toBeNull();
    });
  });

  describe('nextSupersetLetter', () => {
    it('empieza en A y sigue por B', () => {
      expect(nextSupersetLetter([])).toBe('A');
      expect(nextSupersetLetter(['A'])).toBe('B');
    });

    it('reutiliza huecos', () => {
      expect(nextSupersetLetter(['A', 'C'])).toBe('B');
    });

    it('si no quedan letras libres cae en A, como el builder de rutinas', () => {
      expect(nextSupersetLetter(['A', 'B', 'C', 'D', 'E', 'F'])).toBe('A');
    });
  });
});
