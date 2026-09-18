import type { Exercise } from '@/types/domain';

/**
 * Lógica pura del editor de rutinas.
 *
 * Todo lo que el editor decide (validar el nombre, reordenar, filtrar el
 * catálogo y marcar la selección múltiple) vive acá, sin tocar la seam ni el
 * render: así se puede probar sin runner de UI y la pantalla sólo pinta.
 */

/** Tope del nombre de una rutina. Más largo no entra en la cabecera ni en la tab. */
export const ROUTINE_NAME_MAX = 60;

/** Tope de la nota de una rutina, el mismo que las notas de un set. */
export const ROUTINE_NOTE_MAX = 280;

/**
 * Mensaje de error del nombre, o `null` si es válido.
 *
 * Devuelve el texto en vez de un booleano para que la pantalla lo muestre tal
 * cual: la validación y el copy del error se mantienen en un solo sitio.
 */
export function validateRoutineName(raw: string): string | null {
  const name = raw.trim();

  if (name.length === 0) return 'Poné un nombre para la rutina.';

  if (name.length > ROUTINE_NAME_MAX) {
    return `El nombre no puede pasar de ${ROUTINE_NAME_MAX} caracteres.`;
  }

  return null;
}

/**
 * Mueve un elemento de `from` a `to` y devuelve una lista nueva.
 *
 * `to` se recorta al rango válido y un índice de origen fuera de rango deja la
 * lista igual: un drag que termina fuera de la lista no debe corromper el orden.
 */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (from < 0 || from >= items.length) return [...items];

  const target = Math.max(0, Math.min(items.length - 1, to));

  if (target === from) return [...items];

  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved);

  return next;
}

/** Mueve un elemento `delta` posiciones (para los botones subir/bajar). */
export function moveBy<T>(items: readonly T[], index: number, delta: number): T[] {
  return moveItem(items, index, index + delta);
}

/** Ids en el orden de la lista. Es lo que espera `routines.reorderExercises`. */
export function orderIds(rows: readonly { id: string }[]): string[] {
  return rows.map((row) => row.id);
}

/**
 * Reordena `rows` según `ids`.
 *
 * Las filas que no aparecen en `ids` (una lista desincronizada) van al final en
 * su orden original, en vez de desaparecer de la pantalla.
 */
export function orderRowsByIds<T extends { id: string }>(
  rows: readonly T[],
  ids: readonly string[],
): T[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const ordered = ids
    .map((id) => byId.get(id))
    .filter((row): row is T => row !== undefined);
  const listed = new Set(ids);

  for (const row of rows) {
    if (!listed.has(row.id)) ordered.push(row);
  }

  return ordered;
}

/** Quita una fila por id sin tocar el resto del orden. */
export function removeById<T extends { id: string }>(rows: readonly T[], id: string): T[] {
  return rows.filter((row) => row.id !== id);
}

/**
 * Catálogo menos los ejercicios que la rutina ya tiene.
 *
 * Evita ofrecer un ejercicio repetido: la rutina guarda una fila por ejercicio y
 * agregarlo dos veces crearía una duplicada sin sentido.
 */
export function withoutExisting(
  catalog: readonly Exercise[],
  existingIds: readonly string[],
): Exercise[] {
  const taken = new Set(existingIds);

  return catalog.filter((exercise) => !taken.has(exercise.id));
}

/** Alterna un id dentro de la selección múltiple, conservando el orden de marcado. */
export function toggleId(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((candidate) => candidate !== id) : [...ids, id];
}

/** Estado vacío del selector, con su copy. `null` = hay algo para mostrar. */
export interface SelectorEmptyState {
  title: string;
  body: string;
}

/**
 * Estado vacío del selector de ejercicios, decidido por el TAMAÑO DEL CATÁLOGO.
 *
 * Mirar sólo la lista filtrada confundía dos situaciones: una biblioteca vacía
 * (no hay nada que agregar) y una rutina que ya incluye todo el catálogo. Por eso
 * el catálogo vacío gana sobre "ya tenés todos": sin ejercicios no hay rutina
 * posible, y el mensaje correcto es que la biblioteca está vacía.
 */
export function selectorEmptyState(
  catalogCount: number,
  availableCount: number,
  filteredCount: number,
): SelectorEmptyState | null {
  if (catalogCount === 0) {
    return {
      title: 'Tu biblioteca está vacía',
      body: 'Creá tu primer ejercicio en la pestaña Ejercicios para poder armar rutinas.',
    };
  }

  if (availableCount === 0) {
    return {
      title: 'Ya tenés todos los ejercicios',
      body: 'La rutina ya incluye todo el catálogo. Quitá alguno para poder volver a agregarlo.',
    };
  }

  if (filteredCount === 0) {
    return {
      title: 'Sin resultados',
      body: 'Ningún ejercicio coincide con la búsqueda y el filtro actuales.',
    };
  }

  return null;
}

/** Resumen de la prescripción de un ejercicio de la rutina ("3 × 8-12 · 90s"). */
export function prescriptionLabel(
  targetSets: number,
  targetReps: string,
  restSeconds: number,
): string {
  const rest = restSeconds > 0 ? ` · ${restSeconds}s descanso` : '';

  return `${targetSets} × ${targetReps}${rest}`;
}
