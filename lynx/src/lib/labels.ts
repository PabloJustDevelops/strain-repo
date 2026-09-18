import { MUSCLE_GROUP_LABELS, EQUIPMENT_LABELS, type MuscleGroup, type Equipment } from '@/types/domain';

/**
 * Etiquetas para mostrar a partir de los valores crudos de una fila `Exercise`.
 *
 * Las columnas `muscle_group` y `equipment` son de texto; el seed y los inputs
 * solo escriben los enums del dominio, así que la proyección es segura. El cast
 * vive acá una sola vez, con su invariante, y las pantallas no lo repiten.
 */
export function muscleGroupLabel(value: string): string {
  // SAFETY: la columna muscle_group solo contiene valores de MuscleGroup.
  return MUSCLE_GROUP_LABELS[value as MuscleGroup];
}

export function equipmentLabel(value: string): string {
  // SAFETY: la columna equipment solo contiene valores de Equipment.
  return EQUIPMENT_LABELS[value as Equipment];
}

/** Grupo del filtro: un grupo real o el comodín "todos". */
export type MuscleFilter = MuscleGroup | 'all';

/** Los filtros de la biblioteca, en el orden en que se muestran los chips. */
export const MUSCLE_FILTERS: readonly MuscleFilter[] = [
  'all',
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'core',
  'other',
];

/**
 * Traduce un filtro a lo que necesita `MuscleChip`.
 *
 * El chip "Todos" no corresponde a ningún `MuscleGroup`, así que se apoya en uno
 * cualquiera (`chest`) que el componente ignora cuando recibe `label`; el grupo
 * real sólo importa para los filtros concretos.
 */
export function muscleFilterChip(filter: MuscleFilter): { group: MuscleGroup; label: string } {
  if (filter === 'all') return { group: 'chest', label: 'Todos' };

  return { group: filter, label: MUSCLE_GROUP_LABELS[filter] };
}
